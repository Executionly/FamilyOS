import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { TdAction, TdIntensity, TdParticipant, TdSession } from '@/types';
import { supabase } from '../_core/supabase';
import { notifyAssignment } from '../services/notify';
import { LlmUpgradeRequiredError } from '../_core/llm';

/**
 * How long a lobby stays open before the lobby timeout cancels it (written to game_session.lobby_deadline).
 * Feud uses 90s. Truth or Dare is played in the same room and invitees have to open the notification
 * first, so it gets longer. Change freely: the existing lobby-timeout logic only reads lobby_deadline.
 */
const LOBBY_TIMEOUT_MS = 5 * 60 * 1000;
const MIN_PLAYERS = 2;

interface TruthDareState {
  session: TdSession | null;
  participants: TdParticipant[];
  loading: boolean;
  /** True while an action is in flight, to disable buttons and prevent double taps. */
  busy: boolean;
  error: string | null;
  channel: RealtimeChannel | null;

  // ── Lobby ──────────────────────────────────────────────────
  createSession: (
    familyId: string,
    createdBy: string,
    memberId: string,
    invitedMemberIds: string[],
    maxTurns: number | null,
    intensity: 'mixed' | 'mild'
  ) => Promise<TdSession | null>;
  joinSession: (sessionId: string, memberId: string) => Promise<void>;
  fetchParticipants: (sessionId: string) => Promise<void>;
  cancelSession: (sessionId: string) => Promise<void>;
  pauseSession: (sessionId: string) => Promise<void>;
  resumeSession: (sessionId: string) => Promise<void>;

  // ── Session / realtime ─────────────────────────────────────
  loadSession: (sessionId: string) => Promise<void>;

  subscribe: (sessionId: string) => void;
  unsubscribe: () => void;
  reset: () => void;
  clearError: () => void;

  // ── Gameplay (thin wrappers around truth-dare-action) ──────
  startGame: () => Promise<boolean>;
  chooseType: (type: 'truth' | 'dare') => Promise<boolean>;
  rerollPrompt: () => Promise<boolean>;
  /** `answer` is only used for a truth: the current player's typed answer. */
  completeTurn: (answer?: string) => Promise<boolean>;
  skipTurn: () => Promise<boolean>;
  endGame: () => Promise<boolean>;

  generateAiPrompts: (
    familyId: string,
    opts?: { theme?: string; count?: number; intensity?: TdIntensity },
  ) => Promise<{ ok: boolean; added?: number; error?: string }>;
}


async function extractFunctionError(error: any): Promise<string> {
  try {
    const ctx = error?.context;
    if (ctx && typeof ctx.json === 'function' && ctx.bodyUsed !== true) {
      const body = await ctx.json();
      if (body?.error) return String(body.error);
    } else if (ctx?.error) {
      return String(ctx.error);
    } else if (ctx?.body) {
      const body = typeof ctx.body === 'string' ? JSON.parse(ctx.body) : ctx.body;
      if (body?.error) return String(body.error);
    }
  } catch {
    // Body already consumed or wasn't JSON: fall through to error.message.
  }
  return error?.message ?? 'Something went wrong';
}

// Module-level so the count survives across both screens using this one store.
let subscriberCount = 0;
let subscribedSessionId: string | null = null;

