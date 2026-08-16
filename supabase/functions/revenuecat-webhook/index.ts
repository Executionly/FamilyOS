import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const REVENUECAT_WEBHOOK_SECRET =
  Deno.env.get('REVENUECAT_WEBHOOK_SECRET')!;

interface RevenueCatEvent {
  id: string;
  type: string;
  app_user_id: string;
  original_app_user_id?: string;
  expiration_at_ms?: number | null;
  transaction_id?: string;
  purchased_at_ms?: number | null;
  event_timestamp_ms?: number;
  store?: string;
  product_id?: string;
  environment?: string;
  entitlement_ids?: string[] | null;
}

interface RevenueCatWebhook {
  api_version: string;
  event: RevenueCatEvent;
}

// Add near the top of the file, after the interfaces

async function logSubscriptionHistory(params: {
  familyId: string;
  eventType: string;
  tier: string;
  status: string | null;
  productId?: string | null;
  platform: string | null;
  expiresAt: string | null;
}) {
  const { error } = await supabase.from('subscription_history').insert([{
    family_id: params.familyId,
    event_type: params.eventType,
    tier: params.tier,
    status: params.status,
    product_id: params.productId ?? null,
    platform: params.platform,
    expires_at: params.expiresAt,
  }]);

  if (error) {
    // Never let history logging failure block the actual subscription update —
    // this is a secondary audit trail, not the source of truth
    console.error('[revenuecat] Failed to log subscription history:', error);
  }
}

