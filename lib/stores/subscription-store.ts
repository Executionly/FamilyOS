import { create } from 'zustand';
import { supabase } from '@/lib/_core/supabase';

interface SubscriptionState {
  tier: 'free' | 'premium';
  expiresAt: string | null;
  loading: boolean;
  fetchSubscription: (familyId: string) => Promise<void>;
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  tier: 'free',
  expiresAt: null,
  loading: false,

  fetchSubscription: async (familyId: string) => {
    set({ loading: true });
    try {
      const { data } = await supabase
        .from('family')
        .select('subscription_tier, subscription_expires_at')
        .eq('id', familyId)
        .single();

      set({
        tier: (data?.subscription_tier as 'free' | 'premium') ?? 'free',
        expiresAt: data?.subscription_expires_at ?? null,
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },
}));