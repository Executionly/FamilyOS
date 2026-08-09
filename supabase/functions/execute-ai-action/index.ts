// supabase/functions/execute-ai-action/index.ts
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

serve(async (req) => {
  try {
    const { action_id, decision, resolved_by_user_id, overrides } = await req.json();
    // overrides: { assigned_member_id?: string } — lets the client correct/set the assignee
    // before this executes, rather than trusting the AI's fuzzy name match alone

    const { data: action, error: fetchError } = await supabase.from('ai_action').select('*').eq('id', action_id).single();
    if (fetchError || !action) throw new Error('Action not found');

    if (decision === 'rejected') {
      await supabase.from('ai_action').update({ status: 'rejected', resolved_by_user_id, resolved_at: new Date().toISOString() }).eq('id', action_id);
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    const args = action.payload;

    async function resolveMemberId(name?: string) {
      if (!name) return null;
      const { data } = await supabase.from('member').select('id').eq('family_id', action.family_id).ilike('name', name).maybeSingle();
      return data?.id ?? null;
    }

    if (action.action_type === 'create_event') {
      await supabase.from('calendar_event').insert([{
        family_id: action.family_id, created_by: resolved_by_user_id,
        title: args.title, start_date: args.start_date, end_date: args.end_date,
        location: args.location ?? null, category: args.category ?? 'general',
      }]);
    } else if (action.action_type === 'reschedule_event') {
      const { data: existing } = await supabase
        .from('calendar_event').select('id').eq('family_id', action.family_id)
        .ilike('title', `%${args.event_title}%`).limit(1).maybeSingle();
      if (existing) {
        await supabase.from('calendar_event').update({ start_date: args.new_start_date, end_date: args.new_end_date }).eq('id', existing.id);
      }
    } else if (action.action_type === 'create_commitment') {
      const assignedTo = overrides?.assigned_member_id ?? (await resolveMemberId(args.assigned_to_member_name));
      await supabase.from('commitment').insert([{
        family_id: action.family_id, created_by: resolved_by_user_id,
        title: args.title, assigned_to: assignedTo,
        due_date: args.due_date ?? null, priority: args.priority ?? 'medium', status: 'open',
      }]);
    } else if (action.action_type === 'create_chore') {
      const assignedTo = overrides?.assigned_member_id ?? (await resolveMemberId(args.assigned_to_member_name));
      await supabase.from('chore').insert([{
        family_id: action.family_id, created_by: resolved_by_user_id,
        title: args.title, assigned_to: assignedTo,
        due_date: args.due_date ?? null, frequency: args.frequency ?? 'once', status: 'pending',
      }]);
    } else if (action.action_type === 'create_story') {
      const { data: story } = await supabase.from('story').insert([{
        family_id: action.family_id, created_by: resolved_by_user_id,
        title: args.title, content: args.content,
      }]).select().single();

      // Embed it like every other story, so the family AI can recall it later
      if (story) {
        await supabase.functions.invoke('embed-content', {
          body: {
            family_id: action.family_id,
            source_type: 'story',
            source_id: story.id,
            content: `${args.title}\n\n${args.content}`,
          },
        });
      }
    }

    await supabase.from('ai_action').update({
      status: 'executed', resolved_by_user_id, resolved_at: new Date().toISOString(),
    }).eq('id', action_id);

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});