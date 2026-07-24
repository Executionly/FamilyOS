import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  family_id: string;
  user_id?: string;         // null = send to all family members with login
  type: string;
  priority: 'critical' | 'important' | 'informational';
  title: string;
  body: string;
  action_label?: string;
  action_route?: string;
  data?: Record<string, unknown>;
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

    const payload: PushPayload = await req.json();
    const { family_id, user_id, type, priority, title, body, action_label, action_route, data } = payload;

    // 1. Save to notifications table (in-app notification center)
    const { error: insertError } = await supabase
      .from('notifications')
      .insert({
        family_id,
        user_id: user_id || null,
        type,
        priority,
        title,
        body,
        action_label: action_label || null,
        action_route: action_route || null,
        is_read: false,
      });

    if (insertError) throw insertError;

    // 2. Get push tokens for target users
    let membersQuery = supabase
      .from('member')
      .select('user_id')
      .eq('family_id', family_id)
      .eq('has_login', true)
      .not('user_id', 'is', null);

    if (user_id) {
      membersQuery = membersQuery.eq('user_id', user_id);
    }

    const { data: members, error: membersError } = await membersQuery;
    if (membersError) throw membersError;

    const userIds = members?.map((m) => m.user_id).filter(Boolean) || [];
    if (userIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No target users found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Check notification preferences — skip users who opted out
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('user_id, push_enabled, push_tasks, push_events, push_family_updates, push_ai_suggestions, push_security')
      .in('user_id', userIds);

    const prefsMap = new Map((prefs || []).map((p: any) => [p.user_id, p]));

    const prefKey = (t: string): string => {
      if (['task_assigned', 'task_due_soon', 'task_overdue', 'commitment_due', 'chore_overdue'].includes(t)) return 'push_tasks';
      if (['event_reminder', 'meeting_starting'].includes(t)) return 'push_events';
      if (['family_update'].includes(t)) return 'push_family_updates';
      if (['ai_suggestion', 'weekly_summary'].includes(t)) return 'push_ai_suggestions';
      if (['security_alert'].includes(t)) return 'push_security';
      return 'push_enabled';
    };

    const eligibleUserIds = userIds.filter((uid) => {
      const pref = prefsMap.get(uid);
      if (!pref) return true; // Default to enabled if no prefs row yet
      if (!pref.push_enabled) return false;
      return pref[prefKey(type)] !== false;
    });

    if (eligibleUserIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'All users opted out of this notification type' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Get Expo push tokens
    // Push tokens are stored in user metadata or a separate push_tokens table
    // Here we read from user metadata (set on the client when Expo registers the token)
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) throw usersError;

    const tokens: string[] = [];
    for (const u of users) {
      if (eligibleUserIds.includes(u.id)) {
        const token = u.user_metadata?.expo_push_token;
        if (token && token.startsWith('ExponentPushToken')) {
          tokens.push(token);
        }
      }
    }

    if (tokens.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No push tokens registered' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Send via Expo Push API
    const messages = tokens.map((to) => ({
      to,
      title,
      body,
      priority: priority === 'critical' ? 'high' : priority === 'important' ? 'high' : 'normal',
      sound: priority !== 'informational' ? 'default' : undefined,
      badge: 1,
      data: { type, action_route, ...data },
    }));

    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const expoResult = await expoResponse.json();

    return new Response(
      JSON.stringify({ success: true, sent: tokens.length, expo: expoResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[send-push] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});