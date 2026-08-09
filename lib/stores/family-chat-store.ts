import { create } from 'zustand';
import { supabase } from '../_core/supabase';

export interface PendingAction {
  id: string;
  action_type: string;
  summary: string;
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  payload: Record<string, any>;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  user_id: string | null;
}

interface FamilyChatState {
  messages: ChatMessage[];
  loading: boolean;
  sending: boolean;
  error: string | null;
  channel: ReturnType<typeof supabase.channel> | null;

  loadMessages: (familyId: string) => Promise<void>;
  sendMessage: (familyId: string, userId: string, message: string) => Promise<void>;
  subscribeToChat: (familyId: string) => void;
  unsubscribe: () => void;
  resolveAction: (actionId: string, decision: 'approved' | 'rejected', userId: string,overrides?: { assigned_member_id: string | null }) => Promise<void>;
  pendingActionsByMessageId: Record<string, PendingAction[]>;
}

export const useFamilyChatStore = create<FamilyChatState>((set, get) => ({
  messages: [],
  loading: false,
  sending: false,
  error: null,
  channel: null,
  pendingActionsByMessageId: {},


  loadMessages: async (familyId: string) => {
    set({ loading: true, error: null });
    try {
      const [{ data: messages, error: msgError }, { data: pendingActions, error: actionsError }] = await Promise.all([
        supabase
          .from('family_chat_messages')
          .select('*')
          .eq('family_id', familyId)
          .order('seq', { ascending: true })
          .limit(50),
        supabase
          .from('ai_action')
          .select('*')
          .eq('family_id', familyId)
          .eq('status', 'pending')
          .not('chat_message_id', 'is', null),
      ]);

      if (msgError) throw msgError;
      if (actionsError) throw actionsError;

      const pendingActionsByMessageId: Record<string, PendingAction[]> = {};
      (pendingActions ?? []).forEach((action) => {
        const key = action.chat_message_id;
        pendingActionsByMessageId[key] = [...(pendingActionsByMessageId[key] ?? []), action];
      });

      set({ messages: messages ?? [], pendingActionsByMessageId, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load chat', loading: false });
    }
  },

  sendMessage: async (familyId: string, userId: string, message: string) => {
    set({ sending: true, error: null });

    // Optimistic append — show the user's message instantly
    const optimisticMessage = {
        id: `temp-${Date.now()}`,
        role: 'user' as const,
        content: message,
        created_at: new Date().toISOString(),
        user_id: userId,
    };
    set((state) => ({ messages: [...state.messages, optimisticMessage] }));

    try {
        const {data, error } = await supabase.functions.invoke('family-ai-chat', {
          body: { family_id: familyId, user_id: userId, message },
        });
        if (error) throw error;
        // Real messages (user + assistant) will arrive via realtime and replace/append correctly
        // Realtime will deliver the actual persisted messages — but pending_actions
        // aren't part of the message row, so store them keyed by the assistant message
        if (data?.pending_actions?.length > 0 && data.message_id) {
          set((state) => ({
            pendingActionsByMessageId: {
              ...state.pendingActionsByMessageId,
              [data.message_id]: data.pending_actions,
            },
          }));
        }
    } catch (err) {
        set({ error: err instanceof Error ? err.message : 'Failed to send message' });
        // Roll back the optimistic message on failure
        set((state) => ({ messages: state.messages.filter((m) => m.id !== optimisticMessage.id) }));
    } finally {
        set({ sending: false });
    }
  },

  resolveAction: async (
    actionId: string,
    decision: 'approved' | 'rejected',
    userId: string,
    overrides?: { assigned_member_id: string | null }
  ) => {
    try {
      const { error } = await supabase.functions.invoke('execute-ai-action', {
        body: { action_id: actionId, decision, resolved_by_user_id: userId, overrides },
      });
      if (error) throw error;

      set((state) => {
        const updated: Record<string, PendingAction[]> = {};
        for (const [key, actions] of Object.entries(state.pendingActionsByMessageId)) {
          updated[key] = actions.map((a) => (a.id === actionId ? { ...a, status: decision } : a));
        }
        return { pendingActionsByMessageId: updated };
      });
    } catch (err) {
      console.error('Failed to resolve action:', err);
      throw err;
    }
  },

  subscribeToChat: (familyId: string) => {
    const channel = supabase
        .channel(`family-chat-${familyId}`)
        .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'family_chat_messages', filter: `family_id=eq.${familyId}` },
        (payload) => {
            const newMsg = payload.new as ChatMessage;
            set((state) => ({
            messages: [
                ...state.messages.filter((m) => !(m.id.startsWith('temp-') && m.content === newMsg.content)),
                newMsg,
            ],
            }));
        }
        )
        .subscribe();

    set({ channel });
    },

  unsubscribe: () => {
    const { channel } = get();
    if (channel) supabase.removeChannel(channel);
    set({ channel: null });
  },
}));