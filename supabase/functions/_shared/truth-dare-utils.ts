

export type TdType = 'truth' | 'dare';
export type TdPhase = 'choosing' | 'performing' | 'game_complete';
export type AgeBand = 'toddler' | 'child' | 'preteen' | 'teen' | 'adult';
export type TdIntensity = 'mild' | 'mixed';

export interface TdPromptRow {
  id: string;
  type: TdType;
  content: string;
  age_bands: AgeBand[];
  intensity: 'mild' | 'spicy';
}

export interface TdPlayerStats {
  skips: number;
  rerolls: number;
  truths: number;
  dares: number;
  completed: number;
}

export type TdStats = Record<string, TdPlayerStats>;

/** Each player may skip this many turns per game. */
export const MAX_SKIPS_PER_PLAYER = 2;
/** Each turn allows one reroll of the prompt; each player may reroll this many times per game. */
export const MAX_REROLLS_PER_PLAYER = 3;
/** Minimum players needed to start. */
export const MIN_PLAYERS = 2;

export const emptyStats = (): TdPlayerStats => ({
  skips: 0,
  rerolls: 0,
  truths: 0,
  dares: 0,
  completed: 0,
});

export function getStats(stats: TdStats | null | undefined, participantId: string): TdPlayerStats {
  return { ...emptyStats(), ...(stats?.[participantId] ?? {}) };
}

/** Fisher-Yates shuffle (returns a new array). */
export function shuffle<T>(items: readonly T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Whose turn is it, given the ordered participant ids and the monotonic turn counter. */
export function participantAtTurn(order: readonly string[], turnIndex: number): string {
  if (order.length === 0) throw new Error('Turn order is empty');
  return order[turnIndex % order.length];
}

/**
 * Age bands a prompt must match for a given player.
 * Toddlers are too young for read-aloud prompts, so they get the "child" bank (an adult
 * reads it for them in real life). Unknown/null falls back to "child", the safest default.
 */
export function effectiveAgeBand(band: string | null | undefined): AgeBand {
  switch (band) {
    case 'toddler':
    case 'child':
      return 'child';
    case 'preteen':
    case 'teen':
    case 'adult':
      return band;
    default:
      return 'child';
  }
}

/**
 * Pick a random prompt for the player.
 * - matches the player's age band
 * - matches the session intensity (mild => only 'mild'; mixed => both)
 * - never repeats a prompt already used in this session
 * If every eligible prompt has already been used this session, repeats are allowed rather than
 * stalling the game. The intensity restriction is never relaxed (no spicy prompts in a mild game).
 */
export function pickPrompt(args: {
  prompts: readonly TdPromptRow[];
  type: TdType;
  ageBand: AgeBand;
  intensity: TdIntensity;
  usedIds: readonly string[];
  excludeId?: string | null;
}): TdPromptRow | null {
  const { prompts, type, ageBand, intensity, usedIds, excludeId } = args;
  const used = new Set(usedIds);

  const eligible = prompts.filter(
    (p) =>
      p.type === type &&
      p.age_bands.includes(ageBand) &&
      (intensity === 'mixed' || p.intensity === 'mild') &&
      p.id !== excludeId,
  );

  const fresh = eligible.filter((p) => !used.has(p.id));
  const pool = fresh.length > 0 ? fresh : eligible; // bank exhausted: allow repeats rather than stall
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Has the game reached its turn limit? `completedTurns` = turns finished so far. */
export function isGameOver(maxTurns: number | null | undefined, completedTurns: number): boolean {
  return maxTurns != null && completedTurns >= maxTurns;
}

/**
 * Light content screen for AI-generated prompts before they enter the bank.
 * This is a safety net, not a replacement for the generation prompt's own rules.
 */
const BLOCKED_PATTERNS: RegExp[] = [
  /\b(kiss|kissing|date|dating|crush|boyfriend|girlfriend|naked|nude|underwear|bra|sex\w*)\b/i,
  /\b(alcohol|beer|wine|drunk|cigarette|smok\w*|vape|vaping|drug\w*|weed)\b/i,
  /\b(hurt|punch|slap|fight|kill|die|death|suicid\w*|self[- ]harm)\b/i,
  /\b(jump from|climb on|climb up|roof|balcony|window ledge|knife|fire|matches|lighter|stove)\b/i,
  /\b(photo|selfie|video|record|post (it )?online|social media|snapchat|tiktok|instagram)\b/i,
  /\b(address|password|phone number|bank|salary|money you owe)\b/i,
  /\b(prank|call (a )?(stranger|neighbo))/i,
  /\b(eat|drink|lick|taste)\b.*\b(raw|spicy|hot sauce|chili|mustard|vinegar|soap|toothpaste|dog food|cat food)\b/i,
];

export function isPromptSafe(content: string): boolean {
  const text = content.trim();
  if (text.length < 10 || text.length > 300) return false;
  return !BLOCKED_PATTERNS.some((re) => re.test(text));
}