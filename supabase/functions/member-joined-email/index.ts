// supabase/functions/member-joined-email/index.ts
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface Payload {
  family_id: string;
  new_member_name: string;
  new_member_role: string;
}

serve(async (req) => {
  try {
    const { family_id, new_member_name, new_member_role }: Payload = await req.json();

    if (!family_id || !new_member_name) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    const { data: family } = await supabase.from('family').select('name').eq('id', family_id).single();

    const { data: admins } = await supabase
    .from('member')
    .select('name, user_id')
    .eq('family_id', family_id)
    .in('role', ['admin', 'mother', 'father', 'coparent'])
    .eq('has_login', true)
    .not('user_id', 'is', null);

    if (!admins || admins.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    const adminUserIds = admins.map((a) => a.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', adminUserIds);

    const emails = (profiles ?? []).map((p) => p.email).filter(Boolean);
    if (emails.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Fambound <info@fambound.com>', // match your existing sender
        to: emails,
        subject: `${new_member_name} joined ${family?.name ?? 'your family'} on Fambound`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #0a7ea4;">${new_member_name} just joined ${family?.name ?? 'your family'}</h2>
            <p>They signed up with their member code and are now part of your family as a <strong>${new_member_role}</strong>.</p>
            <p style="color: #6b7280; font-size: 13px;">You're receiving this because you're an admin of this family on Fambound.</p>
          </div>
        `,
      }),
    });

    return new Response(JSON.stringify({ sent: emails.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('member-joined-email error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});