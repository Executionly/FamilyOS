// supabase/functions/scheduled-reminders/index.ts
//
// Runs every 5 minutes via pg_cron.
// Checks for upcoming events that need push notifications and sends them.
//
// Reminder types handled:
// 1. Meeting — 24h before, 1h before, 30min before
// 2. Calendar event — 24h before, 1h before
// 3. Commitment — due today (morning), overdue (next morning)
// 4. Chore — due today (morning), overdue (next morning)
//
// pg_cron schedule (run in Supabase SQL Editor):
// SELECT cron.schedule('scheduled-reminders', '*/5 * * * *', $$
//   SELECT net.http_post(
//     url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/scheduled-reminders',
//     headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
//     body := '{}'::jsonb
//   );
// $$);

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── Deduplication ─────────────────────────────────────────────
// Prevents sending the same reminder twice if the cron fires
// slightly late or twice in quick succession.
// We store sent reminder keys in the notifications table itself
// by checking if a notification with matching title+route+family
// was already sent within the relevant window.

async function wasAlreadySent(
  familyId: string,
  dedupKey: string,
  withinMinutes: number,
): Promise<boolean> {
  const since = new Date(Date.now() - withinMinutes * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('notifications')
    .select('id')
    .eq('family_id', familyId)
    .eq('action_route', dedupKey)
    .gte('sent_at', since)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

// ── Push sender ───────────────────────────────────────────────

async function sendPush(payload: {
  family_id: string;
  user_id?: string | null;
  type: string;
  priority: string;
  title: string;
  body: string;
  action_label?: string;
  action_route?: string;
}) {
  try {
    await supabase.functions.invoke('send-push', { body: payload });
  } catch (err) {
    console.error('[scheduled-reminders] send-push failed:', err);
  }
}

// ── Helper: get user_id from auth.users for assigned_to ───────
// committed.assigned_to and chore.assigned_to are auth.users(id)
// so we can use them directly as user_id in send-push.

// ── 1. MEETING REMINDERS ──────────────────────────────────────

async function handleMeetingReminders() {
  const now = new Date();

  // Windows: 24h ± 5min, 1h ± 5min, 30min ± 5min
  const windows = [
    { label: '24h',  minutesBefore: 24 * 60, title: 'Family meeting tomorrow',        body: (m: any) => `"${m.title}" is scheduled for tomorrow at ${new Date(m.scheduled_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}.` },
    { label: '1h',   minutesBefore: 60,       title: 'Family meeting in 1 hour',       body: (m: any) => `"${m.title}" starts in 1 hour. Get ready!` },
    { label: '30min', minutesBefore: 30,      title: 'Family meeting in 30 minutes',   body: (m: any) => `"${m.title}" starts in 30 minutes. Time to gather the family.` },
  ];

  for (const window of windows) {
    const windowStart = new Date(now.getTime() + (window.minutesBefore - 5) * 60 * 1000);
    const windowEnd   = new Date(now.getTime() + (window.minutesBefore + 5) * 60 * 1000);

    const { data: meetings } = await supabase
      .from('meeting')
      .select('id, family_id, title, scheduled_date')
      .eq('status', 'scheduled')
      .gte('scheduled_date', windowStart.toISOString())
      .lte('scheduled_date', windowEnd.toISOString());

    for (const meeting of meetings ?? []) {
      const dedupKey = `meeting-${meeting.id}-${window.label}`;
      if (await wasAlreadySent(meeting.family_id, dedupKey, window.minutesBefore + 10)) continue;

      await sendPush({
        family_id: meeting.family_id,
        user_id: null, // broadcast to whole family
        type: 'meeting_starting',
        priority: window.minutesBefore <= 30 ? 'critical' : 'important',
        title: window.title,
        body: window.body(meeting),
        action_label: 'View Meeting',
        action_route: dedupKey, // used as dedup key AND route hint
      });

      console.log(`[meeting] sent ${window.label} reminder for ${meeting.id}`);
    }
  }
}

// ── 2. CALENDAR EVENT REMINDERS ───────────────────────────────

async function handleEventReminders() {
  const now = new Date();

  const windows = [
    { label: '24h', minutesBefore: 24 * 60, title: 'Event tomorrow',         body: (e: any) => `"${e.title}" is tomorrow at ${new Date(e.start_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}${e.location ? ` at ${e.location}` : ''}.` },
    { label: '1h',  minutesBefore: 60,       title: 'Event starting in 1 hour', body: (e: any) => `"${e.title}" starts in 1 hour${e.location ? ` at ${e.location}` : ''}.` },
  ];

  for (const window of windows) {
    const windowStart = new Date(now.getTime() + (window.minutesBefore - 5) * 60 * 1000);
    const windowEnd   = new Date(now.getTime() + (window.minutesBefore + 5) * 60 * 1000);

    const { data: events } = await supabase
      .from('calendar_event')
      .select('id, family_id, title, start_date, location')
      .gte('start_date', windowStart.toISOString())
      .lte('start_date', windowEnd.toISOString());

    for (const event of events ?? []) {
      const dedupKey = `event-${event.id}-${window.label}`;
      if (await wasAlreadySent(event.family_id, dedupKey, window.minutesBefore + 10)) continue;

      await sendPush({
        family_id: event.family_id,
        user_id: null,
        type: 'event_reminder',
        priority: window.minutesBefore <= 60 ? 'important' : 'informational',
        title: window.title,
        body: window.body(event),
        action_label: 'View Calendar',
        action_route: dedupKey,
      });

      console.log(`[event] sent ${window.label} reminder for ${event.id}`);
    }
  }
}

// ── 3. COMMITMENT REMINDERS ───────────────────────────────────
// Runs at 8AM family-local time (approximated in UTC).
// "Due today" — sent morning of due date.
// "Overdue"   — sent morning after due date if still open.

async function handleCommitmentReminders() {
  const now = new Date();
  const hour = now.getUTCHours();

  // Only run between 7-9 AM UTC (adjust if your users are in a different TZ)
  // For Nigeria (WAT = UTC+1), 8AM WAT = 7AM UTC
  if (hour < 7 || hour > 9) return;

  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setUTCHours(23, 59, 59, 999);

  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayEnd   = new Date(todayEnd.getTime()   - 24 * 60 * 60 * 1000);

  // Due today
  const { data: dueToday } = await supabase
    .from('commitment')
    .select('id, family_id, title, assigned_to, due_date')
    .in('status', ['open', 'in_progress'])
    .gte('due_date', todayStart.toISOString())
    .lte('due_date', todayEnd.toISOString());

  for (const c of dueToday ?? []) {
    const dedupKey = `commitment-due-today-${c.id}`;
    if (await wasAlreadySent(c.family_id, dedupKey, 23 * 60)) continue;

    // Send to assignee specifically if they have an account
    // assigned_to is auth.users(id) so use directly as user_id
    await sendPush({
      family_id: c.family_id,
      user_id: c.assigned_to || null,
      type: 'commitment_due',
      priority: 'important',
      title: 'Commitment due today',
      body: `"${c.title}" is due today. Don't forget!`,
      action_label: 'View',
      action_route: dedupKey,
    });

    console.log(`[commitment] due-today reminder for ${c.id}`);
  }

  // Overdue (due yesterday or earlier, still open)
  const { data: overdue } = await supabase
    .from('commitment')
    .select('id, family_id, title, assigned_to, due_date')
    .in('status', ['open', 'in_progress'])
    .lt('due_date', todayStart.toISOString());

  for (const c of overdue ?? []) {
    const dedupKey = `commitment-overdue-${c.id}-${todayStart.toDateString()}`;
    if (await wasAlreadySent(c.family_id, dedupKey, 23 * 60)) continue;

    const daysOverdue = Math.floor(
      (now.getTime() - new Date(c.due_date).getTime()) / (24 * 60 * 60 * 1000)
    );

    await sendPush({
      family_id: c.family_id,
      user_id: c.assigned_to || null,
      type: 'task_overdue',
      priority: daysOverdue > 2 ? 'critical' : 'important',
      title: 'Commitment overdue',
      body: `"${c.title}" was due ${daysOverdue === 1 ? 'yesterday' : `${daysOverdue} days ago`} and is still open.`,
      action_label: 'Update',
      action_route: dedupKey,
    });

    console.log(`[commitment] overdue reminder for ${c.id} (${daysOverdue}d overdue)`);
  }
}

// ── 4. CHORE REMINDERS ────────────────────────────────────────

async function handleChoreReminders() {
  const now = new Date();
  const hour = now.getUTCHours();

  // Same 7-9 AM UTC window as commitments
  if (hour < 7 || hour > 9) return;

  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setUTCHours(23, 59, 59, 999);

  // Due today
  const { data: dueToday } = await supabase
    .from('chore')
    .select('id, family_id, title, assigned_to, due_date, frequency')
    .in('status', ['pending', 'in_progress'])
    .gte('due_date', todayStart.toISOString())
    .lte('due_date', todayEnd.toISOString());

  for (const c of dueToday ?? []) {
    const dedupKey = `chore-due-today-${c.id}`;
    if (await wasAlreadySent(c.family_id, dedupKey, 23 * 60)) continue;

    await sendPush({
      family_id: c.family_id,
      user_id: c.assigned_to || null,
      type: 'chore_overdue', // reuse this type for due-today too
      priority: 'important',
      title: 'Chore due today',
      body: `"${c.title}" is due today. Mark it done when complete!`,
      action_label: 'Mark Done',
      action_route: dedupKey,
    });

    console.log(`[chore] due-today reminder for ${c.id}`);
  }

  // Overdue chores
  const { data: overdue } = await supabase
    .from('chore')
    .select('id, family_id, title, assigned_to, due_date, frequency')
    .in('status', ['pending', 'in_progress'])
    .lt('due_date', todayStart.toISOString());

  for (const c of overdue ?? []) {
    const dedupKey = `chore-overdue-${c.id}-${todayStart.toDateString()}`;
    if (await wasAlreadySent(c.family_id, dedupKey, 23 * 60)) continue;

    const daysOverdue = Math.floor(
      (now.getTime() - new Date(c.due_date).getTime()) / (24 * 60 * 60 * 1000)
    );

    await sendPush({
      family_id: c.family_id,
      user_id: c.assigned_to || null,
      type: 'chore_overdue',
      priority: daysOverdue > 2 ? 'critical' : 'important',
      title: 'Chore overdue',
      body: `"${c.title}" was due ${daysOverdue === 1 ? 'yesterday' : `${daysOverdue} days ago`} and hasn't been completed.`,
      action_label: 'Mark Done',
      action_route: dedupKey,
    });

    console.log(`[chore] overdue reminder for ${c.id} (${daysOverdue}d overdue)`);
  }
}

// ── 5. WEEKLY MEETING NUDGE ───────────────────────────────────
// If a family hasn't scheduled a meeting this week,
// send a nudge on Monday morning to schedule one.

async function handleWeeklyMeetingNudge() {
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon
  const hour = now.getUTCHours();

  // Only on Monday between 7-9 AM UTC
  if (dayOfWeek !== 1 || hour < 7 || hour > 9) return;

  // Get start of this week (Monday)
  const weekStart = new Date(now);
const daysFromMonday = (dayOfWeek as number) === 0 ? 6 : dayOfWeek - 1;
weekStart.setUTCDate(now.getUTCDate() - daysFromMonday);
  weekStart.setUTCHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Get all families
  const { data: families } = await supabase
    .from('family')
    .select('id');

  for (const family of families ?? []) {
    // Check if they have any meeting scheduled this week
    const { data: meetings } = await supabase
      .from('meeting')
      .select('id')
      .eq('family_id', family.id)
      .in('status', ['scheduled', 'in_progress', 'completed'])
      .gte('scheduled_date', weekStart.toISOString())
      .lte('scheduled_date', weekEnd.toISOString())
      .limit(1);

    if (meetings && meetings.length > 0) continue; // already has a meeting this week

    const dedupKey = `weekly-nudge-${family.id}-${weekStart.toDateString()}`;
    if (await wasAlreadySent(family.id, dedupKey, 23 * 60)) continue;

    await sendPush({
      family_id: family.id,
      user_id: null,
      type: 'ai_suggestion',
      priority: 'informational',
      title: 'Time for your weekly family meeting',
      body: "You haven't scheduled a family meeting this week. Regular check-ins keep everyone aligned.",
      action_label: 'Schedule Now',
      action_route: dedupKey,
    });

    console.log(`[nudge] weekly meeting nudge for family ${family.id}`);
  }
}

// ── Main handler ──────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[scheduled-reminders] Running at', new Date().toISOString());

    // Run all reminder checks in parallel
    await Promise.allSettled([
      handleMeetingReminders(),
      handleEventReminders(),
      handleCommitmentReminders(),
      handleChoreReminders(),
      handleWeeklyMeetingNudge(),
    ]);

    return new Response(
      JSON.stringify({ success: true, ran_at: new Date().toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[scheduled-reminders] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});