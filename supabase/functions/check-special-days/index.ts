import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

async function sendPushToMany(familyId: string, userIds: string[], title: string, body: string) {
  for (const userId of userIds) {
    try {
      await supabase.functions.invoke('send-push', {
        body: { family_id: familyId, user_id: userId, type: 'special_day', priority: 'informational', title, body },
      });
    } catch (err) {
      console.error('sendPush error:', err);
    }
  }
}

serve(async (req) => {
  try {
    const { mode } = await req.json(); // 'advance' | 'same_day'

    const now = new Date();
    const target = new Date(now);
    if (mode === 'advance') target.setDate(now.getDate() + 1);
    const targetDateStr = target.toISOString().split('T')[0];

    // The DB does the matching now — this only ever returns events that ACTUALLY occur on target_date,
    // not every recurring event across every family
    const { data: matchingEvents, error } = await supabase.rpc('get_events_occurring_on', {
      target_date: targetDateStr,
    });
    if (error) throw error;

    let processed = 0;

    for (const evt of matchingEvents ?? []) {
      const { data: members } = await supabase
        .from('member')
        .select('id, name, user_id, date_of_birth')
        .eq('family_id', evt.family_id);

      const allFamilyUserIds = (members ?? []).map((m) => m.user_id).filter(Boolean) as string[];
      if (allFamilyUserIds.length === 0) continue;

      if (mode === 'advance') {
        await sendPushToMany(evt.family_id, allFamilyUserIds, 'Coming up tomorrow', `${evt.title} is tomorrow!`);
        processed++;
        continue;
      }

      if (evt.category === 'birthday') {
        const celebrant = (members ?? []).find((m) => evt.related_member_ids?.includes(m.id));
        let ageLine = '';
        if (celebrant?.date_of_birth) {
          const dob = new Date(celebrant.date_of_birth);
          const age = target.getFullYear() - dob.getFullYear();
          ageLine = ` They're turning ${age}!`;
        }
        await sendPushToMany(
          evt.family_id, allFamilyUserIds,
          `🎉 Happy Birthday ${celebrant?.name ?? ''}!`,
          `Today is ${celebrant?.name ?? 'their'}'s birthday.${ageLine} Send your wishes!`
        );
      } else {
        await sendPushToMany(evt.family_id, allFamilyUserIds, `🎊 ${evt.title}`, `Today is ${evt.title}!`);
      }
      processed++;
    }

    return new Response(JSON.stringify({ processed, matched_events: matchingEvents?.length ?? 0 }), { status: 200 });
  } catch (err) {
    console.error('check-special-days error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});