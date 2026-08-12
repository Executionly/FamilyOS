import { create } from 'zustand';
import { supabase } from '@/lib/_core/supabase';

interface SubscriptionState {
  tier: 'free' | 'premium';
  expiresAt: string | null;
  loading: boolean;
  fetchSubscription: (familyId: string) => Promise<void>;
  pollUntilPremium: (familyId: string, maxAttempts?: number) => Promise<boolean>;

  aiIntroUsed: boolean;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  tier: 'free',
  expiresAt: null,
  loading: false,
  aiIntroUsed: false,
  
  fetchSubscription: async (familyId: string) => {
    set({ loading: true });
    try {
      const { data } = await supabase
        .from('family')
        .select('subscription_tier, subscription_expires_at,ai_intro_used')
        .eq('id', familyId)
        .single();

      set({
        tier: (data?.subscription_tier as 'free' | 'premium') ?? 'free',
        expiresAt: data?.subscription_expires_at ?? null,
        loading: false,
        aiIntroUsed: data?.ai_intro_used ?? false,
      });
    } catch {
      set({ loading: false });
    }
  },

  // Polls with backoff until the webhook has landed and tier flips to premium,
  // or gives up after maxAttempts. Returns true if it confirmed premium, false if it timed out.
  pollUntilPremium: async (familyId: string, maxAttempts = 6): Promise<boolean> => {
    const delays = [1000, 1500, 2000, 3000, 4000, 5000]; // ~16.5s total worst case

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((r) => setTimeout(r, delays[attempt] ?? 5000));

      const { data } = await supabase
        .from('family')
        .select('subscription_tier, subscription_expires_at')
        .eq('id', familyId)
        .single();

      if (data?.subscription_tier === 'premium') {
        set({ tier: 'premium', expiresAt: data.subscription_expires_at ?? null });
        return true;
      }
    }

    // Give up — refresh once more to reflect whatever the actual current state is
    await get().fetchSubscription(familyId);
    return false;
  },
}));