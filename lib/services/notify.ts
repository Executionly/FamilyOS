import { supabase } from '@/lib/_core/supabase';

export type NotificationType =
  | 'task_assigned'
  | 'task_due_soon'
  | 'task_overdue'
  | 'event_reminder'
  | 'family_update'
  | 'ai_suggestion'
  | 'meeting_starting'
  | 'commitment_due'
  | 'chore_overdue'
  | 'weekly_summary'
  | 'group_chat_message'
  | 'member_joined'
  | 'direct_message'
  | 'security_alert';

export type NotificationPriority = 'critical' | 'important' | 'informational';

interface BasePayload {
  familyId: string;
  type: NotificationType;
  priority: NotificationPriority;
  actionLabel?: string;
  actionRoute?: string;
}

// ── Simple family-wide broadcast ─────────────────────────────
// Sends the same message to every family member with a login.

interface BroadcastPayload extends BasePayload {
  title: string;
  body: string;
  excludeUserId?: string;
}

// ── Targeted + broadcast ──────────────────────────────────────
// Sends a personalized message to the assignee (if they have an account)
// and a different "family update" message to everyone else.

interface TargetedPayload extends BasePayload {
  assigneeMemberId: string; // member.id of the person being assigned
  assigneeMessage: {
    title: string;  // e.g. "You've been assigned a chore"
    body: string;   // e.g. "Clean the kitchen is due tomorrow"
  };
  othersMessage: {
    title: string;  // e.g. "Chore assigned"
    body: string;   // e.g. "Clean the kitchen was assigned to Sarah"
  };
}

// ── Core Edge Function caller ─────────────────────────────────

async function invokeSendPush(payload: {
  family_id: string;
  user_id?: string | null;
  exclude_user_id?: string | null;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string;
  action_label?: string;
  action_route?: string;
}) {
  try {
    const { error } = await supabase.functions.invoke('send-push', { body: payload });
    if (error) console.warn('[notify] Edge Function error:', error);
  } catch (err) {
    // Notifications are non-critical — never crash the app
    console.warn('[notify] Failed to invoke send-push:', err);
  }
}

// ── Helper: get all member user_ids in a family ───────────────

async function getFamilyMemberUserIds(familyId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('member')
    .select('user_id')
    .eq('family_id', familyId)
    // .eq('has_login', true)
    .not('user_id', 'is', null);

  if (error || !data) return [];
  return data.map((m) => m.user_id).filter(Boolean) as string[];
}

// ── Helper: resolve member.id → user_id ──────────────────────

async function getMemberUserId(memberId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('member')
    .select('user_id')
    .eq('id', memberId)
    .single();
  if (error || !data) return null;
  return data.user_id || null;
}

async function getFamilyAdminUserIds(familyId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('member')
    .select('user_id')
    .eq('family_id', familyId)
    .in('role', ['admin', 'mother', 'father', 'coparent'])
    .eq('has_login', true)
    .not('user_id', 'is', null);

  if (error || !data) return [];

  return data.map((m) => m.user_id).filter(Boolean) as string[];
}

// ── Public API ────────────────────────────────────────────────

/**
 * Broadcast the same notification to ALL family members with an account.
 * Use for: meeting scheduled, new event, family announcement, AI insight.
 */
export async function notifyFamily(payload: BroadcastPayload) {

  await invokeSendPush({
    family_id: payload.familyId,
    user_id: null,
    type: payload.type,
    priority: payload.priority,
    title: payload.title,
    body: payload.body,
    action_label: payload.actionLabel,
    action_route: payload.actionRoute,
    exclude_user_id: payload.excludeUserId
  });
//   if (!payload.excludeUserId) {
//     // No exclusion needed — broadcast as before
//     return;
//   }

//   // Exclusion requested — resolve member list and send individually, skipping excludeUserId
//   const allMemberUserIds = await getFamilyMemberUserIds(payload.familyId);
//   const recipients = allMemberUserIds.filter((uid) => uid !== payload.excludeUserId);
// console.log("allMemberUserIds",allMemberUserIds)
// console.log("recipients",recipients)
//   for (const userId of recipients) {
//     console.log("SENT")
//     await invokeSendPush({
//       family_id: payload.familyId,
//       user_id: userId,
//       type: payload.type,
//       priority: payload.priority,
//       title: payload.title,
//       body: payload.body,
//       action_label: payload.actionLabel,
//       action_route: payload.actionRoute,
//     });
//   }
}


export async function notifyAdmins(payload: BroadcastPayload) {
  const adminUserIds = await getFamilyAdminUserIds(payload.familyId);

  for (const userId of adminUserIds) {
    if (userId === payload.excludeUserId) continue;
    await invokeSendPush({
      family_id: payload.familyId,
      user_id: userId,
      type: payload.type,
      priority: payload.priority,
      title: payload.title,
      body: payload.body,
      action_label: payload.actionLabel,
      action_route: payload.actionRoute,
    });
  }
}

/**
 * Send a personalized notification to an assignee + a different message to everyone else.
 * Use for: commitment assigned, chore assigned, memory tagged.
 *
 * - If the assignee has an account: they get `assigneeMessage`, others get `othersMessage`
 * - If the assignee has NO account (child/managed profile): everyone gets `othersMessage`
 */
export async function notifyAssignment(payload: TargetedPayload) {
  const [assigneeUserId, allMemberUserIds] = await Promise.all([
    getMemberUserId(payload.assigneeMemberId),
    getFamilyMemberUserIds(payload.familyId),
  ]);

  if (assigneeUserId) {
    // Send personalized message to assignee
    await invokeSendPush({
      family_id: payload.familyId,
      user_id: assigneeUserId,
      type: payload.type,
      priority: payload.priority,
      title: payload.assigneeMessage.title,
      body: payload.assigneeMessage.body,
      action_label: payload.actionLabel,
      action_route: payload.actionRoute,
    });

    // Send family update to everyone else who has an account
    const otherUserIds = allMemberUserIds.filter((uid) => uid !== assigneeUserId);
    for (const userId of otherUserIds) {
      await invokeSendPush({
        family_id: payload.familyId,
        user_id: userId,
        type: 'family_update',
        priority: 'informational',
        title: payload.othersMessage.title,
        body: payload.othersMessage.body,
        action_label: payload.actionLabel,
        action_route: payload.actionRoute,
      });
    }
  } else {
    // Assignee has no account (child/managed profile)
    // Send the "others" message to all admins/coparents who do have accounts
    await invokeSendPush({
      family_id: payload.familyId,
      user_id: null,
      type: 'family_update',
      priority: 'informational',
      title: payload.othersMessage.title,
      body: payload.othersMessage.body,
      action_label: payload.actionLabel,
      action_route: payload.actionRoute,
    });
  }
}

/**
 * Send a notification to a specific user only (by their member.id).
 * Use for: reminders, due-soon alerts, direct messages.
 */
export async function notifyMember(
  memberId: string,
  payload: Omit<BroadcastPayload, 'familyId'> & { familyId: string },
) {
  const userId = await getMemberUserId(memberId);

  if (!userId) return; // member has no account — skip silently
  await invokeSendPush({
    family_id: payload.familyId,
    user_id: userId,
    type: payload.type,
    priority: payload.priority,
    title: payload.title,
    body: payload.body,
    action_label: payload.actionLabel,
    action_route: payload.actionRoute,
  });
}