serve(async (req) => {
  // RevenueCat only sends POST requests
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // ---------------------------------------------------------
  // 1. Authenticate RevenueCat
  // ---------------------------------------------------------

  const authHeader = req.headers.get('Authorization');

  if (
    !authHeader ||
    authHeader !== `Bearer ${REVENUECAT_WEBHOOK_SECRET}`
  ) {
    console.error('[revenuecat] Unauthorized webhook request');

    return new Response('Unauthorized', {
      status: 401,
    });
  }

  try {
    // ---------------------------------------------------------
    // 2. Parse webhook
    // ---------------------------------------------------------

    const body: RevenueCatWebhook = await req.json();
    const event = body.event;

    if (!event) {
      return new Response(
        JSON.stringify({
          error: 'Missing event',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    }

    const {
      id: eventId,
      type: eventType,
      app_user_id: familyId,
      transaction_id,
      expiration_at_ms,
      store,
      product_id,
      environment,
    } = event;

    // Idempotency check — has this exact event already been processed?
    const { data: existing } = await supabase
      .from('revenuecat_webhook_event')
      .select('id')
      .eq('id', eventId)
      .maybeSingle();

    if (existing) {
      console.log(`[revenuecat] Duplicate event ${eventId} (${eventType}) — skipping`);
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[revenuecat] Webhook received', {
      eventId,
      eventType,
      familyId,
      productId: product_id,
      store,
      environment,
      expirationAt: expiration_at_ms
        ? new Date(expiration_at_ms).toISOString()
        : null,
    });

    // Record it BEFORE processing — if processing fails partway, at least we won't double-apply on retry
    const { error: logError } = await supabase.from('revenuecat_webhook_event').insert([{
      id: eventId,
      event_type: eventType,
      family_id: familyId,
      raw_payload: body,
    }]);

    if (logError) {
      // Insert failing on a duplicate primary key IS the idempotency check working as a race-condition backstop —
      // two near-simultaneous deliveries could both pass the SELECT check above before either INSERTs.
      if (logError.code === '23505') {
        console.log(`[revenuecat] Duplicate event ${eventId} caught by unique constraint — skipping`);
        return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
      }
      console.error('[revenuecat] Failed to log webhook event:', logError);
      // Don't throw here — logging failure shouldn't block processing a legitimate new event
    }

    if (!familyId) {
      console.error('[revenuecat] Missing app_user_id');

      return new Response(
        JSON.stringify({
          error: 'Missing app_user_id',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    }

    // ---------------------------------------------------------
    // 3. Determine platform
    // ---------------------------------------------------------

    let platform: 'ios' | 'android' | null = null;

    if (store === 'APP_STORE') {
      platform = 'ios';
    } else if (store === 'PLAY_STORE') {
      platform = 'android';
    }

    // RevenueCat can send TEST_STORE in sandbox/testing.
    // Don't blindly classify it as Android.
    if (store === 'TEST_STORE') {
      platform = null;
    }

    // ---------------------------------------------------------
    // 4. Calculate expiration
    // ---------------------------------------------------------

    const expiresAt = expiration_at_ms
      ? new Date(expiration_at_ms).toISOString()
      : null;

    // ---------------------------------------------------------
    // 5. Handle subscription events
    // ---------------------------------------------------------

    switch (eventType) {
      /**
       * New subscription
       */
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'UNCANCELLATION':
      case 'SUBSCRIPTION_EXTENDED': {
        const { error } = await supabase
          .from('family')
          .update({
            subscription_tier: 'premium',
            subscription_status: 'active',
            subscription_expires_at: expiresAt,
            subscription_platform: platform,
            revenuecat_customer_id: familyId,
            revenuecat_store_transaction_id: transaction_id ?? null,
          })
          .eq('id', familyId);

        if (error) {
          console.error(
            '[revenuecat] Failed to activate subscription:',
            error,
          );

          throw error;
        }

        await logSubscriptionHistory({
          familyId, eventType, tier: 'premium', status: 'active',
          productId: product_id, platform, expiresAt,
        });
        console.log(
          `[revenuecat] Family ${familyId} is premium`,
        );

        break;
      }

      /**
       * User cancelled auto-renewal.
       *
       * IMPORTANT:
       * They still have Premium until expiration.
       */
      case 'CANCELLATION': {
        const { error } = await supabase
          .from('family')
          .update({
            subscription_status: 'cancelled',
            subscription_expires_at: expiresAt,
            revenuecat_customer_id: familyId,
          })
          .eq('id', familyId);

        if (error) {
          console.error(
            '[revenuecat] Failed to update cancellation:',
            error,
          );

          throw error;
        }

        await logSubscriptionHistory({
          familyId, eventType, tier: 'premium', status: 'cancelled',
          productId: product_id, platform, expiresAt,
        });

        console.log(
          `[revenuecat] Family ${familyId} cancelled auto-renewal`,
        );

        break;
      }

      /**
       * Subscription actually ended.
       */
      case 'EXPIRATION': {
        const { error } = await supabase
          .from('family')
          .update({
            subscription_tier: 'free',
            subscription_status: 'expired',
            subscription_expires_at: expiresAt,
            revenuecat_customer_id: familyId,
          })
          .eq('id', familyId);

        if (error) {
          console.error(
            '[revenuecat] Failed to expire subscription:',
            error,
          );

          throw error;
        }

        await logSubscriptionHistory({
          familyId, eventType, tier: 'free', status: 'expired',
          productId: product_id, platform, expiresAt,
        });

        console.log(
          `[revenuecat] Family ${familyId} subscription expired`,
        );

        break;
      }

      /**
       * Payment problem.
       *
       * Don't immediately remove Premium.
       * RevenueCat can recover the subscription.
       */
      case 'BILLING_ISSUE': {
        const { error } = await supabase
          .from('family')
          .update({
            subscription_status: 'billing_issue',
            revenuecat_customer_id: familyId,
          })
          .eq('id', familyId);

        if (error) {
          console.error(
            '[revenuecat] Failed to update billing issue:',
            error,
          );

          throw error;
        }

        await logSubscriptionHistory({
          familyId, eventType, tier: 'premium', status: 'billing_issue',
          productId: product_id, platform, expiresAt,
        });

        console.log(
          `[revenuecat] Family ${familyId} has a billing issue`,
        );

        break;
      }

      /**
       * Product changed.
       *
       * RevenueCat notes that PRODUCT_CHANGE does not necessarily
       * mean the new subscription is effective immediately.
       *
       * The accompanying renewal/initial purchase event should
       * establish the active subscription state.
       */
      case 'PRODUCT_CHANGE': {
        console.log(
          `[revenuecat] Product changed for ${familyId}: ${product_id}`,
        );

        break;
      }

      /**
       * Non-renewing purchase.
       *
       * Only keep this if you're using non-renewing products.
       */
      case 'NON_RENEWING_PURCHASE': {
        const { error } = await supabase
          .from('family')
          .update({
            subscription_tier: 'premium',
            subscription_status: 'active',
            subscription_expires_at: expiresAt,
            subscription_platform: platform,
            revenuecat_customer_id: familyId,
          })
          .eq('id', familyId);

        if (error) {
          console.error(
            '[revenuecat] Failed to process non-renewing purchase:',
            error,
          );

          throw error;
        }

        await logSubscriptionHistory({
          familyId, eventType, tier: 'premium', status: 'active',
          productId: product_id, platform, expiresAt,
        });

        break;
      }

      /**
       * Google Play subscription paused.
       *
       * You may want to keep Premium until RevenueCat sends
       * EXPIRATION, depending on your desired UX.
       */
      case 'SUBSCRIPTION_PAUSED': {
        const { error } = await supabase
          .from('family')
          .update({
            subscription_status: 'paused',
            revenuecat_customer_id: familyId,
          })
          .eq('id', familyId);

        if (error) {
          console.error(
            '[revenuecat] Failed to update paused subscription:',
            error,
          );

          throw error;
        }

        await logSubscriptionHistory({
          familyId, eventType, tier: 'premium', status: 'paused',
          productId: product_id, platform, expiresAt,
        });

        break;
      }

      /**
       * Events we don't need to change subscription state for.
       */
      case 'TEST':
      case 'TRANSFER':
      case 'REFUND_REVERSED':
      case 'PRICE_INCREASE_CONSENT_REQUIRED':
      case 'PRICE_INCREASE_CONSENT_APPROVED': {
        console.log(
          `[revenuecat] Ignored event: ${eventType}`,
        );

        break;
      }
      case 'REFUND': {
        const { error } = await supabase
          .from('family')
          .update({
            subscription_tier: 'free',
            subscription_status: 'refunded',
            revenuecat_customer_id: familyId,
          })
          .eq('id', familyId);

        if (error) {
          console.error('[revenuecat] Failed to process refund:', error);
          throw error;
        }

        await logSubscriptionHistory({
          familyId, eventType, tier: 'free', status: 'refunded',
          productId: product_id, platform, expiresAt,
        });

        console.log(`[revenuecat] Family ${familyId} refunded, downgraded`);
        break;
      }

      /**
       * Future RevenueCat events.
       *
       * Don't fail the webhook simply because RevenueCat adds
       * a new event type.
       */
      default: {
        console.log(
          `[revenuecat] Unhandled event type: ${eventType}`,
        );

        break;
      }
    }

    // ---------------------------------------------------------
    // 6. Respond successfully
    // ---------------------------------------------------------

    return new Response(
      JSON.stringify({
        received: true,
        event_id: eventId,
        event_type: eventType,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (err) {
    console.error('[revenuecat] Webhook error:', err);

    return new Response(
      JSON.stringify({
        error: err instanceof Error
          ? err.message
          : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }
});