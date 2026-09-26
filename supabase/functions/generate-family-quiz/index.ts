import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { shuffle, pickFromPool } from '../_shared/game-utils.ts';
import { rejectIfNotFamilyMember } from '../_shared/family-auth.ts';
import { dailyLimitResponse } from '../_shared/daily-limit.ts';

const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY')!;
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const SESSION_SIZE = 10;
const MIN_VALID_POOL = 8;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const norm = (v: unknown) => String(v ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

async function hashString(str: string): Promise<string> {
  const data = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Scale the pool to how much material the family actually gave us —
// a thin charter can't support 30 distinct, non-repetitive questions.
function poolSizeFor(charter: any, memberCount: number): number {
  const richness =
    (charter?.values?.length ?? 0) * 3 +
    (charter?.mission ? 3 : 0) +
    (charter?.vision ? 3 : 0) +
    (charter?.constitution ? 6 : 0) +
    memberCount * 2;
  return Math.max(12, Math.min(30, richness));
}

async function generatePool(familyId: string, context: string, poolSize: number): Promise<string[]> {
  const requested = poolSize + 6; // headroom: some questions will fail validation

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${DEEPSEEK_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'deepseek-chat',
      max_tokens: 6000,
      temperature: 0.5,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You write multiple-choice quiz questions personalized to one specific family, based ONLY on the family data provided. ' +
            'Never infer or invent personal preferences, traits, ages, relationships or events that are not explicitly stated. ' +
            'Respond ONLY with valid JSON, no markdown.',
        },
        {
          role: 'user',
          content: `Generate ${requested} multiple-choice questions about THIS family using only the data below.

Coverage: roughly 40% recall of the mission/vision/constitution, 30% the family's values, 30% family members and their stated roles. Skip any category the data doesn't cover.

Rules:
- Exactly 4 options, exactly one correct.
- Wrong options must be plausible but FALSE according to the data. A wrong option must never also be a correct answer (e.g. don't use one of the family's real values as a distractor in a "which is NOT a value" style trap, and don't use real members as distractors when asking who holds a role).
- No two questions may test the same fact.
- "evidence" must be a short phrase (under 15 words) copied EXACTLY from the data below that proves the correct answer.

DATA:
${context}

Return ONLY valid JSON:
{ "questions": [ { "question": "string", "options": ["a","b","c","d"], "correct_option_index": 0, "explanation": "one sentence referencing the family's own data", "evidence": "exact phrase from DATA" } ] }`,
        },
      ],
    }),
  });

  if (!res.ok) throw new Error(`DeepSeek failed: ${await res.text()}`);
  const data = await res.json();
  const parsed = JSON.parse(data.choices[0].message.content.replace(/```json|```/g, '').trim());

  // Validate everything — bad options length / index would break server-side scoring
  const haystack = norm(context);
  const seenQuestions = new Set<string>();
  const valid: any[] = [];
  for (const q of parsed.questions ?? []) {
    if (typeof q?.question !== 'string' || !Array.isArray(q.options) || q.options.length !== 4) continue;
    if (!q.options.every((o: unknown) => typeof o === 'string' && o.trim())) continue;
    if (new Set(q.options.map(norm)).size !== 4) continue; // duplicate options
    if (!Number.isInteger(q.correct_option_index) || q.correct_option_index < 0 || q.correct_option_index > 3) continue;
    const evidence = norm(q.evidence);
    if (evidence.length < 3 || !haystack.includes(evidence)) continue; // not grounded in the data
    const key = norm(q.question);
    if (seenQuestions.has(key)) continue;
    seenQuestions.add(key);
    valid.push(q);
  }
  console.log(`generate-family-quiz: ${valid.length}/${parsed.questions?.length ?? 0} questions passed validation`);
  if (valid.length < MIN_VALID_POOL) throw new Error('Too few valid questions generated');

  const rows = valid.slice(0, poolSize).map((q) => {
    // Shuffle options server-side so the correct answer position is uniform
    const correct = q.options[q.correct_option_index];
    const options = shuffle<string>(q.options);
    return {
      game_type: 'quiz',
      category: 'family_specific',
      difficulty: 'medium',
      question: q.question.trim(),
      options,
      correct_option_index: options.indexOf(correct),
      explanation: q.explanation ?? null,
      source: 'ai_generated',
      family_id: familyId,
    };
  });

  const { data: inserted, error } = await supabase.from('game_question').insert(rows).select('id');
  if (error) throw error;
  return inserted.map((r: any) => r.id);
}

