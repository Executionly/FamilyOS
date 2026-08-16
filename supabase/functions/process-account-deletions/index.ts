//
// Triggered daily via pg_cron (see scheduling SQL below).
// Purges every member/family whose deletion_scheduled_at has passed:
//   - regular member purge: Storage cleanup + auth.admin.deleteUser + tombstone the row
//     (keeps it rather than hard-deleting, so created_by/assigned_to FKs on shared
//     content — chores, chat, calendar events — stay valid)
//   - family cascade purge: Storage cleanup + auth delete for every member, then
//     hard-delete all family-scoped data (no family left to preserve history for)
//
// NOTE: table/column names below are placeholders pending the real schema —
// grep for "SCHEMA:" and adjust before deploying.

import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

serve(async (req) => {
  // Only pg_cron (or another scheduled trigger) should call this — not exposed for
  // public invocation.
  const cronSecret = req.headers.get("x-cron-secret");
  if (cronSecret !== Deno.env.get("CRON_SECRET")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date().toISOString();
  const results = { familiesPurged: 0, membersPurged: 0, errors: [] as string[] };

  // 1. Family-level cascades due for purge
  const { data: dueFamilies, error: familiesErr } = await supabaseAdmin
    .from("family")
    .select("id")
    .eq("account_status", "pending_deletion")
    .lte("deletion_scheduled_at", now);

  if (familiesErr) results.errors.push(`family lookup: ${familiesErr.message}`);

  for (const fam of dueFamilies ?? []) {
    try {
      await purgeFamily(fam.id);
      results.familiesPurged++;
    } catch (err) {
      results.errors.push(`family ${fam.id}: ${(err as Error).message}`);
    }
  }

  // 2. Regular member deletions due for purge (families already cascaded above are
  //    skipped here since their members were purged as part of purgeFamily)
  const { data: dueMembers, error: membersErr } = await supabaseAdmin
    .from("member")
    .select("id, user_id, family_id")
    .eq("account_status", "pending_deletion")
    .lte("deletion_scheduled_at", now);

  if (membersErr) results.errors.push(`member lookup: ${membersErr.message}`);

  for (const m of dueMembers ?? []) {
    try {
      await purgeMember(m.id, m.user_id);
      results.membersPurged++;
    } catch (err) {
      results.errors.push(`member ${m.id}: ${(err as Error).message}`);
    }
  }

  return new Response(JSON.stringify(results), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});

async function purgeMember(memberId: string, authUserId: string | null) {
  await deleteMemberStorageObjects(memberId);

  if (authUserId) {
    await supabaseAdmin
    .from('profiles')
    .update({ email: null })
    .eq('id', authUserId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(authUserId);
    // Treat "already gone" as success rather than failing the whole purge run
    if (error && !error.message?.includes("not found")) throw error;
  }

  await supabaseAdmin
    .from("member")
    .update({
      account_status: "deleted",
      name: "Removed Member", // SCHEMA: adjust to your actual display-name column
      email: null,
      avatar_url: null, // SCHEMA: drop or rename if this column doesn't exist
    })
    .eq("id", memberId);
}

async function purgeFamily(familyId: string) {
  const { data: members } = await supabaseAdmin
    .from("member")
    .select("id, user_id")
    .eq("family_id", familyId);

  for (const m of members ?? []) {
    await deleteMemberStorageObjects(m.id);
    if (m.user_id) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(m.user_id);
      await supabaseAdmin.from('profiles').delete().eq('id', m.user_id);
      if (error && !error.message?.includes("not found")) throw error;
    }
  }

  // SCHEMA: replace with your actual family-scoped table names
  const tablesToCascade = [
    "family_embeddings",
    "family_media",
    "chat_message",
    "chore",
    "calendar_event",
    "member",
  ];

  for (const table of tablesToCascade) {
    const { error } = await supabaseAdmin.from(table).delete().eq("family_id", familyId);
    if (error) throw new Error(`cascade delete on ${table}: ${error.message}`);
  }

  await supabaseAdmin.from("family").delete().eq("id", familyId);
}

async function deleteMemberStorageObjects(memberId: string) {
  // SCHEMA: adjust bucket name + the query used to find this member's uploaded objects
  const { data: mediaRows } = await supabaseAdmin
    .from("family_media")
    .select("storage_path")
    .eq("uploaded_by", memberId);

  const paths = (mediaRows ?? []).map((r) => r.storage_path).filter(Boolean);
  if (paths.length > 0) {
    const { error } = await supabaseAdmin.storage.from("family-media").remove(paths);
    if (error) throw new Error(`storage cleanup: ${error.message}`);
  }
}

