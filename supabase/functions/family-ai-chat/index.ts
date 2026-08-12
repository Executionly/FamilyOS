import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from "npm:@supabase/supabase-js@2";
import { TOOLS, AUTO_EXECUTE_TOOLS } from './tools.ts';
import { checkAiEntitlement, recordAiUsage } from '../_shared/entitlements.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;
const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface ChatRequest {
  family_id: string;
  user_id: string;
  message: string;
}

async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
  });
  if (!res.ok) throw new Error(`OpenAI embedding failed: ${await res.text()}`);
  const data = await res.json();
  return data.data[0].embedding;
}

async function sendPush(familyId: string, userId: string, title: string, body: string, type = 'ai_suggestion') {
  try {
    await supabase.functions.invoke('send-push', {
      body: { family_id: familyId, user_id: userId, type, priority: 'informational', title, body },
    });
  } catch (err) {
    console.error('sendPush error:', err);
  }
}

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

function isAdminAccess(role?: string): boolean {
  if (!role) return false;
  const userRole = role.toLowerCase();
  return ['admin', 'father', 'mother', 'coparent'].includes(userRole);
}

serve(async (req) => {
  try {
    const { family_id, user_id, message }: ChatRequest = await req.json();

    if (!family_id || !user_id || !message?.trim()) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    const entitlement = await checkAiEntitlement(supabase, family_id);
    if (!entitlement.allowed) {
      return new Response(JSON.stringify({
        error: entitlement.reason,
        upgrade_required: entitlement.reason === 'upgrade_required',
        quota_exceeded: entitlement.reason === 'quota_exceeded',
      }), { status: 402 }); // 402 Payment Required — semantically correct here
    }
    const { data: insertedUserMsg } = await supabase
    .from('family_chat_messages')
    .insert([{ family_id, user_id, role: 'user', content: message }])
    .select()
    .single();

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const weekAhead = new Date(today);
    weekAhead.setDate(today.getDate() + 7);
    const weekAheadStr = weekAhead.toISOString().split('T')[0];

    // ── 1. Retrieval ──────────────────────────────────────────────
    const queryEmbedding = await getEmbedding(message);
    const { data: matches, error: matchError } = await supabase.rpc('match_family_embeddings', {
      query_embedding: queryEmbedding,
      match_family_id: family_id,
      match_count: 8,
    });
    if (matchError) throw matchError;
    const retrievedContext = (matches ?? []).map((m: { content: string }) => `- ${m.content}`).join('\n');

    // ── 2. Family + charter ──────────────────────────────────────
    const { data: family } = await supabase.from('family').select('name, created_at, created_by').eq('id', family_id).single();
    const { data: familyCharter } = await supabase.from('charter').select('*').eq('family_id', family_id).single();

    // ── 3. Roster + dietary ──────────────────────────────────────
    const { data: members } = await supabase
      .from('member')
      .select('id, name, role, age_band, dietary_notes')
      .eq('family_id', family_id);

    const roster = (members ?? []).map((m) => `${m.name} (${m.role}${m.age_band ? `, ${m.age_band}` : ''})`).join(', ') || 'not yet added';
    const dietaryNotes = (members ?? []).filter((m) => m.dietary_notes?.trim()).map((m) => `${m.name}: ${m.dietary_notes}`).join('\n') || 'None recorded.';
    const currentMember = (members ?? []).find((m) => m.user_id === user_id);
    const currentUserIsEditor = isAdminAccess(currentMember?.role);

    // ── 4. Meal plan ──────────────────────────────────────────────
    const { data: currentPlan } = await supabase
      .from('meal_plan')
      .select('id, week_start_date, snack_rule_note')
      .eq('family_id', family_id)
      .lte('week_start_date', todayStr)
      .order('week_start_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    let mealPlanContext = 'No meal plan set for this week.';
    if (currentPlan) {
      const { data: items } = await supabase
        .from('meal_plan_item')
        .select('day_of_week, slot, meal:meal_id(name, description)')
        .eq('meal_plan_id', currentPlan.id)
        .order('day_of_week');

      const byDay: Record<number, string[]> = {};
      (items ?? []).forEach((item: any) => {
        const label = `${item.slot}: ${item.meal?.name ?? 'TBD'}`;
        byDay[item.day_of_week] = [...(byDay[item.day_of_week] ?? []), label];
      });

      mealPlanContext = DAY_NAMES.map((d, i) => `${d}: ${(byDay[i] ?? []).join(', ') || 'nothing planned'}`).join('\n');
      if (currentPlan.snack_rule_note) mealPlanContext += `\nSnack rule this week: ${currentPlan.snack_rule_note}`;
    }

    // ── 5. Events ─────────────────────────────────────────────────
    const { data: events } = await supabase
      .from('calendar_event')
      .select('id, title, start_date, end_date, location')
      .eq('family_id', family_id)
      .gte('start_date', todayStr)
      .lte('start_date', weekAheadStr)
      .order('start_date');

    const eventsContext = (events ?? [])
      .map((e) => `${new Date(e.start_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} — ${e.title}${e.location ? ` at ${e.location}` : ''}`)
      .join('\n') || 'No upcoming events in the next 7 days.';

    // ── 6. Commitments ────────────────────────────────────────────
    const { data: commitments } = await supabase
      .from('commitment')
      .select('title, due_date, assigned_to, member:assigned_to(name)')
      .eq('family_id', family_id)
      .eq('status', 'open');

    const commitmentsContext = (commitments ?? [])
      .map((c: any) => `${c.title}${c.member?.name ? ` (${c.member.name})` : ''}${c.due_date ? ` — due ${new Date(c.due_date).toLocaleDateString()}` : ''}`)
      .join('\n') || 'No open commitments.';

    // ── 7. Chores ─────────────────────────────────────────────────
    const { data: chores } = await supabase
      .from('chore')
      .select('title, due_date, assigned_to, member:assigned_to(name)')
      .eq('family_id', family_id)
      .neq('status', 'completed')
      .neq('status', 'cancelled');

    const choresContext = (chores ?? [])
      .map((c: any) => `${c.title}${c.member?.name ? ` (${c.member.name})` : ''}${c.due_date ? ` — due ${new Date(c.due_date).toLocaleDateString()}` : ''}`)
      .join('\n') || 'No open chores.';

    // ── 8. Chat history ───────────────────────────────────────────
    const { data: history } = await supabase
      .from('family_chat_messages')
      .select('role, content')
      .eq('family_id', family_id)
      .order('created_at', { ascending: false })
      .limit(10);
    const chatHistory = (history ?? []).reverse();

    // ── System prompt ─────────────────────────────────────────────
    const systemPrompt = `You are the permanent private family AI for this family — warm, familiar, like a trusted member of the household who knows their history.

Today's date: ${today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}.

The following profile is authoritative and up to date. Never claim you don't know these facts if they appear below.

Family Name: ${family?.name}.
Family Created Date: ${family?.created_at}.
Family members: ${roster}.
Family Mission: ${familyCharter?.mission}.
Family Vision: ${familyCharter?.vision}.
Family Constitution: ${familyCharter?.constitution}.
Family Values: ${familyCharter?.values}.

Dietary restrictions (never suggest anything that conflicts with these):
${dietaryNotes}

This week's meal plan:
${mealPlanContext}

Upcoming events (next 7 days):
${eventsContext}

Open commitments:
${commitmentsContext}

Open chores:
${choresContext}

Additional relevant context from this family's stories, memories, and history:
${retrievedContext || 'No additional relevant history found for this question.'}

You have tools available to take action on the family's behalf — creating events, commitments, chores, rescheduling, notifying members, or marking tasks done. When the user mentions something actionable, use the right tool. Notifications and marking tasks complete happen immediately. Everything else (creating or rescheduling events, commitments, chores, flagging conflicts) is proposed to the family for approval — so feel free to propose freely, it will always be reviewed before anything changes. Always give a natural spoken reply in addition to any tool calls.

${currentUserIsEditor
  ? 'This user can approve calendar, commitment, and chore changes.'
  : 'This user is not an admin or coparent — they cannot approve calendar, commitment, or chore changes. If they ask for something like that, let them know an admin needs to approve it, and you can still flag it for later, but don\'t imply they can act on it directly.'}

If asked about something unrelated to this family, gently steer the conversation back. Don't be preachy about it, just redirect warmly and briefly.`;

    // ── Call DeepSeek with tools ─────────────────────────────────
    const deepseekRes = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${DEEPSEEK_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          ...chatHistory.map((h) => ({ role: h.role, content: h.content })),
          { role: 'user', content: message },
        ],
        tools: currentUserIsEditor ? TOOLS : TOOLS.filter((t) => AUTO_EXECUTE_TOOLS.has(t.function.name)),
        tool_choice: 'auto',
        temperature: 0.7,
      }),
    });

    if (!deepseekRes.ok) throw new Error(`DeepSeek failed: ${await deepseekRes.text()}`);
    const deepseekData = await deepseekRes.json();
    const choice = deepseekData.choices[0];
    const assistantReply = choice.message.content ?? '';
    const toolCalls = choice.message.tool_calls ?? [];

    const pendingActions: any[] = [];
    const autoExecutedSummaries: string[] = [];

    for (const call of toolCalls) {
      let args: any;
      try {
        args = JSON.parse(call.function.arguments);
      } catch {
        continue;
      }
      const actionType = call.function.name;

      if (AUTO_EXECUTE_TOOLS.has(actionType)) {
        if (actionType === 'notify_member') {
          const target = (members ?? []).find((m) => m.name.toLowerCase() === args.member_name?.toLowerCase());
          if (target?.id) {
            const { data: targetMember } = await supabase.from('member').select('user_id').eq('id', target.id).single();
            if (targetMember?.user_id) {
              await sendPush(family_id, targetMember.user_id, args.title, args.body);
              autoExecutedSummaries.push(`Notified ${target.name}: "${args.title}"`);
            }
          }
        } else if (actionType === 'mark_task_complete') {
          const table = args.task_type === 'chore' ? 'chore' : 'commitment';
          const { data: matchedTask } = await supabase
            .from(table)
            .select('id, title')
            .eq('family_id', family_id)
            .ilike('title', `%${args.task_title}%`)
            .neq('status', 'completed')
            .limit(1)
            .maybeSingle();

          if (matchedTask) {
            await supabase.from(table).update({ status: 'completed' }).eq('id', matchedTask.id);
            autoExecutedSummaries.push(`Marked "${matchedTask.title}" as complete`);
          }
        }
      } else {
        const summary = buildSummary(actionType, args);
        const { data: actionRow } = await supabase.from('ai_action').insert([{
          family_id,
          action_type: actionType,
          payload: args,
          summary,
          created_by_user_id: user_id,
        }]).select().single();
        if (actionRow) pendingActions.push(actionRow);
      }
    }

    const finalReplyText = assistantReply || (pendingActions.length > 0 || autoExecutedSummaries.length > 0
      ? "I've made some updates and suggestions below."
      : "I'm not sure how to help with that — could you rephrase?");

    const { data: insertedAssistantMsg } = await supabase
      .from('family_chat_messages')
      .insert([{ family_id, user_id: null, role: 'assistant', content: finalReplyText }])
      .select()
      .single();

    const assistantMsgId = insertedAssistantMsg?.id;

    if (assistantMsgId && pendingActions.length > 0) {
      await supabase.from('ai_action').update({ chat_message_id: assistantMsgId }).in('id', pendingActions.map((a) => a.id));
    }

    await recordAiUsage(supabase, family_id, entitlement.isIntro);

    return new Response(JSON.stringify({
      reply: finalReplyText,
      message_id: assistantMsgId,
      pending_actions: pendingActions,
      auto_executed: autoExecutedSummaries,
      was_intro: entitlement.isIntro ?? false, 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('family-ai-chat error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});