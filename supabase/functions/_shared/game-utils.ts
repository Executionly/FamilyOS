import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Draw `count` questions from a fixed pool, rotating fairly:
 *  - never-seen questions always come first (random order)
 *  - if the pool runs short, the LEAST-recently-seen fill the gap, so the
 *    previous session's questions are the last to come back
 * Marks the drawn questions as seen and returns them in shuffled play order.
 */
export async function pickFromPool(
  supabase: SupabaseClient,
  familyId: string,
  poolIds: string[],
  count: number,
): Promise<string[]> {
  const n = Math.min(count, poolIds.length);
  if (n <= 0) return [];

  const { data: seenRows, error } = await supabase
    .from('family_question_seen')
    .select('question_id, seen_at')
    .eq('family_id', familyId)
    .in('question_id', poolIds)
    .order('seen_at', { ascending: true }); // oldest first
  if (error) throw error;

  const seenIds = new Set((seenRows ?? []).map((r: any) => r.question_id));
  const unseen = poolIds.filter((id) => !seenIds.has(id));
  const leastRecentlySeen = (seenRows ?? []).map((r: any) => r.question_id);

  const selected =
    unseen.length >= n
      ? shuffle(unseen).slice(0, n)
      : [...unseen, ...leastRecentlySeen.slice(0, n - unseen.length)];

  const now = new Date().toISOString();
  const { error: upsertErr } = await supabase.from('family_question_seen').upsert(
    selected.map((id) => ({ family_id: familyId, question_id: id, seen_at: now })),
    { onConflict: 'family_id,question_id' },
  );
  // Seen-tracking failing shouldn't block starting a game
  if (upsertErr) console.error('family_question_seen upsert failed:', upsertErr);

  return shuffle(selected);
}