import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

serve(async (req) => {
  try {
    const { session_id, participant_id, question_id, selected_option_index, time_taken_ms } = await req.json();

    const { data: question, error: qError } = await supabase
      .from('game_question')
      .select('correct_option_index')
      .eq('id', question_id)
      .single();
    if (qError || !question) throw qError ?? new Error('Question not found');

    const isCorrect = question.correct_option_index === selected_option_index;

    const { error: answerError } = await supabase.from('game_answer').insert([{
      session_id, participant_id, question_id,
      selected_option_index, is_correct: isCorrect, time_taken_ms,
    }]);
    if (answerError) throw answerError;

    if (isCorrect) {
      // Speed bonus: faster correct answers score slightly higher (100 base, up to +50 for speed)
      const speedBonus = time_taken_ms ? Math.max(0, Math.round(50 * (1 - Math.min(time_taken_ms, 10000) / 10000))) : 0;
      const points = 100 + speedBonus;

      const { data: participant } = await supabase
        .from('game_participant')
        .select('score')
        .eq('id', participant_id)
        .single();

      await supabase
        .from('game_participant')
        .update({ score: (participant?.score ?? 0) + points })
        .eq('id', participant_id);
    }

    return new Response(JSON.stringify({ is_correct: isCorrect }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('submit-game-answer error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});