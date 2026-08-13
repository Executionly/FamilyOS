import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkStorageEntitlement } from '../_shared/entitlements.ts';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

serve(async (req) => {
  try {
    const { family_id, file_size_bytes } = await req.json();

    const result = await checkStorageEntitlement(
      supabase,
      family_id,
      file_size_bytes
    );

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