import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface EmbedRequest {
  family_id: string;
  source_type: 'charter' | 'meeting' | 'story' | 'memory' | 'commitment';
  source_id: string;
  content: string;
}

async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI embedding failed: ${err}`);
  }

  const data = await res.json();
  return data.data[0].embedding;
}

// Simple chunking — split long content into ~1000 char chunks on sentence boundaries
function chunkContent(text: string, maxLen = 1000): string[] {
  if (text.length <= maxLen) return [text];

  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if ((current + sentence).length > maxLen && current) {
      chunks.push(current.trim());
      current = '';
    }
    current += sentence + ' ';
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks;
}

serve(async (req) => {
  try {
    const body: EmbedRequest = await req.json();
    const { family_id, source_type, source_id, content } = body;

    if (!family_id || !source_type || !source_id || !content) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    // Remove any existing chunks for this source (handles updates/re-embeds cleanly)
    await supabase
      .from('family_embeddings')
      .delete()
      .eq('source_id', source_id)
      .eq('source_type', source_type);

    const chunks = chunkContent(content);

    const rows = await Promise.all(
      chunks.map(async (chunk) => ({
        family_id,
        source_type,
        source_id,
        content: chunk,
        embedding: await getEmbedding(chunk),
      }))
    );

    const { error } = await supabase.from('family_embeddings').insert(rows);
    if (error) throw error;

    return new Response(JSON.stringify({ success: true, chunks_embedded: rows.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('embed-content error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});