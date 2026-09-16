import { create } from 'zustand';
import {
  getChallengeState, getFreeSuggestions, getPremiumSuggestions,
  acceptChallenge, completeChallenge, setChallengeCadence,
  type ChallengeCandidate, type FamilyChallenge,
  participateInChallenge,
  abandonChallenge,
} from '@/lib/services/challenge';
import { supabase } from '../_core/supabase';
import { useFamilyStore } from './family-store';

interface ChallengeState {
  loading: boolean;
  error: string | null;

  // 'active' = there's an in-progress challenge to complete
  // 'suggesting' = showing candidates to pick from
  // 'waiting' = not yet eligible for a new one
  // 'idle' = nothing loaded yet
  mode: 'idle' | 'active' | 'suggesting' | 'waiting' | 'celebrating';
  completedCount: number; // simple non-competitive tally, not a score

  activeChallenge: FamilyChallenge | null;
  candidates: ChallengeCandidate[];
  candidateIndex: number;
  candidateSource: 'template' | 'ai' | null;

  load: (familyId: string, isPremium: boolean) => Promise<void>;
  tryAnother: (familyId: string, isPremium: boolean) => Promise<void>;
  accept: (familyId: string) => Promise<void>;
  complete: (reflection?: string) => Promise<void>;
  participate: () => Promise<void>;
  skip: (familyId: string, isPremium: boolean) => Promise<void>;
  setCadence: (familyId: string, cadence: string) => Promise<void>;
}

export const useChallengeStore = create<ChallengeState>((set, get) => ({
  loading: false,
  error: null,
  mode: 'idle',
  activeChallenge: null,
  candidates: [],
  candidateIndex: 0,
  completedCount: 0,
  candidateSource: null,

  load: async (familyId, isPremium) => {
    set({ loading: true, error: null });
    try {
      const result = await getChallengeState(familyId);

      if (result.state === 'active') {
        set({ mode: 'active', activeChallenge: result.challenge, loading: false });
        return;
      }

      if (result.state === 'waiting') {
        set({ mode: 'waiting', loading: false });
        return;
      }

      // eligible — fetch first batch of candidates
      const candidates = isPremium
        ? await getPremiumSuggestions(familyId)
        : await getFreeSuggestions(familyId);

      set({
        mode: 'suggesting',
        candidates,
        candidateIndex: 0,
        candidateSource: isPremium ? 'ai' : 'template',
        loading: false,
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load challenge', loading: false });
    }
  },

  tryAnother: async (familyId, isPremium) => {
    const { candidates, candidateIndex } = get();

    // Still candidates left from this batch — just advance
    if (candidateIndex < candidates.length - 1) {
      set({ candidateIndex: candidateIndex + 1 });
      return;
    }

    // Exhausted the batch — fetch a fresh set (this is what costs AI quota for premium)
    set({ loading: true, error: null });
    try {
      const fresh = isPremium
        ? await getPremiumSuggestions(familyId)
        : await getFreeSuggestions(familyId);

      set({
        candidates: fresh,
        candidateIndex: 0,
        candidateSource: isPremium ? 'ai' : 'template',
        loading: false,
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to get another challenge', loading: false });
    }
  },

  accept: async (familyId) => {
    const { candidates, candidateIndex, candidateSource } = get();
    const chosen = candidates[candidateIndex];
    if (!chosen || !candidateSource) return;

    const { currentMember } = useFamilyStore.getState();
    if (!currentMember?.id) return;

    set({ loading: true, error: null });
    try {
      const challenge = await acceptChallenge(familyId, chosen, candidateSource, currentMember.id);
      set({ mode: 'active', activeChallenge: challenge, candidates: [], loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to accept challenge', loading: false });
    }
  },

  participate: async () => {
    const { activeChallenge } = get();
    const { currentMember } = useFamilyStore.getState();
    if (!activeChallenge || !currentMember?.id) return;

    try {
      const updated = await participateInChallenge(
        activeChallenge.id, currentMember.id, currentMember.name, activeChallenge.family_id
    );
      set({ activeChallenge: updated });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to join challenge' });
    }
  },

  skip: async (familyId: string, isPremium: boolean) => {
    const { activeChallenge } = get();
    if (!activeChallenge) return;

    set({ loading: true, error: null });
    try {
      await abandonChallenge(activeChallenge.id);
      await get().load(familyId, isPremium);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to skip challenge', loading: false });
    }
  },

  complete: async (reflection) => {
    const { activeChallenge } = get();
    if (!activeChallenge) return;

    const { family } = useFamilyStore.getState();
    const isPremium = family?.subscription_tier === 'premium';

    set({ loading: true, error: null });
    try {
      const updated = await completeChallenge(activeChallenge.id, activeChallenge.family_id, isPremium, reflection);

      const { count } = await supabase
        .from('family_challenge')
        .select('id', { count: 'exact', head: true })
        .eq('family_id', activeChallenge.family_id)
        .eq('status', 'completed');

      set({ activeChallenge: updated, mode: 'celebrating', completedCount: count ?? 0, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to mark complete', loading: false });
    }
  },

  setCadence: async (familyId, cadence) => {
    await setChallengeCadence(familyId, cadence);
  },
}));