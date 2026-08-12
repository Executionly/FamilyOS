import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const REVENUECAT_WEBHOOK_SECRET = Deno.env.get('REVENUECAT_WEBHOOK_SECRET')!;

serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${REVENUECAT_WEBHOOK_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const body = await req.json();
    const event = body.event;
    // app_user_id is whatever you configure the client SDK to identify the family by —
    // recommend using family_id directly as RevenueCat's app_user_id, set at Purchases.logIn(familyId)
    const familyId = event.app_user_id;
    const eventType = event.type; // INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION, etc.

    if (['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE'].includes(eventType)) {
      await supabase.from('family').update({
        subscription_tier: 'premium',
        subscription_status: 'premium',
        subscription_expires_at: event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null,
        subscription_platform: event.store === 'APP_STORE' ? 'ios' : 'android',
        revenuecat_customer_id: familyId,
      }).eq('id', familyId);
    } else if (['EXPIRATION', 'CANCELLATION'].includes(eventType)) {
      // Note: CANCELLATION means they turned off auto-renew, not that access ends immediately —
      // they keep Premium until subscription_expires_at passes. Only EXPIRATION should actually downgrade.
      if (eventType === 'EXPIRATION') {
        await supabase.from('family').update({ subscription_tier: 'free' }).eq('id', familyId);
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err) {
    console.error('revenuecat-webhook error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});