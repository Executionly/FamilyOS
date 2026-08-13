import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkVideoEntitlement } from '../_shared/entitlements.ts';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

serve(async (req) => {
  try {
    const { family_id } = await req.json();
    const result = await checkVideoEntitlement(supabase, family_id);
    return new Response(JSON.stringify(result), {
      status: result.allowed ? 200 : 402,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
     return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
});