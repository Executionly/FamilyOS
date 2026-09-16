import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY')!;
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const DAILY_SESSION_LIMIT = 5; // per family, prevents cost abuse without gating behind Premium

interface GameQuestionRequest {
  family_id: string;
  game_type: 'bible_trivia' | 'quiz';
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  count?: number;
}

serve(async (req) => {
  try {
    const { family_id, game_type, category, difficulty = 'medium', count = 10 }: GameQuestionRequest = await req.json();

    if (!family_id || !game_type) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    // Simple daily rate limit — not a subscription gate, just cost protection
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: sessionsToday } = await supabase
      .from('game_session')
      .select('id', { count: 'exact', head: true })
      .eq('family_id', family_id)
      .gte('created_at', todayStart.toISOString());

    if ((sessionsToday ?? 0) >= DAILY_SESSION_LIMIT) {
      return new Response(JSON.stringify({ error: 'daily_limit_reached', limit: DAILY_SESSION_LIMIT }), { status: 429 });
    }

    const topicLine =
      game_type === 'bible_trivia'
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
          {
            role: 'system',
            content: 'You write engaging multiple-choice trivia questions. Respond ONLY with valid JSON, no markdown, no backticks.',
          },
          {
            role: 'user',
            content: `Generate ${count} ${difficulty}-difficulty ${topicLine}.

Each question needs exactly 4 answer options, only one correct. Vary the position of the correct answer across questions — don't always put it first or last.

Return ONLY valid JSON:
{
  "questions": [
    {
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correct_option_index": 0,
      "explanation": "one sentence, shown after answering"
    }
  ]
}`,
          },
        ],
      }),
    });

    if (!deepseekRes.ok) {
      const errText = await deepseekRes.text();
      return new Response(JSON.stringify({ error: `DeepSeek failed: ${errText}` }), { status: 502 });
    }

    const deepseekData = await deepseekRes.json();
    const content = deepseekData.choices?.[0]?.message?.content;

    let parsed: { questions: any[] };
    try {
      parsed = JSON.parse(content.replace(/```json|```/g, '').trim());
    } catch {
      return new Response(JSON.stringify({ error: 'Failed to parse generated questions' }), { status: 500 });
    }

    if (!parsed.questions?.length) {
      return new Response(JSON.stringify({ error: 'No questions generated' }), { status: 500 });
    }

    const rows = parsed.questions.map((q) => ({
      game_type,
      category: category ?? null,
      difficulty,
      question: q.question,
      options: q.options,
      correct_option_index: q.correct_option_index,
      explanation: q.explanation ?? null,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from('game_question')
      .insert(rows)
      .select('id');

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ question_ids: inserted.map((r) => r.id) }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('generate-game-questions error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});