serve(async (req) => {
  try {
    const body = await req.json();
    const family_id: string | undefined = body.family_id;
    const prewarm: boolean = !!body.prewarm; // build/refresh the pool without starting a session
    const count = Math.min(Math.max(Number(body.count) || SESSION_SIZE, 1), 20);
    if (!family_id) return json({ error: 'Missing family_id' }, 400);

    const denied = await rejectIfNotFamilyMember(req, family_id);
    if (denied) return denied;

    const limited = await dailyLimitResponse(supabase, family_id);
    if (limited) return limited;

    const [{ data: family }, { data: charter }, { data: members }] = await Promise.all([
      supabase.from('family').select('name').eq('id', family_id).single(),
      supabase.from('charter').select('mission, vision, values, constitution').eq('family_id', family_id).single(),
      supabase.from('member').select('name, role').eq('family_id', family_id),
    ]);

    const values: string[] = charter?.values ?? [];
    const memberList = (members ?? []).map((m: any) => `${m.name} (${norm(m.role)})`).sort();

    // Fingerprint of EVERYTHING the questions are based on — and nothing else.
    // Normalized so whitespace/casing edits and value re-ordering don't trigger a paid regeneration.
    // Bump `v` whenever the prompt/validation changes to force every family's pool to rebuild.
    const sourceHash = await hashString(
      JSON.stringify({
        v: 2,
        name: norm(family?.name),
        mission: norm(charter?.mission),
        vision: norm(charter?.vision),
        values: values.map(norm).sort(),
        constitution: norm(charter?.constitution),
        members: memberList.map(norm),
      }),
    );

    const { data: cached } = await supabase
      .from('family_quiz_cache')
      .select('source_hash, question_ids')
      .eq('family_id', family_id)
      .maybeSingle();

    let poolIds: string[];
    let regenerated = false;

    if (cached && cached.source_hash === sourceHash && cached.question_ids?.length) {
      poolIds = cached.question_ids; // zero AI cost
    } else {
      if (!charter?.mission && !values.length) {
        return json({ error: 'no_family_data', message: 'Family needs a charter set up first' }, 422);
      }

      // Only include lines the family actually filled in — never feed the model "not set" placeholders
      const context = [
        family?.name && `Family name: ${family.name}`,
        charter?.mission && `Mission: ${charter.mission}`,
        charter?.vision && `Vision: ${charter.vision}`,
        values.length && `Values: ${values.join(', ')}`,
        charter?.constitution && `Constitution: ${charter.constitution}`,
        memberList.length && `Family members: ${memberList.join(', ')}`,
      ].filter(Boolean).join('\n');

      // Old pool rows are intentionally NOT deleted: past sessions, game_answer history and
      // family_question_seen may reference them, and in-progress games must keep scoring.
      // Simultaneous first-opens can both generate; the last cache write wins and the loser's
      // rows are harmless orphans (family-scoped, unreadable by other families).
      poolIds = await generatePool(family_id, context, poolSizeFor(charter, memberList.length));

      const { error: cacheErr } = await supabase.from('family_quiz_cache').upsert(
        { family_id, source_hash: sourceHash, question_ids: poolIds, generated_at: new Date().toISOString() },
        { onConflict: 'family_id' },
      );
      if (cacheErr) throw cacheErr;
      regenerated = true;
    }

    if (prewarm) return json({ ready: true, cached: !regenerated });

    const questionIds = await pickFromPool(supabase, family_id, poolIds, count);
    if (!questionIds.length) return json({ error: 'No questions available' }, 500);

    return json({ question_ids: questionIds, cached: !regenerated });
  } catch (err) {
    console.error('generate-family-quiz error:', err);
    return json({ error: (err as Error).message }, 500);
  }
});