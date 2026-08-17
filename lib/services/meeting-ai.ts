import { supabase } from '@/lib/_core/supabase';
import { invokeLLM, LlmUpgradeRequiredError } from '@/lib/_core/llm';

// ── Agenda generation ─────────────────────────────────────────

export interface AgendaItem {
  title: string;
  description: string;
  order: number;
}

export async function generateMeetingAgenda(
  familyId: string,
  duration: number,
): Promise<{ success: boolean; agenda: AgendaItem[]; upgradeReason?: 'ai_feature' | 'quota_exceeded' }> {

  const [charterRes, commitmentsRes] = await Promise.all([
    supabase
      .from('charter')
      .select('mission, values')
      .eq('family_id', familyId)
      .single(),
    supabase
      .from('commitment')
      .select('title, due_date')
      .eq('family_id', familyId)
      .eq('status', 'open')
      .order('due_date', { ascending: true }),
  ]);

  const charter = charterRes.data;
  const commitments = commitmentsRes.data || [];

  const charterContext = charter
    ? `Family Values: ${(charter.values as string[])?.join(', ') || 'Not set'}\nFamily Mission: ${charter.mission || 'Not set'}`
    : 'No family charter set yet.';

  const commitmentsList =
    commitments.length > 0
      ? commitments.map((c) => `- ${c.title} (Due: ${c.due_date || 'No date'})`).join('\n')
      : 'No open commitments.';

  let response;
  try {
    response = await invokeLLM({
      familyId,
      feature: 'meeting_agenda',
      model: 'deepseek-chat',
      maxTokens: 1500,
      responseFormat: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful family meeting facilitator. Generate structured agendas for family meetings. Respond ONLY with valid JSON — no markdown, no backticks, no extra text.',
        },
        {
          role: 'user',
          content: `Generate a structured agenda for a ${duration}-minute family meeting.

${charterContext}

Open Commitments to Review:
${commitmentsList}

Create a JSON agenda with these fixed sections (in order):
1. Wins & Gratitude (opening)
2. Values Check-In (reference the family's actual values)
3. Review Open Commitments (list the actual open ones)
4. Key Decisions (blank for family to fill)
5. New Commitments (blank for family to fill)
6. Closing

For each section provide a title and a brief description (1-2 sentences).
Return ONLY valid JSON:
{
  "items": [
    { "title": "string", "description": "string", "order": 1 }
  ]
}`,
        },
      ],
    });
  } catch (err) {
    if (err instanceof LlmUpgradeRequiredError) {
      return { success: false, agenda: [], upgradeReason: err.reason ?? 'ai_feature' };
    }
    console.error('generateMeetingAgenda error:', err);
    return { success: false, agenda: [] };
  }

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    return { success: false, agenda: [] };
  }

  const cleaned = content.replace(/```json|```/g, '').trim();

  let parsed: { items: AgendaItem[] };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return { success: false, agenda: [] };
  }

  if (!parsed.items || !Array.isArray(parsed.items)) {
    return { success: false, agenda: [] };
  }

  return { success: true, agenda: parsed.items };
}

// ── Meeting summary ───────────────────────────────────────────

export interface MeetingSummary {
  summary_text: string;
  key_decisions: string[];
  action_items: string[];
}

export async function generateMeetingSummary(
  familyId: string,
  meetingId: string,
  decisions: string[],
  commitments: string[],
): Promise<{ success: boolean; summary: MeetingSummary | null; upgradeReason?: 'ai_feature' | 'quota_exceeded' }> {
  let response;
  try {
    response = await invokeLLM({
      familyId,
      feature: 'meeting_summary',
      model: 'deepseek-chat',
      maxTokens: 1000,
      responseFormat: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful meeting summarizer. Create clear, concise meeting summaries. Respond ONLY with valid JSON — no markdown, no backticks, no extra text.',
        },
        {
          role: 'user',
          content: `Summarize a family meeting:

Key Decisions Made:
${decisions.length > 0 ? decisions.map((d) => `- ${d}`).join('\n') : '- None recorded'}

New Commitments:
${commitments.length > 0 ? commitments.map((c) => `- ${c}`).join('\n') : '- None recorded'}

Generate a concise summary (2-3 paragraphs) and extract the top 3 action items.
Return ONLY valid JSON:
{
  "summary_text": "string",
  "key_decisions": ["string"],
  "action_items": ["string"]
}`,
        },
      ],
    });
  } catch (err) {
    if (err instanceof LlmUpgradeRequiredError) {
      return { success: false, summary: null, upgradeReason: err.reason ?? 'ai_feature' };
    }
    console.error('generateMeetingSummary error:', err);
    return { success: false, summary: null };
  }

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    return { success: false, summary: null };
  }

  const cleaned = content.replace(/```json|```/g, '').trim();

  let parsed: MeetingSummary;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return { success: false, summary: null };
  }

  const { error } = await supabase.from('meeting_summary').insert({
    meeting_id: meetingId,
    summary_text: parsed.summary_text,
    key_decisions: parsed.key_decisions,
    action_items: parsed.action_items,
  });

  if (error) return { success: false, summary: null };

  return { success: true, summary: parsed };
}