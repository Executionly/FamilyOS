import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// One cap for every game start (Bible Trivia, General Quiz, Know Our Family), single or multiplayer.
export const DAILY_SESSION_LIMIT = 5;

/**
 * Returns a 429 Response if the family has used up today's sessions; null if they can start another.
 * Counts game_session rows (cancelled lobbies don't count), so it needs no extra table.
 *
 * Note: "today" starts at midnight in the Edge Function's timezone (UTC), i.e. 1am in Lagos.
 */
export async function dailyLimitResponse(
  supabase: SupabaseClient,
  familyId: string,
): Promise<Response | null> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('game_session')
    .select('id', { count: 'exact', head: true })
    .eq('family_id', familyId)
    .neq('status', 'cancelled')
    .gte('created_at', todayStart.toISOString());

  if ((count ?? 0) >= DAILY_SESSION_LIMIT) {
    return new Response(
      JSON.stringify({ error: 'daily_limit_reached', limit: DAILY_SESSION_LIMIT }),
      { status: 429, headers: { 'Content-Type': 'application/json' } },
    );
  }
  return null;
}