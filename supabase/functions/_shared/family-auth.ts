import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Returns a Response to send back if the caller is NOT a member of `familyId`; null if OK.
 *
 * Uses a client scoped to the caller's own JWT, so RLS decides membership: if the caller
 * can read the `family` row, they belong to it. (Assumes the family SELECT policy is
 * membership-based; if it isn't, swap this for a direct member-table check.)
 *
 * The functions themselves use the service-role key, which bypasses RLS entirely,
 * so without this any signed-in user could pass any family_id.
 */
export async function rejectIfNotFamilyMember(
  req: Request,
  familyId: string,
): Promise<Response | null> {
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
  );

  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: 'unauthorized' }, 401);

  const { data: visible } = await userClient
    .from('family')
    .select('id')
    .eq('id', familyId)
    .maybeSingle();
  if (!visible) return json({ error: 'forbidden' }, 403);

  return null;
}