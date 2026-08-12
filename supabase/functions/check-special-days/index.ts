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
    if (mode === 'advance') target.setDate(now.getDate() + 1); // tomorrow

    const targetMonth = target.getMonth() + 1;
    const targetDay = target.getDate();

    const { data: specialDays } = await supabase
      .from('special_day')
      .select('*, family:family_id(name)')
      .eq('month', targetMonth)
      .eq('day', targetDay);

    for (const sd of specialDays ?? []) {
      const { data: members } = await supabase
        .from('member')
        .select('id, name, user_id, date_of_birth')
        .eq('family_id', sd.family_id);

      const allFamilyUserIds = (members ?? []).map((m) => m.user_id).filter(Boolean) as string[];

      if (mode === 'advance') {
        await sendPushToMany(
          sd.family_id, allFamilyUserIds,
          'Coming up tomorrow',
          `${sd.title} is tomorrow!`
        );
        continue;
      }

      // mode === 'same_day'
      if (sd.type === 'birthday') {
        const celebrant = (members ?? []).find((m) => sd.related_member_ids?.includes(m.id));
        let ageLine = '';
        if (celebrant?.date_of_birth) {
          const dob = new Date(celebrant.date_of_birth);
          const age = target.getFullYear() - dob.getFullYear();
          ageLine = ` They're turning ${age}!`;
        }
        await sendPushToMany(
          sd.family_id, allFamilyUserIds,
          `🎉 Happy Birthday ${celebrant?.name ?? ''}!`,
          `Today is ${celebrant?.name ?? 'their'}'s birthday.${ageLine} Send your wishes!`
        );
      } else {
        await sendPushToMany(
          sd.family_id, allFamilyUserIds,
          `🎊 ${sd.title}`,
          `Today is ${sd.title}!`
        );
      }
    }

    return new Response(JSON.stringify({ processed: specialDays?.length ?? 0 }), { status: 200 });
  } catch (err) {
    console.error('check-special-days error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});