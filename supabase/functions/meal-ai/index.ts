import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;
const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface MealAiRequest {
  family_id: string;
  week_start_date: string; // 'YYYY-MM-DD', a Monday
  notes?: string; // optional free-text steer, e.g. "keep it budget friendly this week"
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
    const { family_id, week_start_date, notes }: MealAiRequest = await req.json();

    if (!family_id || !week_start_date) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    // 1. Family's existing meal library — so the AI reuses real meals, doesn't invent random ones
    const { data: existingMeals } = await supabase
      .from('meal')
      .select('id, name, description, tags')
      .eq('family_id', family_id)
      .limit(50);

    // 2. Dietary restrictions — fetched directly, never left to retrieval. This must never be missed.
    const { data: members } = await supabase
      .from('member')
      .select('id, name, dietary_notes')
      .eq('family_id', family_id);

    const restrictions = (members ?? [])
      .filter((m) => m.dietary_notes?.trim())
      .map((m) => `${m.name}: ${m.dietary_notes}`)
      .join('\n') || 'None recorded.';

    // 3. Retrieval — past meal patterns/preferences mentioned anywhere in family history
    const queryText = `family meal preferences, favorite dishes, meals cooked ${notes ?? ''}`;
    const queryEmbedding = await getEmbedding(queryText);
    const { data: matches } = await supabase.rpc('match_family_embeddings', {
      query_embedding: queryEmbedding,
      match_family_id: family_id,
      match_count: 6,
    });
    const retrievedContext = (matches ?? []).map((m: { content: string }) => `- ${m.content}`).join('\n');

    const mealLibrary = (existingMeals ?? [])
      .map((m) => `- ${m.name}${m.tags?.length ? ` (${m.tags.join(', ')})` : ''}: ${m.description ?? ''}`)
      .join('\n') || 'No meals saved yet — feel free to suggest new ones.';

    const systemPrompt = `You are a meal planning assistant for a family, generating a weekly meal plan.

Family's existing meal library (prefer reusing these where sensible):
${mealLibrary}

Dietary restrictions — these are non-negotiable, never suggest a meal that conflicts with any of these:
${restrictions}

Relevant family history/preferences:
${retrievedContext || 'None found.'}

${notes ? `Additional request from the family: ${notes}` : ''}

Generate a full week's meal plan (Monday–Sunday) with breakfast, lunch, dinner, and a short list of approved snacks for each day. Respond ONLY as JSON, no preamble, in this exact shape:

{
  "days": [
    {
      "day_of_week": 0,
      "breakfast": { "name": "...", "description": "...", "ingredients": [{"name": "...", "quantity": 2, "unit": "cups"}] },
      "lunch": { ... same shape ... },
      "dinner": { ... same shape ... },
      "snacks": [{ "name": "...", "description": "..." }]
    }
    // ... day_of_week 0 through 6, 0 = Monday
  ]
}`;

    const deepseekRes = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${DEEPSEEK_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: 'Generate the plan.' }],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    if (!deepseekRes.ok) throw new Error(`DeepSeek failed: ${await deepseekRes.text()}`);
    const deepseekData = await deepseekRes.json();
    const plan = JSON.parse(deepseekData.choices[0].message.content);

    // Return the raw suggestion — client shows it for admin/coparent to review and save,
    // rather than writing directly to meal_plan/meal_plan_item unconfirmed.
    return new Response(JSON.stringify({ plan }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('meal-ai error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});