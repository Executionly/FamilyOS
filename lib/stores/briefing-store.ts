import { PendingAction } from '@/lib/stores/family-chat-store';
import { create } from 'zustand';
import { supabase } from '../_core/supabase';

interface BriefingState {
  briefing: string | null;
  pendingActions: PendingAction[];
  pendingActionCount: number;
  autoExecuted: string[];
  visible: boolean;
  hasCheckedThisSession: boolean;
  checkBriefing: (familyId: string, userId: string) => Promise<void>;
  dismiss: () => void;
}

export const useBriefingStore = create<BriefingState>((set, get) => ({
  briefing: null,
  pendingActions: [],
  pendingActionCount: 0,
  autoExecuted: [],
  visible: false,
  hasCheckedThisSession: false,

  checkBriefing: async (familyId, userId) => {
    if (get().hasCheckedThisSession) return;
    set({ hasCheckedThisSession: true });

    try {
      const { data, error } = await supabase.functions.invoke('family-ai-briefing', {
        body: { family_id: familyId, user_id: userId },
      });
      if (error) throw error;

      if (data?.briefing || data?.pending_actions?.length > 0) {
        set({
          briefing: data.briefing,
          pendingActions: data.pending_actions ?? [],
          pendingActionCount: data.pending_action_count ?? 0,
          autoExecuted: data.auto_executed ?? [],
          visible: true,
        });
      }
    } catch (err) {
      console.error('Failed to load briefing:', err);
    }
  },

  dismiss: () => set({ visible: false }),
}));