import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkAiEntitlement, recordAiUsage } from '../_shared/entitlements.ts';

const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY')!;
const DEEPSEEK_API_URL = Deno.env.get('DEEPSEEK_API_URL') || 'https://api.deepseek.com/v1/chat/completions';
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

interface LlmProxyRequest {
  family_id: string;
  feature?: string;
  payload: Record<string, unknown>; // the fully-normalized DeepSeek payload, built client-side
}

serve(async (req) => {
  try {
    const { family_id, feature, payload }: LlmProxyRequest = await req.json();

    if (!family_id || !payload?.messages) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    const entitlement = await checkAiEntitlement(supabase, family_id, feature);
    if (!entitlement.allowed) {
      return new Response(JSON.stringify({
        error: entitlement.reason,
        upgrade_required: entitlement.reason === 'upgrade_required',
        quota_exceeded: entitlement.reason === 'quota_exceeded',
      }), { status: 402, headers: { 'Content-Type': 'application/json' } });
    }

    const deepseekRes = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!deepseekRes.ok) {
      const errText = await deepseekRes.text();
      return new Response(JSON.stringify({ error: `DeepSeek failed: ${deepseekRes.status} ${errText}` }), { status: 502 });
    }

    const data = await deepseekRes.json();
    await recordAiUsage(supabase, family_id, entitlement.isIntro,entitlement.featureTrial);

    return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('llm-proxy error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});