import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkAiEntitlement, recordAiUsage } from '../_shared/entitlements.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;
const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface ChallengeAiRequest {
  family_id: string;
}

async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
  });
  if (!res.ok) throw new Error(`OpenAI embedding failed: ${await res.text()}`);
  const data = await res.json();
  return data.data[0].embedding;
}

serve(async (req) => {
  try {
    const body = await req.json();
    const { action = 'suggest', family_id } = body;

    if (!family_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    const entitlement = await checkAiEntitlement(supabase, family_id);
    if (!entitlement.allowed) {
      return new Response(JSON.stringify({
        error: entitlement.reason,
        upgrade_required: entitlement.reason === 'upgrade_required',
        quota_exceeded: entitlement.reason === 'quota_exceeded',
      }), { status: 402 });
    }

    if (action === 'summarize_reflection') {
      const { reflection } = body;
      if (!reflection?.trim()) {
        return new Response(JSON.stringify({ summary: null }), { status: 200 });
      }

      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${DEEPSEEK_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: 'Summarize this family\'s reflection on a challenge they completed, in one warm, brief sentence. No preamble, just the sentence.' },
            { role: 'user', content: reflection },
          ],
          temperature: 0.5,
        }),
      });
      if (!res.ok) throw new Error(`DeepSeek failed: ${await res.text()}`);
      const data = await res.json();
      const summary = data.choices[0].message.content?.trim() ?? null;

      await recordAiUsage(supabase, family_id, entitlement.isIntro);
      return new Response(JSON.stringify({ summary }), { status: 200 });
    }

    // action === 'suggest' — select + personalize from the template pool

    const { data: charter } = await supabase
      .from('charter')
      .select('values, mission')
      .eq('family_id', family_id)
      .single();

    const { data: members } = await supabase
      .from('member')
      .select('name, role, age_band')
      .eq('family_id', family_id);

    const hasChildren = (members ?? []).some(
      (m) => m.role === 'child' || ['toddler', 'child', 'preteen'].includes(m.age_band ?? '')
    );

    const { data: openCommitments } = await supabase
      .from('commitment')
      .select('title')
      .eq('family_id', family_id)
      .eq('status', 'open')
      .limit(8);
    const priorities = (openCommitments ?? []).map((c) => c.title).join(', ') || 'None recorded.';

    const { data: family } = await supabase
      .from('family')
      .select('include_faith_challenges')
      .eq('id', family_id)
      .single();

    // Recent challenge history — avoid repeating what they've already done
    const { data: recentChallenges } = await supabase
      .from('family_challenge')
      .select('title, category, reflection')
      .eq('family_id', family_id)
      .order('created_at', { ascending: false })
      .limit(5);
    const historyContext = (recentChallenges ?? [])
      .map((c) => `- ${c.title} (${c.category})${c.reflection ? ` — family said: "${c.reflection}"` : ''}`)
      .join('\n') || 'No previous challenges yet.';

    const queryEmbedding = await getEmbedding('family interests, activities the family enjoys, family patterns and routines');
    const { data: matches } = await supabase.rpc('match_family_embeddings', {
      query_embedding: queryEmbedding,
      match_family_id: family_id,
      match_count: 6,
    });
    const retrievedContext = (matches ?? []).map((m: { content: string }) => `- ${m.content}`).join('\n');

    // Candidate pool — structured templates, cost-controlled: AI only rewords/picks, never invents from scratch
    let poolQuery = supabase
      .from('challenge_template')
      .select('id, title, description, category, estimated_minutes');
    if (!hasChildren) poolQuery = poolQuery.eq('requires_children', false);
    if (!family?.include_faith_challenges) poolQuery = poolQuery.neq('category', 'faith');
    const { data: pool } = await poolQuery.limit(50);

    const poolText = (pool ?? [])
      .map((t) => `[${t.id}] ${t.title} (${t.category}, ~${t.estimated_minutes ?? '?'} min): ${t.description}`)
      .join('\n');

    const systemPrompt = `You are a family engagement assistant. Pick the 3 best-fitting challenges from the template pool below for this specific family, and lightly personalize the wording to connect to what matters to them. Do not invent new challenges — only select and reword from the pool.

Family values: ${charter?.values?.join(', ') || 'Not set'}
Family mission: ${charter?.mission || 'Not set'}
Family has children: ${hasChildren}
Current priorities (open commitments): ${priorities}

Recent challenge history (avoid repeating the same ones):
${historyContext}

Relevant family history/patterns/interests:
${retrievedContext || 'None found.'}

Template pool (format: [id] title (category, minutes): description):
${poolText}

Respond ONLY as JSON, no preamble:
{
  "challenges": [
    { "template_id": "...", "title": "...", "description": "...", "category": "...", "estimated_minutes": 0 }
  ]
}
Keep category and estimated_minutes exactly as they appear in the pool for the template you picked.`;

    const deepseekRes = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${DEEPSEEK_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: 'Pick and personalize 3.' }],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    if (!deepseekRes.ok) throw new Error(`DeepSeek failed: ${await deepseekRes.text()}`);
    const deepseekData = await deepseekRes.json();
    const result = JSON.parse(deepseekData.choices[0].message.content);

    await recordAiUsage(supabase, family_id, entitlement.isIntro);

    return new Response(JSON.stringify({ challenges: result.challenges }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('family-challenge-ai error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});