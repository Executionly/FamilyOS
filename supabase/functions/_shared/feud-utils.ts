// Zero AI in any of this — per spec section 11 and 28, gameplay matching
// and scoring must be fully deterministic.

export function normalizeAnswer(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,!?'"]/g, '')
    .replace(/\s+/g, ' ');
}

export interface FeudAnswerRow {
  id: string;
  answer: string;
  aliases: string[];
  rank: number;
  points: number;
}

// Exact match against the answer text or any of its aliases, after
// normalization. Excludes already-revealed answers — caller passes only
// the unrevealed subset in for turn/steal matching.
export function matchAnswer(submitted: string, candidates: FeudAnswerRow[]): FeudAnswerRow | null {
  const normalized = normalizeAnswer(submitted);
  if (!normalized) return null;

  for (const candidate of candidates) {
    const candidateNormalized = [candidate.answer, ...(candidate.aliases ?? [])].map(normalizeAnswer);
    if (candidateNormalized.includes(normalized)) return candidate;
  }
  return null;
}

// Generalizes the spec's 1x/1x/2x/2x/3x table (for 5 rounds) to any round
// count: split into 3 roughly-even tiers, tier N gets Nx, capped at 3x.
// Verified against the spec's own example: n=5 -> tierSize=2 ->
// [1,1,2,2,3]. Matches exactly.
export function getRoundMultiplier(round: number, totalRounds: number): number {
  const tierSize = Math.ceil(totalRounds / 3);
  const tier = Math.ceil(round / tierSize);
  return Math.min(tier, 3);
}