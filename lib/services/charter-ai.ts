// lib/services/charter-ai.ts
// Generates Foundation Builder content using DeepSeek.
// Same pattern as lib/services/meeting-ai.ts — uses invokeLLM directly.
// All functions work from what the user has already typed in the screen fields.

import { invokeLLM } from '@/lib/_core/llm';

// ── Mission & Vision ──────────────────────────────────────────

export interface MissionVisionResult {
  mission: string;
  vision: string;
}

export async function generateMissionVision(
  familyName: string,
  context: {
    currentMission?: string; // what the user has typed so far (can be empty)
    currentVision?: string;
  }
): Promise<MissionVisionResult> {
  const userContext = [
    context.currentMission?.trim()
      ? `What the family has written for their mission so far: "${context.currentMission}"`
      : '',
    context.currentVision?.trim()
      ? `What the family has written for their vision so far: "${context.currentVision}"`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  const response = await invokeLLM({
    model: 'deepseek-chat',
    maxTokens: 500,
    responseFormat: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You are a warm, expert family coach helping families define their identity and purpose. Write in plain, heartfelt language — not corporate jargon. Respond ONLY with valid JSON, no markdown, no backticks.',
      },
      {
        role: 'user',
        content: `Generate a family mission and vision for the ${familyName} family.

${userContext || 'The family has not written anything yet — generate something warm and universal that most families can relate to.'}

Rules:
- Mission: 1-2 sentences, present tense, starts with "We" or "The ${familyName} family". Captures what the family does and stands for daily.
- Vision: 1-2 sentences, future tense, aspirational. Paints a picture of what the family is building toward.
- If the user has written something, refine and improve it — don't ignore what they wrote.
- Warm, personal tone — not generic corporate language.

Return ONLY valid JSON:
{
  "mission": "string",
  "vision": "string"
}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error('Empty response from AI');
  }

  const cleaned = content.replace(/```json|```/g, '').trim();

  let parsed: MissionVisionResult;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Failed to parse mission/vision JSON: ${cleaned.slice(0, 200)}`);
  }

  if (!parsed.mission || !parsed.vision) {
    throw new Error('AI response missing mission or vision');
  }

  return parsed;
}

// ── Core Values ───────────────────────────────────────────────

export interface ValuesResult {
  values: string[]; // plain string names — matches what the store expects
}

export async function generateFamilyValues(
  familyName: string,
  context: {
    currentValues?: string[]; // values the user has already added
    mission?: string;          // mission if already saved
  }
): Promise<ValuesResult> {
  const existingValues =
    context.currentValues?.length
      ? `Values the family has already chosen: ${context.currentValues.join(', ')}`
      : '';

  const missionContext = context.mission?.trim()
    ? `Family Mission: "${context.mission}"`
    : '';

  const response = await invokeLLM({
    model: 'deepseek-chat',
    maxTokens: 600,
    responseFormat: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You are a warm family coach helping families discover their core values. Values should feel genuine and personal. Respond ONLY with valid JSON, no markdown, no backticks.',
      },
      {
        role: 'user',
        content: `Suggest 8 core values for the ${familyName} family.

${missionContext}
${existingValues}

Rules:
- Suggest exactly 8 values as single words or short phrases (e.g. "Integrity", "Joyful Living", "Courage")
- Do NOT repeat any values the family has already chosen
- Make them feel meaningful and personal — not just a generic list
- No religious or political assumptions

Return ONLY valid JSON:
{
  "values": ["string", "string", "string", "string", "string", "string", "string", "string"]
}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error('Empty response from AI');
  }

  const cleaned = content.replace(/```json|```/g, '').trim();

  let parsed: ValuesResult;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Failed to parse values JSON: ${cleaned.slice(0, 200)}`);
  }

  if (!parsed.values || !Array.isArray(parsed.values) || parsed.values.length === 0) {
    throw new Error('AI response missing values array');
  }

  return parsed;
}

// ── Constitution ──────────────────────────────────────────────

export interface ConstitutionResult {
  constitution: string;
}

export async function generateConstitution(
  familyName: string,
  context: {
    currentConstitution?: string; // what the user has typed so far
    mission?: string;
    values?: string[];
  }
): Promise<ConstitutionResult> {
  const missionLine = context.mission?.trim()
    ? `Family Mission: "${context.mission}"`
    : '';

  const valuesLine = context.values?.length
    ? `Family Values: ${context.values.join(', ')}`
    : '';

  const draftLine = context.currentConstitution?.trim()
    ? `What the family has written so far:\n${context.currentConstitution}`
    : '';

  const response = await invokeLLM({
    model: 'deepseek-chat',
    maxTokens: 1000,
    responseFormat: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You are a warm family coach helping families write their family constitution — simple, meaningful shared agreements. Write in plain language a family would actually use. Respond ONLY with valid JSON, no markdown, no backticks.',
      },
      {
        role: 'user',
        content: `Write a family constitution for the ${familyName} family.

${missionLine}
${valuesLine}
${draftLine || 'The family has not written anything yet.'}

Rules:
- Write 8-12 clear, simple agreements as numbered statements
- Each statement starts with "We" — a shared commitment
- If the family has written a draft, refine and expand it — don't ignore it
- Cover: how they treat each other, resolve conflict, spend time together, communicate, and grow
- Warm and personal tone, not legalistic
- Format as a clean numbered list

Return ONLY valid JSON:
{
  "constitution": "1. We ...\\n2. We ...\\n3. We ..."
}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error('Empty response from AI');
  }

  const cleaned = content.replace(/```json|```/g, '').trim();

  let parsed: ConstitutionResult;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Failed to parse constitution JSON: ${cleaned.slice(0, 200)}`);
  }

  if (!parsed.constitution) {
    throw new Error('AI response missing constitution');
  }

  return parsed;
}