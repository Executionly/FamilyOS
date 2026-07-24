import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY')!;
const APP_URL = Deno.env.get('APP_URL') || 'https://kinos.family';

async function generateAIInsight(activitySummary: string): Promise<string> {
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      max_tokens: 150,
      messages: [
        {
          role: 'system',
          content: 'You are FamilyOS, a warm and encouraging AI Family Chief of Staff. Write a single short, encouraging insight (2-3 sentences max) for a family based on their weekly activity data. Be specific, positive, and actionable. No generic platitudes.',
        },
        {
          role: 'user',
          content: `Family activity this week:\n${activitySummary}\n\nWrite one short AI insight for the family administrator.`,
        },
      ],
    }),
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || 'Keep up the great work this week!';
}

async function sendEmail(to: string, subject: string, html: string) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Avertune <info@avertune.com>',
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend error: ${error}`);
  }

  return response.json();
}

function buildWeeklyEmailHTML(data: {
  familyName: string;
  weekRange: string;
  completedTasks: number;
  totalTasks: number;
  eventsAttended: number;
  meetingsHeld: number;
  choresCompleted: number;
  upcomingEvents: Array<{ title: string; date: string }>;
  aiInsight: string;
}): string {
  const { familyName, weekRange, completedTasks, totalTasks, eventsAttended,
    meetingsHeld, choresCompleted, upcomingEvents, aiInsight } = data;

  const followThroughRate = totalTasks > 0
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0;

  const upcomingList = upcomingEvents.length > 0
    ? upcomingEvents.map((e) => `<li style="margin-bottom:4px;">${e.title} — <strong>${e.date}</strong></li>`).join('')
    : '<li>No upcoming events scheduled</li>';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Weekly Family Summary</title>
</head>
<body style="margin:0;padding:0;background:#FFF8F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFF8F0;padding:32px 16px;">
    <tr>
      <td>
        <table width="600" align="center" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #FDE68A;max-width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#0F172A;padding:32px;text-align:center;">
              <p style="color:#F59E0B;font-size:13px;font-weight:700;letter-spacing:2px;margin:0 0 8px;">FAMILYOS™</p>
              <h1 style="color:#fff;font-size:24px;font-weight:800;margin:0 0 8px;">Weekly Family Summary</h1>
              <p style="color:#94A3B8;font-size:14px;margin:0;">The ${familyName} Family · ${weekRange}</p>
            </td>
          </tr>

          <!-- AI Insight -->
          <tr>
            <td style="padding:24px 32px;background:#FFFBEB;border-bottom:1px solid #FDE68A;">
              <p style="color:#92400E;font-size:12px;font-weight:700;letter-spacing:1px;margin:0 0 8px;">✨ AI FAMILY INSIGHT</p>
              <p style="color:#0F172A;font-size:15px;line-height:1.6;margin:0;">${aiInsight}</p>
            </td>
          </tr>

          <!-- Stats -->
          <tr>
            <td style="padding:32px;">
              <p style="color:#0F172A;font-size:16px;font-weight:700;margin:0 0 16px;">This Week at a Glance</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="padding:0 8px 16px 0;">
                    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:16px;text-align:center;">
                      <p style="font-size:28px;font-weight:800;color:#F59E0B;margin:0 0 4px;">${completedTasks}/${totalTasks}</p>
                      <p style="font-size:12px;color:#64748B;margin:0;">Commitments Done</p>
                      <p style="font-size:11px;color:#F59E0B;font-weight:700;margin:4px 0 0;">${followThroughRate}% follow-through</p>
                    </div>
                  </td>
                  <td width="50%" style="padding:0 0 16px 8px;">
                    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:16px;text-align:center;">
                      <p style="font-size:28px;font-weight:800;color:#F59E0B;margin:0 0 4px;">${choresCompleted}</p>
                      <p style="font-size:12px;color:#64748B;margin:0;">Chores Completed</p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="padding:0 8px 0 0;">
                    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:16px;text-align:center;">
                      <p style="font-size:28px;font-weight:800;color:#F59E0B;margin:0 0 4px;">${meetingsHeld}</p>
                      <p style="font-size:12px;color:#64748B;margin:0;">Family Meetings</p>
                    </div>
                  </td>
                  <td width="50%" style="padding:0 0 0 8px;">
                    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:16px;text-align:center;">
                      <p style="font-size:28px;font-weight:800;color:#F59E0B;margin:0 0 4px;">${eventsAttended}</p>
                      <p style="font-size:12px;color:#64748B;margin:0;">Events This Week</p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Upcoming -->
          <tr>
            <td style="padding:0 32px 32px;">
              <p style="color:#0F172A;font-size:16px;font-weight:700;margin:0 0 12px;">Coming Up Next Week</p>
              <ul style="margin:0;padding-left:20px;color:#475569;font-size:14px;line-height:1.8;">
                ${upcomingList}
              </ul>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:0 32px 32px;text-align:center;">
              <a href="${APP_URL}" style="display:inline-block;background:#F59E0B;color:#fff;font-weight:700;font-size:14px;padding:14px 32px;border-radius:10px;text-decoration:none;">
                Open FamilyOS →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F8FAFC;padding:20px 32px;text-align:center;border-top:1px solid #E2E8F0;">
              <p style="color:#94A3B8;font-size:12px;margin:0;">
                You're receiving this because you're the family administrator of the ${familyName} family on FamilyOS™.<br/>
                <a href="${APP_URL}/notification-preferences" style="color:#F59E0B;">Manage email preferences</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const nextWeekEnd = new Date(now);
    nextWeekEnd.setDate(now.getDate() + 7);

    const weekRange = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    // Get all families with email_weekly_summary enabled
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('user_id, family_id')
      .eq('email_enabled', true)
      .eq('email_weekly_summary', true);

    if (!prefs || prefs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let sent = 0;

    for (const pref of prefs) {
      try {
        // Get user email
        const { data: { user } } = await supabase.auth.admin.getUserById(pref.user_id);
        if (!user?.email) continue;

        // Get family name
        const { data: family } = await supabase
          .from('family')
          .select('name')
          .eq('id', pref.family_id)
          .single();

        if (!family) continue;

        // Query this week's activity
        const [commitmentsRes, choresRes, meetingsRes, eventsRes, upcomingRes] = await Promise.all([
          supabase.from('commitment')
            .select('status')
            .eq('family_id', pref.family_id)
            .gte('created_at', weekStart.toISOString()),

          supabase.from('chore')
            .select('status')
            .eq('family_id', pref.family_id)
            .eq('status', 'completed')
            .gte('updated_at', weekStart.toISOString()),

          supabase.from('meeting')
            .select('id')
            .eq('family_id', pref.family_id)
            .eq('status', 'completed')
            .gte('created_at', weekStart.toISOString()),

          supabase.from('calendar_event')
            .select('id')
            .eq('family_id', pref.family_id)
            .gte('start_date', weekStart.toISOString())
            .lte('start_date', now.toISOString()),

          supabase.from('calendar_event')
            .select('title, start_date')
            .eq('family_id', pref.family_id)
            .gte('start_date', now.toISOString())
            .lte('start_date', nextWeekEnd.toISOString())
            .order('start_date', { ascending: true })
            .limit(5),
        ]);

        const allCommitments = commitmentsRes.data || [];
        const completedTasks = allCommitments.filter((c: any) => c.status === 'completed').length;
        const totalTasks = allCommitments.length;
        const choresCompleted = (choresRes.data || []).length;
        const meetingsHeld = (meetingsRes.data || []).length;
        const eventsAttended = (eventsRes.data || []).length;
        const upcomingEvents = (upcomingRes.data || []).map((e: any) => ({
          title: e.title,
          date: new Date(e.start_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        }));

        // Generate AI insight
        const activitySummary = `
- Commitments: ${completedTasks} of ${totalTasks} completed (${totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%)
- Chores completed: ${choresCompleted}
- Family meetings held: ${meetingsHeld}
- Events attended: ${eventsAttended}
- Upcoming events next week: ${upcomingEvents.length}
        `.trim();

        const aiInsight = await generateAIInsight(activitySummary);

        const html = buildWeeklyEmailHTML({
          familyName: family.name,
          weekRange,
          completedTasks,
          totalTasks,
          eventsAttended,
          meetingsHeld,
          choresCompleted,
          upcomingEvents,
          aiInsight,
        });

        await sendEmail(
          user.email,
          `📊 Your Weekly Family Summary — ${family.name}`,
          html
        );

        // Save as in-app notification too
        await supabase.from('notifications').insert({
          family_id: pref.family_id,
          user_id: pref.user_id,
          type: 'weekly_summary',
          priority: 'informational',
          title: 'Your weekly family summary is ready',
          body: aiInsight,
          action_label: 'View App',
          action_route: '/',
        });

        sent++;
      } catch (familyError) {
        console.error(`[weekly-summary] Failed for family ${pref.family_id}:`, familyError);
        // Continue to next family
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[weekly-summary-email] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});