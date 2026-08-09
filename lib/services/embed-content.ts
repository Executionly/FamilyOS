import { supabase } from "../_core/supabase";


type SourceType = 'charter' | 'meeting' | 'story' | 'memory' | 'commitment' | 'event' | 'timeline_event' | 'chore' | 'member' | 'meal' | 'meal_plan';

export async function embedContent(params: {
  family_id: string;
  source_type: SourceType;
  source_id: string;
  content: string;
}) {
  try {
    const { error } = await supabase.functions.invoke('embed-content', {
      body: params,
    });
    if (error) console.error('embedContent failed:', error);
  } catch (err) {
    // Non-fatal — don't block the user's save flow if embedding fails
    console.error('embedContent error:', err);
  }
}