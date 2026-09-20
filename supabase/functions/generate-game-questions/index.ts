import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY')!;
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const DAILY_SESSION_LIMIT = 5;

interface GameQuestionRequest {
  family_id: string;
  game_type: 'bible_trivia' | 'quiz';
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  count?: number;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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
  // Track "seen" with a timestamp so we can protect the most recent games specifically,
  // not just a binary seen/unseen forever-flag
  const { data: seenRows } = await supabase
    .from('family_question_seen')
    .select('question_id, seen_at')
    .eq('family_id', familyId)
    .order('seen_at', { ascending: false });

  const seenIds = new Set((seenRows ?? []).map((r: any) => r.question_id));

  let query = supabase.from('game_question').select('id').eq('game_type', gameType).eq('difficulty', difficulty);
  if (category) query = query.eq('category', category);
  const { data: allMatching } = await query;
  const allIds = (allMatching ?? []).map((q: any) => q.id);

  const unseen = allIds.filter((id) => !seenIds.has(id));

  let selected: string[] = [];

  if (unseen.length >= count) {
    selected = shuffle(unseen).slice(0, count) as any;
  } else if (allIds.length >= count) {
    // Not enough fully-unseen questions — reuse is unavoidable, but protect
    // the MOST RECENTLY seen ones specifically, so back-to-back games don't repeat
    const recentlySeenIds = new Set((seenRows ?? []).slice(0, count).map((r: any) => r.question_id));
    const notRecentlySeen = allIds.filter((id) => !recentlySeenIds.has(id));

    const pool = notRecentlySeen.length >= count ? notRecentlySeen : allIds;
    selected = shuffle(pool).slice(0, count) as any;

    // Only clear seen-history for what we're actually about to reuse,
    // not the entire bank — keeps genuinely-unseen questions marked unseen
    await supabase
      .from('family_question_seen')
      .delete()
      .eq('family_id', familyId)
      .in('question_id', selected);
  } else {
    selected = allIds;
  }

  if (selected.length < count) {
    const aiIds = await generateAndStoreQuestions(gameType, category, difficulty, count - selected.length);
    selected = [...selected, ...aiIds];
  }

  if (selected.length > 0) {
    await supabase.from('family_question_seen').upsert(
      selected.map((id) => ({ family_id: familyId, question_id: id, seen_at: new Date().toISOString() })),
      { onConflict: 'family_id,question_id' }
    );
  }

  return selected;
}

serve(async (req) => {
  try {
    const { family_id, game_type, category, difficulty = 'medium', count = 10 }: GameQuestionRequest = await req.json();

    if (!family_id || !game_type) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { count: sessionsToday } = await supabase
      .from('game_session')
      .select('id', { count: 'exact', head: true })
      .eq('family_id', family_id)
      .neq('status', 'cancelled')
      .gte('created_at', todayStart.toISOString());

    if ((sessionsToday ?? 0) >= DAILY_SESSION_LIMIT) {
      return new Response(JSON.stringify({ error: 'daily_limit_reached', limit: DAILY_SESSION_LIMIT }), { status: 429 });
    }

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