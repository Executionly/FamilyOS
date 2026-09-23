import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY')!;
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

async function hashString(str: string): Promise<string> {
  const data = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  try {
    const { family_id } = await req.json();
    if (!family_id) return new Response(JSON.stringify({ error: 'Missing family_id' }), { status: 400 });

    const [{ data: family }, { data: charter }, { data: members }, { data: commitments }] = await Promise.all([
      supabase.from('family').select('name').eq('id', family_id).single(),
      supabase.from('charter').select('mission, vision, values, constitution').eq('family_id', family_id).single(),
      supabase.from('member').select('name, role').eq('family_id', family_id),
      supabase.from('commitment').select('title, status').eq('family_id', family_id).limit(10),
    ]);

    // Build a stable fingerprint of everything the questions would be based on
    const sourceContent = JSON.stringify({
      mission: charter?.mission, vision: charter?.vision,
      values: charter?.values, constitution: charter?.constitution,
      members: (members ?? []).map((m) => m.name).sort(),
    });
    const sourceHash = await hashString(sourceContent);

    // Check cache — only regenerate if the family's charter/roster actually changed
    const { data: cached } = await supabase
      .from('family_quiz_cache')
      .select('*')
      .eq('family_id', family_id)
      .maybeSingle();

    if (cached && cached.source_hash === sourceHash) {
      return new Response(JSON.stringify({ question_ids: cached.question_ids, cached: true }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!charter?.mission && !charter?.values?.length) {
      return new Response(JSON.stringify({ error: 'no_family_data', message: 'Family needs a charter set up first' }), { status: 422 });
    }

    const context = `
Family name: ${family?.name ?? 'this family'}
Mission: ${charter?.mission ?? 'not set'}
Vision: ${charter?.vision ?? 'not set'}
Values: ${(charter?.values ?? []).join(', ') || 'not set'}
Constitution: ${charter?.constitution ?? 'not set'}
Family members: ${(members ?? []).map((m) => m.name).join(', ')}
Recent commitments: ${(commitments ?? []).map((c) => c.title).join(', ') || 'none'}
`.trim();

    const deepseekRes = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${DEEPSEEK_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek-chat',
        max_tokens: 2000,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You write multiple-choice quiz questions personalized to a specific family, based ONLY on the family data given. Never invent a family member's personal preference — only use what's explicitly stated. Respond ONLY with valid JSON, no markdown.`,
          },
          {
            role: 'user',
            content: `Generate 12 multiple-choice questions about THIS family, grounded strictly in the data below. Mix question types: recalling values/mission/vision, family members, and shared commitments. Each question needs 4 options, one correct, grounded in the actual data (don't guess or infer anything not stated).

${context}

Return ONLY valid JSON:
{ "questions": [ { "question": "string", "options": ["a","b","c","d"], "correct_option_index": 0, "explanation": "one sentence, referencing the family's own data" } ] }`,
          },
        ],
      }),
    });

    if (!deepseekRes.ok) throw new Error(`DeepSeek failed: ${await deepseekRes.text()}`);
    const deepseekData = await deepseekRes.json();
    const parsed = JSON.parse(deepseekData.choices[0].message.content.replace(/```json|```/g, '').trim());

    if (!parsed.questions?.length) {
      return new Response(JSON.stringify({ error: 'Failed to generate questions' }), { status: 500 });
    }

    const rows = parsed.questions.map((q: any) => ({
      game_type: 'quiz', category: 'family_specific', difficulty: 'medium',
      question: q.question, options: q.options,
      correct_option_index: q.correct_option_index, explanation: q.explanation ?? null,
      source: 'ai_generated', family_id,
    }));

    // Replace any previous family-specific set for this family before inserting fresh ones
    await supabase.from('game_question').delete().eq('family_id', family_id).eq('category', 'family_specific');
    const { data: inserted, error } = await supabase.from('game_question').insert(rows).select('id');
    if (error) throw error;

    const questionIds = inserted.map((r: any) => r.id);

    await supabase.from('family_quiz_cache').upsert({
      family_id, source_hash: sourceHash, question_ids: questionIds, generated_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ question_ids: questionIds, cached: false }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('generate-family-quiz error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});