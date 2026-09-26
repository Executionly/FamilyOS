import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from "npm:@supabase/supabase-js@2";
import { checkAiEntitlement, recordAiUsage } from '../_shared/entitlements.ts';

const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface RequestBody {
  family_id: string;
  user_id: string;
}

// Same duplication pattern as family-ai-chat / family-ai-briefing (no shared
// permissions helper was provided, so matching their convention rather than
// assuming one exists).
function isAdminAccess(role?: string): boolean {
  if (!role) return false;
  const userRole = role.toLowerCase();
  return ['admin', 'father', 'mother', 'coparent'].includes(userRole);
}

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

serve(async (req) => {
  try {
    const jsonHeaders = { 'Content-Type': 'application/json' };

    const { family_id, user_id }: RequestBody = await req.json();
    if (!family_id || !user_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: jsonHeaders });
    }

    // ── Premium gate ────────────────────────────────────────────
    // Family Dynamics Intelligence is a premium-only layer (brief
    // section 14) — this is separate from, and in addition to, the
    // usage-quota entitlement check other AI features use.
    const { data: family } = await supabase
      .from('family')
      .select('name, subscription_tier')
      .eq('id', family_id)
      .single();

    if (!family) {
      return new Response(JSON.stringify({ error: 'Family not found' }), { status: 404, headers: jsonHeaders });
    }
    if (family.subscription_tier !== 'premium') {
      return new Response(JSON.stringify({ error: 'upgrade_required', upgrade_required: true }), { status: 402, headers: jsonHeaders });
    }

    const entitlement = await checkAiEntitlement(supabase, family_id);
    if (!entitlement.allowed) {
      return new Response(JSON.stringify({
        error: entitlement.reason,
        upgrade_required: entitlement.reason === 'upgrade_required',
        quota_exceeded: entitlement.reason === 'quota_exceeded',
      }), { status: 402, headers: jsonHeaders });
    }

    const { data: members } = await supabase
      .from('member')
      .select('id, name, role, age_band, temperament_type, productivity_energy, sharing_preference')
      .eq('family_id', family_id);

    // Only members who have completed both dimensions AND opted into
    // family-level sharing are used (brief section 21: private stays private).
    const shareableMembers = (members ?? []).filter(
      (m) => m.sharing_preference === 'family' && m.temperament_type && m.productivity_energy,
    );

    if (shareableMembers.length < 2) {
      return new Response(JSON.stringify({
        error: 'not_enough_profiles',
        message: 'At least two family members need to complete and share their profiles first.',
      }), { status: 200, headers: jsonHeaders });
    }

    const { data: charter } = await supabase
      .from('charter')
      .select('mission, vision, values')
      .eq('family_id', family_id)
      .single();

    // ── Cache check (Layer 2 cost control per brief section 15/24) ──
    const hashInput = JSON.stringify({
      members: shareableMembers
        .map((m) => ({ id: m.id, t: m.temperament_type, e: m.productivity_energy }))
        .sort((a, b) => a.id.localeCompare(b.id)),
      charter: { mission: charter?.mission, vision: charter?.vision, values: charter?.values },
    });
    const sourceHash = await sha256(hashInput);

    const { data: cached } = await supabase
      .from('family_intelligence')
      .select('*')
      .eq('family_id', family_id)
      .maybeSingle();

    if (cached && cached.source_hash === sourceHash) {
      return new Response(JSON.stringify({ intelligence: cached, cached: true }), { status: 200, headers: jsonHeaders });
    }

    // ── Build context ────────────────────────────────────────────
    const compositionLines = shareableMembers
      .map((m) => `${m.name} (${m.role}${m.age_band ? `, ${m.age_band}` : ''}): ${m.temperament_type} temperament, ${m.productivity_energy} energy`)
      .join('\n');

    const systemPrompt = `You are the Fambound Family Intelligence layer. You help families understand how their members' natural differences can become strengths, never defects. Core principle: different does not mean difficult — different can become complementary.

Family: ${family.name}

Family composition (temperament + productivity energy):
${compositionLines}

Family mission: ${charter?.mission ?? 'not yet set'}
Family vision: ${charter?.vision ?? 'not yet set'}
Family values: ${charter?.values ?? 'not yet set'}

Write in warm, exploratory, non-clinical language. Use phrasing like "your family may naturally..." rather than definitive claims. Never diagnose, never call any combination a problem, never rank family members against each other. Do not make claims about intelligence, mental health, ability, or moral character.

Return ONLY a valid JSON object, no markdown, no preamble, in this exact shape:
{
  "family_dynamics_summary": "2-3 sentences on what this specific combination of temperaments and energies may bring to the family",
  "family_strengths": ["3 to 5 short phrases naming potential collective strengths"],
  "communication_guidance": "1-2 sentences on how these family members may prefer to communicate differently",
  "decision_guidance": "1-2 sentences on how these differences may affect family decisions",
  "planning_guidance": "1-2 sentences on how these different energies may approach planning",
  "change_guidance": "1-2 sentences on how family members may respond differently when routines or circumstances change"
}`;

    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${DEEPSEEK_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'system', content: systemPrompt }],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      }),
    });

    if (!res.ok) throw new Error(`DeepSeek failed: ${await res.text()}`);
    const data = await res.json();
    const parsed = JSON.parse(data.choices[0].message.content || '{}');

    const { data: saved, error: saveError } = await supabase
      .from('family_intelligence')
      .upsert({
        family_id,
        source_hash: sourceHash,
        family_dynamics_summary: parsed.family_dynamics_summary ?? null,
        family_strengths: parsed.family_strengths ?? [],
        communication_guidance: parsed.communication_guidance ?? null,
        decision_guidance: parsed.decision_guidance ?? null,
        planning_guidance: parsed.planning_guidance ?? null,
        change_guidance: parsed.change_guidance ?? null,
        generated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (saveError) throw saveError;

      // Non-fatal: embed the report so family-ai-chat's retrieval can pull
    // it up later (e.g. "how do we work well together?").
    try {
      const embedText = [
        parsed.family_dynamics_summary,
        parsed.family_strengths?.length ? `Family strengths: ${parsed.family_strengths.join(', ')}.` : '',
        parsed.communication_guidance,
        parsed.decision_guidance,
        parsed.planning_guidance,
        parsed.change_guidance,
      ]
        .filter(Boolean)
        .join(' ');
 
      await supabase.functions.invoke('embed-content', {
        body: {
          family_id,
          source_type: 'family_intelligence',
          source_id: family_id,
          content: embedText,
        },
      });
    } catch (embedErr) {
      console.error('family-intelligence-ai embed error:', embedErr);
    }

    await recordAiUsage(supabase, family_id, entitlement.isIntro);

    return new Response(JSON.stringify({ intelligence: saved, cached: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('family-intelligence-ai error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});