export const useTruthDareStore = create<TruthDareState>((set, get) => {
  const fetchParticipants = async (sessionId: string) => {
    const { data, error } = await supabase
      .from('game_participant')
      .select('id, session_id, member_id, member:member_id(id, name, avatar_url)')
      .eq('session_id', sessionId);
    if (error) {
      console.error('fetchParticipants error:', error);
      return;
    }
    if (data) set({ participants: data as unknown as TdParticipant[] });
  };

  const fetchSession = async (sessionId: string) => {
    const { data, error } = await supabase
      .from('game_session')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();
    if (!error && data) set({ session: data as TdSession });
  };

  const teardownChannel = () => {
    const { channel } = get();
    if (channel) supabase.removeChannel(channel);
    set({ channel: null });
    subscribedSessionId = null;
  };

  const callAction = async (payload: TdAction): Promise<boolean> => {
    const session = get().session;
    if (!session || get().busy) return false;
    set({ busy: true, error: null });
    try {
      const { data, error } = await supabase.functions.invoke('truth-dare-action', {
        body: { ...payload, session_id: session.id },
      });

      if (error) {
        set({ error: await extractFunctionError(error) });
        return false;
      }
      if (!data?.ok) {
        set({ error: data?.error ?? 'Something went wrong' });
        return false;
      }
      // Apply immediately for snappy UI; realtime will deliver the same row to everyone else.
      if (data.session) set({ session: data.session as TdSession });
      return true;
    } catch (e: any) {
      set({ error: e?.message ?? 'Network error' });
      return false;
    } finally {
      set({ busy: false });
    }
  };


    async function readFunctionErrorBody(error: any): Promise<Record<string, any>> {
    try {
        const ctx = error?.context;
        if (ctx && typeof ctx.json === 'function' && ctx.bodyUsed !== true) {
        return (await ctx.json()) ?? {};
        }
        if (ctx && typeof ctx === 'object' && ctx.error) return ctx; // already-parsed shape (older supabase-js)
    } catch {
        // body wasn't JSON, or was already read
    }
    return {};
    }

  return {
    session: null,
    participants: [],
    loading: false,
    busy: false,
    error: null,
    channel: null,

    // ── Lobby ────────────────────────────────────────────────

    createSession: async (familyId, createdBy, memberId, invitedMemberIds,maxTurns,intensity) => {
      set({ loading: true, error: null });
      try {
        const { data: session, error } = await supabase
          .from('game_session')
          .insert([
            {
              family_id: familyId,
              game_type: 'truth_dare',
              mode: 'multiplayer',
              status: 'waiting',
              td_max_turns: maxTurns,
              td_intensity: intensity,
              created_by: createdBy,
              invited_member_ids: invitedMemberIds,
              lobby_deadline: new Date(Date.now() + LOBBY_TIMEOUT_MS).toISOString(),
              question_ids: [], // unused by Truth or Dare, but the column is NOT NULL
              // td_* columns take their defaults; length and vibe are set by start_game from the lobby.
            },
          ])
          .select()
          .single();
          console.log("TD ERROR", error)
        if (error) throw error;

        const { data: participant, error: pErr } = await supabase
          .from('game_participant')
          .insert([{ session_id: session.id, member_id: memberId }])
          .select()
          .single();
          console.log("GP ERROR", pErr)
        if (pErr) throw pErr;

        // A failed notification must never fail game creation, so settle them all.
        await Promise.allSettled(
          invitedMemberIds.map((invitedId) =>
            notifyAssignment({
              familyId,
              assigneeMemberId: invitedId,
              type: 'family_update',
              priority: 'important',
              assigneeMessage: {
                title: "You've been invited to play",
                body: "You've been invited to play Truth or Dare.",
              },
              othersMessage: {
                title: 'Game invitation sent',
                body: 'A family member has been invited to play Truth or Dare.',
              },
              actionLabel: 'Go to lobby',
              actionRoute: `/(stack)/games/truth-dare/truth-dare-lobby?sessionId=${session.id}`,
            }),
          ),
        );

        set({
          session: session as TdSession,
          participants: [{ ...participant, member: undefined }],
          loading: false,
        });
        void fetchParticipants(session.id); // fill in the creator's name
        return session as TdSession;
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to create game', loading: false });
        return null;
      }
    },

    joinSession: async (sessionId, memberId) => {
      try {
        const { error } = await supabase
          .from('game_participant')
          .insert([{ session_id: sessionId, member_id: memberId }]);
        if (error && error.code !== '23505') throw error; // ignore "already joined"
        await fetchSession(sessionId);
        await fetchParticipants(sessionId);
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to join game' });
      }
    },

    fetchParticipants,

    cancelSession: async (sessionId) => {
      const { error } = await supabase.from('game_session').update({ status: 'cancelled' }).eq('id', sessionId);
      if (error) set({ error: error.message });
    },

    // ── Session / realtime ───────────────────────────────────

    loadSession: async (sessionId) => {
      set({ loading: true, error: null });
      const { data, error } = await supabase
        .from('game_session')
        .select('*')
        .eq('id', sessionId)
        .maybeSingle();
      if (error || !data) {
        set({ loading: false, error: error?.message ?? 'Game not found' });
        return;
      }
      set({ session: data as TdSession });
      await fetchParticipants(sessionId);
      set({ loading: false });
    },

    subscribe: (sessionId) => {
      if (subscribedSessionId === sessionId && get().channel) {
        subscriberCount += 1;
        return;
      }

      // Different session (or none yet): drop anything old, including a stale channel with the same
      // topic left over from a hot reload, which would otherwise throw on .on() after subscribe().
      teardownChannel();
      const topic = `truth-dare-${sessionId}`;
      const stale = supabase.getChannels().find((ch) => ch.topic === `realtime:${topic}`);
      if (stale) supabase.removeChannel(stale);

      const channel = supabase
        .channel(topic)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'game_session', filter: `id=eq.${sessionId}` },
          (payload) => set({ session: payload.new as TdSession }),
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'game_participant', filter: `session_id=eq.${sessionId}` },
          () => {
            void fetchParticipants(sessionId);
          },
        )
        .subscribe();

      subscriberCount = 1;
      subscribedSessionId = sessionId;
      set({ channel });
    },

    unsubscribe: () => {
      subscriberCount = Math.max(0, subscriberCount - 1);
      if (subscriberCount > 0) return; // another screen is still using the channel
      teardownChannel();
    },

    reset: () => {
      get().unsubscribe();
      // Only wipe state when nobody else is still using it.
      if (subscriberCount === 0) {
        set({ session: null, participants: [], loading: false, busy: false, error: null });
      }
    },

    clearError: () => set({ error: null }),

    // ── Gameplay ─────────────────────────────────────────────

    startGame: async () => {
      if (get().participants.length < MIN_PLAYERS) {
        set({ error: `You need at least ${MIN_PLAYERS} players to start` });
        return false;
      }
      return callAction({ action: 'start_game', });
    },
    chooseType: (type) => callAction({ action: 'choose_type', type }),
    rerollPrompt: () => callAction({ action: 'reroll_prompt' }),
    completeTurn: (answer) => callAction({ action: 'complete_turn', answer }),
    skipTurn: () => callAction({ action: 'skip_turn' }),
    endGame: () => callAction({ action: 'end_game' }),

    pauseSession: async (sessionId) => {
        try {
          const { data, error } = await supabase
            .from('game_session')
            .update({ status: 'paused', paused_at: new Date().toISOString() })
            .eq('id', sessionId)
            .select()
            .single();
          if (error) throw error;
          set({ session: data as TdSession, error: null });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to pause game' });
        }
    },
     
    resumeSession: async (sessionId) => {
        try {
            const session = get().session; // this store's own state, kept live by the realtime subscription
            let updates: Record<string, any>;
        
            if (session?.paused_at) {
                // Shift the timer forward by however long the pause lasted, so the
                // remaining time is preserved rather than reset.
                const pausedMs = Date.now() - new Date(session.paused_at).getTime();
                updates = { status: 'in_progress', paused_at: null };
            } else {
                // Missing paused_at/question_started_at for some reason — don't
                // silently do nothing, just unpause with a fresh timer.
                updates = { status: 'in_progress', paused_at: null };
            }
        
            const { data, error } = await supabase.from('game_session').update(updates).eq('id', sessionId).select().single();
            if (error) throw error;
            set({ session: data as TdSession, error: null });
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to resume game' });
        }
    },

    
    generateAiPrompts: async (familyId, opts) => {
      try {
        const { data, error } = await supabase.functions.invoke('generate-truth-dare-prompts', {
          body: { family_id: familyId, ...opts },
        });
        if (error) {
          const body = await readFunctionErrorBody(error);
          console.log('generate-truth-dare-prompts failed:', body);
          if (body.upgrade_required || body.error === 'upgrade_required') {
            throw new LlmUpgradeRequiredError('ai_feature');
          }
          if (body.quota_exceeded || body.error === 'quota_exceeded') {
            throw new Error("You've reached your AI usage limit for now.");
          }
          throw new Error(body.error ?? error.message ?? 'Failed to generate prompts');
        }
        if (!data?.ok) return { ok: false, error: data?.error ?? 'Could not generate prompts' };
        return { ok: true, added: data.added };
      } catch (error: any) {
        if (error instanceof LlmUpgradeRequiredError) {
          set({ loading: false });
          throw error;
        }
        const message = error instanceof Error ? error.message : 'Failed to generate prompts';
        set({ error: message });
        throw error;
      }
    },
  };
});