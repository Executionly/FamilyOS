import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from "npm:@supabase/supabase-js@2";
import { TOOLS, AUTO_EXECUTE_TOOLS } from '../family-ai-chat/tools.ts';
import { checkAiEntitlement, recordAiUsage } from '../_shared/entitlements.ts';

const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY')!;
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

function buildSummary(actionType: string, args: any): string {
  switch (actionType) {
    case 'create_event':
      return `Add "${args.title}" to the calendar on ${new Date(args.start_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
    case 'reschedule_event':
      return `Move "${args.event_title}" to ${new Date(args.new_start_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}${args.reason ? ` — ${args.reason}` : ''}`;
    case 'create_commitment':
      return `Add commitment "${args.title}"${args.assigned_to_member_name ? ` for ${args.assigned_to_member_name}` : ''}${args.due_date ? ` due ${new Date(args.due_date).toLocaleDateString()}` : ''}`;
    case 'create_chore':
      return `Add chore "${args.title}"${args.assigned_to_member_name ? ` for ${args.assigned_to_member_name}` : ''}`;
    case 'flag_meal_conflict':
      return `${args.reason}${args.suggested_new_time ? ` — move to ${args.suggested_new_time}?` : ''}`;
    case 'create_story':
      return `Save story "${args.title}" to your family's memories`;
    default:
      return 'Proposed action';
  }
}

async function sendPush(familyId: string, userId: string, title: string, body: string) {
  try {
    await supabase.functions.invoke('send-push', {
      body: { family_id: familyId, user_id: userId, type: 'ai_suggestion', priority: 'informational', title, body },
    });
  } catch (err) {
    console.error('sendPush error:', err);
  }
}

function isAdminAccess(role?: string): boolean {
  if (!role) return false;
  const userRole = role.toLowerCase();
  return ['admin', 'father', 'mother', 'coparent'].includes(userRole);
}

serve(async (req) => {
  try {
    const { family_id, user_id } = await req.json();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const weekAheadStr = new Date(today.getTime() + 7 * 86400000).toISOString().split('T')[0];
    const weekAgoStr = new Date(today.getTime() - 7 * 86400000).toISOString().split('T')[0];

    const { data: members } = await supabase.from('member').select('id, name, role, user_id').eq('family_id', family_id);
    const currentMember = (members ?? []).find((m) => m.user_id === user_id);

    const currentUserIsEditor = isAdminAccess(currentMember?.role);

    const entitlement = await checkAiEntitlement(supabase, family_id);
    if (!entitlement.allowed) {
      return new Response(JSON.stringify({
        error: entitlement.reason,
        upgrade_required: entitlement.reason === 'upgrade_required',
        quota_exceeded: entitlement.reason === 'quota_exceeded',
      }), { status: 402 }); // 402 Payment Required — semantically correct here
    }

    const { data: todayEvents } = await supabase
      .from('calendar_event').select('title, start_date, location')
      .eq('family_id', family_id).gte('start_date', todayStr).lt('start_date', todayStr + 'T23:59:59')
      .order('start_date');

    const { data: myOpenTasks } = await supabase
      .from('commitment').select('title, due_date')
      .eq('family_id', family_id).eq('assigned_to', currentMember?.id).eq('status', 'open')
      .lte('due_date', todayStr + 'T23:59:59');

    const { data: existingPendingActions } = await supabase
      .from('ai_action').select('id, summary').eq('family_id', family_id).eq('status', 'pending');

    const { data: recentChores } = await supabase.from('chore').select('status').eq('family_id', family_id).gte('created_at', weekAgoStr);
    const { data: recentCommitments } = await supabase.from('commitment').select('status').eq('family_id', family_id).gte('created_at', weekAgoStr);

    const choreCompletionRate = recentChores?.length
      ? Math.round((recentChores.filter((c) => c.status === 'completed').length / recentChores.length) * 100) : null;
    const commitmentCompletionRate = recentCommitments?.length
      ? Math.round((recentCommitments.filter((c) => c.status === 'completed').length / recentCommitments.length) * 100) : null;

    const { data: upcomingEvents } = await supabase
      .from('calendar_event').select('title, start_date').eq('family_id', family_id)
      .gte('start_date', todayStr).lte('start_date', weekAheadStr).order('start_date');

    const { data: overdueChores } = await supabase
      .from('chore').select('title, assigned_to, member:assigned_to(name)').eq('family_id', family_id).neq('status', 'completed').lt('due_date', todayStr);
    const { data: overdueCommitments } = await supabase
      .from('commitment').select('title, assigned_to, member:assigned_to(name)').eq('family_id', family_id).eq('status', 'open').lt('due_date', todayStr);

    const hasNothingToSay =
      !todayEvents?.length && !myOpenTasks?.length && !existingPendingActions?.length &&
      !overdueChores?.length && !overdueCommitments?.length && choreCompletionRate === null;

    if (hasNothingToSay) {
      return new Response(JSON.stringify({ briefing: null }), { status: 200 });
    }

    // ── Only fetch/propose action-worthy context if this viewer can actually act ──
    const context = `
    Today's events: ${(todayEvents ?? []).map((e) => `${e.title} at ${new Date(e.start_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`).join(', ') || 'none'}
    ${currentMember?.name}'s tasks due today: ${(myOpenTasks ?? []).map((t) => t.title).join(', ') || 'none'}
    Already-pending AI suggestions awaiting approval: ${existingPendingActions?.length ?? 0}
    Overdue chores: ${(overdueChores ?? []).map((c: any) => `${c.title}${c.member?.name ? ` (${c.member.name})` : ' (unassigned)'}`).join(', ') || 'none'}
    Overdue commitments: ${(overdueCommitments ?? []).map((c: any) => `${c.title}${c.member?.name ? ` (${c.member.name})` : ' (unassigned)'}`).join(', ') || 'none'}
    This week's chore completion rate: ${choreCompletionRate !== null ? `${choreCompletionRate}%` : 'not enough data yet'}
    This week's commitment follow-through: ${commitmentCompletionRate !== null ? `${commitmentCompletionRate}%` : 'not enough data yet'}
    Events in the next 7 days: ${(upcomingEvents ?? []).length}
    `.trim();

    const systemPrompt = currentUserIsEditor
      ? `You write a short, warm 2-3 sentence briefing for ${currentMember?.name} opening their family app. Be specific and useful — surface what actually matters, not a report of every number. No generic greetings.

    You also have tools to actually help, not just report. If something overdue or unassigned needs action — a reminder sent, a nudge, a follow-up commitment created — propose it using a tool. Don't propose something for every little thing; only when it's genuinely useful. Notifications execute immediately; everything else is proposed for approval, so feel free to suggest freely.`
      : `You write a short, warm 2-3 sentence briefing for ${currentMember?.name} opening their family app. Be specific and useful — focus on what's relevant to THEM personally: their own tasks, today's events, things they'd want to know.

    You have one tool available: notify_member, for sending a low-stakes heads-up to someone. You do NOT have permission to create or change calendar events, commitments, or chores — this family member isn't an admin or coparent, so don't propose those kinds of changes. If something needs a schedule or task change, just mention it in your reply so they know to flag it to an admin, rather than trying to action it yourself.`;

    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${DEEPSEEK_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: context },
        ],
        tools: currentUserIsEditor ? TOOLS : TOOLS.filter((t) => AUTO_EXECUTE_TOOLS.has(t.function.name)),
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    const data = await res.json();
    const choice = data.choices?.[0];
    const briefing = choice?.message?.content ?? null;
    const toolCalls = choice?.message?.tool_calls ?? [];

    const newPendingActions: any[] = [];
    const autoExecutedSummaries: string[] = [];

    for (const call of toolCalls) {
      let args: any;
      try { args = JSON.parse(call.function.arguments); } catch { continue; }
      const actionType = call.function.name;

      if (AUTO_EXECUTE_TOOLS.has(actionType)) {
        if (actionType === 'notify_member') {
          const target = (members ?? []).find((m) => m.name.toLowerCase() === args.member_name?.toLowerCase());
          if (target?.user_id) {
            await sendPush(family_id, target.user_id, args.title, args.body);
            autoExecutedSummaries.push(`Notified ${target.name}: "${args.title}"`);
          }
        } else if (actionType === 'mark_task_complete') {
          const table = args.task_type === 'chore' ? 'chore' : 'commitment';
          const { data: matched } = await supabase.from(table).select('id, title').eq('family_id', family_id)
            .ilike('title', `%${args.task_title}%`).neq('status', 'completed').limit(1).maybeSingle();
          if (matched) {
            await supabase.from(table).update({ status: 'completed' }).eq('id', matched.id);
            autoExecutedSummaries.push(`Marked "${matched.title}" as complete`);
          }
        }
      } else {
        const summary = buildSummary(actionType, args);
        const { data: actionRow } = await supabase.from('ai_action').insert([{
          family_id, action_type: actionType, payload: args, summary,
          created_by_user_id: user_id, source: 'briefing',
        }]).select().single();
        if (actionRow) newPendingActions.push(actionRow);
      }
    }

    // Combine newly-proposed actions with any that were already pending from earlier
    const allPendingActions = [...(existingPendingActions ?? []), ...newPendingActions];

    await recordAiUsage(supabase, family_id, entitlement.isIntro);

    return new Response(JSON.stringify({
      briefing,
      pending_actions: newPendingActions, // only the NEW ones, to show as cards right now
      pending_action_count: allPendingActions.length,
      auto_executed: autoExecutedSummaries,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('family-ai-briefing error:', err);
    return new Response(JSON.stringify({ briefing: null }), { status: 200 });
  }
});