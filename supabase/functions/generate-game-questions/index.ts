import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { pickFromPool } from '../_shared/game-utils.ts';
import { rejectIfNotFamilyMember } from '../_shared/family-auth.ts';
import { dailyLimitResponse } from '../_shared/daily-limit.ts';

const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY')!;
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

interface GameQuestionRequest {
  family_id: string;
  game_type: 'bible_trivia' | 'quiz';
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  count?: number;
}

async function generateAndStoreQuestions(
  gameType: string, category: string | undefined, difficulty: string, count: number
): Promise<string[]> {
  const topicLine =
    gameType === 'bible_trivia'
      ? `Bible trivia questions${category ? ` focused on ${category}` : ''}, suitable for a family audience of mixed ages`
      : `General knowledge quiz questions${category ? ` about ${category}` : ''}, fun and family-friendly, mixed topics if no category given`;

  const deepseekRes = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${DEEPSEEK_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'deepseek-chat',
      max_tokens: 2000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You write engaging multiple-choice trivia questions. Respond ONLY with valid JSON, no markdown, no backticks.' },
        {
          role: 'user',
          content: `Generate ${count} ${difficulty}-difficulty ${topicLine}.

Each question needs exactly 4 answer options, only one correct. Vary the position of the correct answer across questions.

Return ONLY valid JSON:
{
  "questions": [
    { "question": "string", "options": ["string","string","string","string"], "correct_option_index": 0, "explanation": "one sentence" }
  ]
}`,
        },
      ],
    }),
  });

  if (!deepseekRes.ok) throw new Error(`DeepSeek failed: ${await deepseekRes.text()}`);
  const deepseekData = await deepseekRes.json();
  const content = deepseekData.choices?.[0]?.message?.content;

  const parsed = JSON.parse(content.replace(/```json|```/g, '').trim());
  if (!parsed.questions?.length) return [];

  // family_id is left null on purpose: AI top-ups join the shared global bank.
  const rows = parsed.questions.map((q: any) => ({
    game_type: gameType, category: category ?? null, difficulty,
    question: q.question, options: q.options,
    correct_option_index: q.correct_option_index, explanation: q.explanation ?? null,
    source: 'ai_generated',
  }));

  const { data: inserted, error } = await supabase.from('game_question').insert(rows).select('id');
  if (error) throw error;
  return inserted.map((r: any) => r.id);
}

async function selectQuestions(
  familyId: string, gameType: string, category: string | undefined, difficulty: string, count: number
): Promise<string[]> {
  // GLOBAL bank only. Family-scoped rows (category 'family_specific', difficulty 'medium') live in
  // the same table; without `family_id IS NULL` they were being mixed into every General Quiz game.
  let query = supabase
    .from('game_question')
    .select('id')
    .eq('game_type', gameType)
    .eq('difficulty', difficulty)
    .is('family_id', null);
  if (category) query = query.eq('category', category);
  const { data: bank } = await query;
  const poolIds = (bank ?? []).map((q: any) => q.id as string);

  // Least-recently-seen rotation; marks what it returns as seen.
  let selected = await pickFromPool(supabase, familyId, poolIds, count);

  if (selected.length < count) {
    const aiIds = await generateAndStoreQuestions(gameType, category, difficulty, count - selected.length);
    if (aiIds.length > 0) {
      // The family is about to play these too, so mark them seen like the rest.
      await supabase.from('family_question_seen').upsert(
        aiIds.map((id) => ({ family_id: familyId, question_id: id, seen_at: new Date().toISOString() })),
        { onConflict: 'family_id,question_id' }
      );
    }
    selected = [...selected, ...aiIds];
  }

  return selected;
}

serve(async (req) => {
  try {
    const { family_id, game_type, category, difficulty = 'medium', count = 10 }: GameQuestionRequest = await req.json();

    if (!family_id || !game_type) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    const denied = await rejectIfNotFamilyMember(req, family_id);
    if (denied) return denied;

    const limited = await dailyLimitResponse(supabase, family_id);
    if (limited) return limited;

    const questionIds = await selectQuestions(family_id, game_type, category, difficulty, count);

    if (questionIds.length === 0) {
      return new Response(JSON.stringify({ error: 'No questions available' }), { status: 500 });
    }

    return new Response(JSON.stringify({ question_ids: questionIds }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('generate-game-questions error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});