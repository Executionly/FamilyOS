// lib/_core/llm.ts
// Reusable LLM wrapper for client-side calls (Expo/React Native).
// Routes through the llm-proxy Edge Function — DeepSeek API key never
// touches the client bundle, and entitlement/quota checks happen server-side.
// Import invokeLLM from here in any lib/service that needs AI calls.

import { supabase } from './supabase';

export type Role = 'system' | 'user' | 'assistant' | 'tool' | 'function';

export type TextContent = { type: 'text'; text: string };
export type ImageContent = { type: 'image_url'; image_url: { url: string; detail?: 'auto' | 'low' | 'high' } };
export type FileContent = { type: 'file_url'; file_url: { url: string; mime_type?: 'audio/mpeg' | 'audio/wav' | 'application/pdf' | 'audio/mp4' | 'video/mp4' } };
export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: 'function';
  function: { name: string; description?: string; parameters?: Record<string, unknown> };
};

export type ToolChoicePrimitive = 'none' | 'auto' | 'required';
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = { type: 'function'; function: { name: string } };
export type ToolChoice = ToolChoicePrimitive | ToolChoiceByName | ToolChoiceExplicit;

export type JsonSchema = { name: string; schema: Record<string, unknown>; strict?: boolean };
export type OutputSchema = JsonSchema;
export type ResponseFormat =
  | { type: 'text' }
  | { type: 'json_object' }
  | { type: 'json_schema'; json_schema: JsonSchema };

export type InvokeParams = {
  familyId: string; // ← new, required — this is what makes entitlement enforcement possible
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  feature?: string;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  model?: string;
  thinking?: Record<string, unknown>;
  reasoning?: Record<string, unknown>;
};

export type ToolCall = { id: string; type: 'function'; function: { name: string; arguments: string } };

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: { role: Role; content: string | Array<TextContent | ImageContent | FileContent>; tool_calls?: ToolCall[] };
    finish_reason: string | null;
  }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
};

export type UpgradeReason = 'ai_feature' | 'quota_exceeded' | null;

export class LlmUpgradeRequiredError extends Error {
  reason: UpgradeReason;
  constructor(reason: UpgradeReason) {
    super('AI feature requires an upgrade');
    this.reason = reason;
  }
}

// ── normalizers (unchanged from the original — still needed to build the payload) ──

const ensureArray = (value: MessageContent | MessageContent[]): MessageContent[] =>
  Array.isArray(value) ? value : [value];

const normalizeContentPart = (part: MessageContent): TextContent | ImageContent | FileContent => {
  if (typeof part === 'string') return { type: 'text', text: part };
  if (part.type === 'text') return part;
  if (part.type === 'image_url') return part;
  if (part.type === 'file_url') return part;
  throw new Error('Unsupported message content part');
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === 'tool' || role === 'function') {
    const content = ensureArray(message.content)
      .map((part) => (typeof part === 'string' ? part : JSON.stringify(part)))
      .join('\n');
    return { role, name, tool_call_id, content };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  if (contentParts.length === 1 && contentParts[0].type === 'text') {
    return { role, name, content: contentParts[0].text };
  }

  return { role, name, content: contentParts };
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): 'none' | 'auto' | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;
  if (toolChoice === 'none' || toolChoice === 'auto') return toolChoice;

  if (toolChoice === 'required') {
    if (!tools || tools.length === 0)
      throw new Error("tool_choice 'required' was provided but no tools were configured");
    if (tools.length > 1)
      throw new Error("tool_choice 'required' needs a single tool or specify the tool name explicitly");
    return { type: 'function', function: { name: tools[0].function.name } };
  }

  if ('name' in toolChoice) return { type: 'function', function: { name: toolChoice.name } };
  return toolChoice;
};

const normalizeResponseFormat = ({
  responseFormat, response_format, outputSchema, output_schema,
}: {
  responseFormat?: ResponseFormat; response_format?: ResponseFormat;
  outputSchema?: OutputSchema; output_schema?: OutputSchema;
}): { type: 'json_schema'; json_schema: JsonSchema } | { type: 'text' } | { type: 'json_object' } | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (explicitFormat.type === 'json_schema' && !explicitFormat.json_schema?.schema)
      throw new Error('responseFormat json_schema requires a defined schema object');
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;
  if (!schema.name || !schema.schema) throw new Error('outputSchema requires both name and schema');

  return {
    type: 'json_schema',
    json_schema: { name: schema.name, schema: schema.schema, ...(typeof schema.strict === 'boolean' ? { strict: schema.strict } : {}) },
  };
};

// ── retry logic — now wraps the Supabase Edge Function call, not a raw fetch ──

const RETRY_MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 500;
const RETRY_MAX_DELAY_MS = 15_000;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const computeBackoffDelay = (attempt: number): number => {
  const cap = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);
  return cap / 2 + Math.random() * (cap / 2);
};

// ── public API ────────────────────────────────────────────────

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const {
    familyId, messages, tools, toolChoice, tool_choice,
    outputSchema, output_schema, responseFormat, response_format,
    model, thinking, reasoning, maxTokens, max_tokens,
    feature
  } = params;

  if (!familyId) {
    throw new Error('invokeLLM requires familyId — every AI call must be tied to a family for entitlement checks');
  }

  const payload: Record<string, unknown> = {
    messages: messages.map(normalizeMessage),
  };

  if (model) payload.model = model;
  if (tools && tools.length > 0) payload.tools = tools;

  const normalizedToolChoice = normalizeToolChoice(toolChoice || tool_choice, tools);
  if (normalizedToolChoice) payload.tool_choice = normalizedToolChoice;

  const resolvedMaxTokens = max_tokens ?? maxTokens;
  if (typeof resolvedMaxTokens === 'number') payload.max_tokens = resolvedMaxTokens;

  if (thinking) payload.thinking = thinking;
  if (reasoning) payload.reasoning = reasoning;

  const normalizedResponseFormat = normalizeResponseFormat({ responseFormat, response_format, outputSchema, output_schema });
  if (normalizedResponseFormat) payload.response_format = normalizedResponseFormat;

  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_MAX_RETRIES; attempt++) {
    const { data, error } = await supabase.functions.invoke('llm-proxy', {
      body: { family_id: familyId, feature, payload },
    });

    if (!error) return data as InvokeResult;

    const status = (error as any)?.context?.status;

    // 402 — entitlement/quota block. Never retry this, surface immediately.
    if (status === 402) {
      let reason: UpgradeReason = 'ai_feature';
      try {
        const body = await (error as any)?.context?.json?.();
        if (body?.quota_exceeded) reason = 'quota_exceeded';
      } catch {
        // fall back to ai_feature
      }
      throw new LlmUpgradeRequiredError(reason);
    }

    lastError = error;
    if (attempt === RETRY_MAX_RETRIES) break;
    console.warn(`LLM retry ${attempt + 1}/${RETRY_MAX_RETRIES} after error`, error);
    await sleep(computeBackoffDelay(attempt));
  }

  throw lastError instanceof Error ? lastError : new Error('LLM request failed after exhausting retries');
}