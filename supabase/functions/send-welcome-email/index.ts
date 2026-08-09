// supabase/functions/send-welcome-email/index.ts
// Call this from the ready.tsx onboarding screen after createFamily() succeeds

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, familyName } = await req.json();

    if (!email || !familyName) {
      return new Response(
        JSON.stringify({ error: 'email and familyName are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#FFF8F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFF8F0;padding:32px 16px;">
    <tr>
      <td>
        <table width="600" align="center" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #FDE68A;max-width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#0F172A;padding:40px 32px;text-align:center;">
              <p style="color:#F59E0B;font-size:13px;font-weight:700;letter-spacing:2px;margin:0 0 8px;">FAMBOUND</p>
              <h1 style="color:#fff;font-size:28px;font-weight:800;margin:0 0 8px;">Welcome to the Family 🏡</h1>
              <p style="color:#94A3B8;font-size:15px;margin:0;">The ${familyName} family is ready to go.</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 32px;">
              <p style="color:#0F172A;font-size:16px;line-height:1.7;margin:0 0 24px;">
                You've just set up your family's command centre. Fambound is your AI Chief of Staff — built to reduce the mental load, align your household, and help you build the family life you actually want.
              </p>

              <p style="color:#0F172A;font-size:15px;font-weight:700;margin:0 0 12px;">Here's what to do next:</p>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #F1F5F9;">
                    <span style="font-size:20px;">📜</span>
                    <span style="color:#0F172A;font-size:14px;margin-left:12px;font-weight:600;">Build your Family Charter</span>
                    <p style="color:#64748B;font-size:13px;margin:4px 0 0 32px;">Define your family mission, values, and house rules with AI guidance — in under 15 minutes.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #F1F5F9;">
                    <span style="font-size:20px;">🗓</span>
                    <span style="color:#0F172A;font-size:14px;margin-left:12px;font-weight:600;">Run your first family meeting</span>
                    <p style="color:#64748B;font-size:13px;margin:4px 0 0 32px;">AI generates a personalised agenda. Run it together, capture commitments, get a summary.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 0;">
                    <span style="font-size:20px;">✅</span>
                    <span style="color:#0F172A;font-size:14px;margin-left:12px;font-weight:600;">Add your first commitments and chores</span>
                    <p style="color:#64748B;font-size:13px;margin:4px 0 0 32px;">Assign responsibilities, set due dates, and track follow-through across the whole family.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F8FAFC;padding:20px 32px;text-align:center;border-top:1px solid #E2E8F0;">
              <p style="color:#94A3B8;font-size:12px;margin:0;">
                Fambound™ · kinos.family<br/>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Fambound <info@fambound.com>',
        to: [email],
        subject: `Welcome to Fambound, ${familyName}! 🏡`,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Resend error: ${error}`);
    }

    const result = await response.json();
    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[send-welcome-email] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});