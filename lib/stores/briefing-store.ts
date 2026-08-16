import { PendingAction } from '@/lib/stores/family-chat-store';
import { create } from 'zustand';
import { supabase } from '../_core/supabase';

interface CheckBriefingOptions {
  memberId: string;
  isPremium: boolean;
  hasSeenAiIntro: boolean; // pass member.ai_intro_seen_at != null
}

interface BriefingState {
  briefing: string | null;
  pendingActions: PendingAction[];
  pendingActionCount: number;
  autoExecuted: string[];
  visible: boolean;
  mode: 'briefing' | 'intro';
  hasCheckedThisSession: boolean;
  checkBriefing: (familyId: string, userId: string, opts: CheckBriefingOptions) => Promise<void>;
  dismiss: () => Promise<void>;
}

const AI_INTRO_MESSAGE =
  "Hi, I'm your Family AI — I help plan your week, surface what needs attention, and keep everyone " +
  'on the same page. On the free plan I can do the basics; upgrade to Premium to unlock full ' +
  'briefings, proactive planning, and deeper family insights.';

export const useBriefingStore = create<BriefingState>((set, get) => ({
  briefing: null,
  pendingActions: [],
  pendingActionCount: 0,
  autoExecuted: [],
  visible: false,
  mode: 'briefing',
  hasCheckedThisSession: false,

  _pendingIntroMemberId: null,

  checkBriefing: async (familyId, userId, { memberId, isPremium, hasSeenAiIntro }) => {
    if (get().hasCheckedThisSession) return;
    set({ hasCheckedThisSession: true });

    // Free-tier, first-ever open: show the one-time intro instead of hitting the real
    // briefing endpoint. No Edge Function call yet — that happens next time they open the app.
    if (!isPremium && !hasSeenAiIntro) {
      set({
        mode: 'intro',
        briefing: AI_INTRO_MESSAGE,
        pendingActions: [],
        autoExecuted: [],
        visible: true,
        // @ts-expect-error internal-only field
        _pendingIntroMemberId: memberId,
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('family-ai-briefing', {
        body: { family_id: familyId, user_id: userId },
      });
      if (error) throw error;

      if (data?.briefing || data?.pending_actions?.length > 0) {
        set({
          mode: 'briefing',
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

  dismiss: async () => {
    const state = get();
    // @ts-expect-error internal-only field
    const introMemberId: string | null = state._pendingIntroMemberId;

    set({ visible: false });

    if (state.mode === 'intro' && introMemberId) {
      const { error } = await supabase
        .from('member')
        .update({ ai_intro_seen_at: new Date().toISOString() })
        .eq('id', introMemberId);

      if (error) {
        // Not fatal to the UI — worst case they see the intro once more next session
        console.error('Failed to persist ai_intro_seen_at:', error);
      }
      // @ts-expect-error internal-only field
      set({ _pendingIntroMemberId: null });
    }
  },
}));