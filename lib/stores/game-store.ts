import { create } from 'zustand';
import { supabase } from '@/lib/_core/supabase';
import { useToastStore } from './toast-store';
import { GAME_META } from '@/constants/games';

export interface GameQuestion {
  id: string;
  question: string;
  options: string[];
  correct_option_index?: number; // only present after answering, stripped before that client-side
  explanation?: string;
}

export interface GameParticipant {
  id: string;
  member_id: string;
  score: number;
  member?: { name: string };
}

export interface GameSession {
  id: string;
  family_id: string;
  game_type: 'bible_trivia' | 'quiz';
  mode: 'solo' | 'multiplayer';
  status: 'waiting' | 'in_progress' | 'completed';
  question_ids: string[];
  current_question_index: number;
  created_by: string;
}

interface GameState {
  currentSession: GameSession | null;
  questions: GameQuestion[];
  participants: GameParticipant[];
  loading: boolean;
  error: string | null;
  dailyLimitReached: boolean;
  channel: ReturnType<typeof supabase.channel> | null;

  startSession: (
    familyId: string, createdBy: string, memberId: string,
    gameType: 'bible_trivia' | 'quiz', mode: 'solo' | 'multiplayer',
    options?: { category?: string; difficulty?: 'easy' | 'medium' | 'hard'; count?: number }
  ) => Promise<GameSession | null>;
  joinSession: (sessionId: string, memberId: string) => Promise<void>;
  submitAnswer: (participantId: string, questionId: string, selectedIndex: number, timeTakenMs: number) => Promise<boolean>;
  advanceQuestion: (sessionId: string) => Promise<void>;
  endSession: (sessionId: string) => Promise<void>;
  subscribeToSession: (sessionId: string) => void;
  subscribeToInvites: (familyId: string, myUserId: string) => void;
  unsubscribeFromSession: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  currentSession: null,
  questions: [],
  participants: [],
  loading: false,
  error: null,
  dailyLimitReached: false,
  channel: null,

  startSession: async (familyId, createdBy, memberId, gameType, mode, options) => {
    set({ loading: true, error: null, dailyLimitReached: false });
    try {
      const { data, error } = await supabase.functions.invoke('generate-game-questions', {
        body: { family_id: familyId, game_type: gameType, ...options },
      });

      if (error) {
        const status = (error as any)?.context?.status;
        if (status === 429) {
          set({ dailyLimitReached: true, loading: false });
          return null;
        }
        throw error;
      }

      const questionIds = data.question_ids;

      const { data: session, error: sessionError } = await supabase
        .from('game_session')
        .insert([{
          family_id: familyId, game_type: gameType, mode,
          question_ids: questionIds, created_by: createdBy, status: 'in_progress',
          question_started_at: new Date().toISOString(),
        }])
        .select()
        .single();
      if (sessionError) throw sessionError;

      const { data: participant, error: participantError } = await supabase
        .from('game_participant')
        .insert([{ session_id: session.id, member_id: memberId }])
        .select()
        .single();
      if (participantError) throw participantError;

      const { data: questions } = await supabase
        .from('game_question')
        .select('id, question, options, explanation')
        .in('id', questionIds);

      // Preserve the AI's intended order rather than however Postgres returns them
      const orderedQuestions = questionIds.map((id: string) => questions?.find((q) => q.id === id)).filter(Boolean);

      set({
        currentSession: session,
        questions: orderedQuestions,
        participants: [{ ...participant, member: undefined }],
        loading: false,
      });

      return session;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to start game', loading: false });
      return null;
    }
  },

  joinSession: async (sessionId: string, memberId: string) => {
    try {
      const { data: session } = await supabase.from('game_session').select('*').eq('id', sessionId).single();
      if (!session) throw new Error('Session not found');

      const { error } = await supabase.from('game_participant').insert([{ session_id: sessionId, member_id: memberId }]);
      if (error && error.code !== '23505') throw error; // ignore "already joined"

      const { data: questions } = await supabase
        .from('game_question')
        .select('id, question, options, explanation')
        .in('id', session.question_ids);

      const orderedQuestions = session.question_ids.map((id: string) => questions?.find((q) => q.id === id)).filter(Boolean);

      set({ currentSession: session, questions: orderedQuestions, error: null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to join game' });
    }
  },

  submitAnswer: async (participantId, questionId, selectedIndex, timeTakenMs) => {
    try {
      const { data, error } = await supabase.functions.invoke('submit-game-answer', {
        body: { session_id: get().currentSession?.id, participant_id: participantId, question_id: questionId, selected_option_index: selectedIndex, time_taken_ms: timeTakenMs },
      });
      if (error) throw error;
      return data.is_correct;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to submit answer' });
      return false;
    }
  },

  advanceQuestion: async (sessionId: string) => {
    const session = get().currentSession;
    if (!session) return;

    const nextIndex = session.current_question_index + 1;
    const isLast = nextIndex >= session.question_ids.length;

    const { data } = await supabase
      .from('game_session')
      .update({
        current_question_index: nextIndex,
        question_started_at: new Date().toISOString(),
        status: isLast ? 'completed' : 'in_progress',
        ended_at: isLast ? new Date().toISOString() : null,
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (data) set({ currentSession: data });
  },

  endSession: async (sessionId: string) => {
    await supabase.from('game_session').update({ status: 'completed', ended_at: new Date().toISOString() }).eq('id', sessionId);
  },

  subscribeToSession: (sessionId: string) => {
    const existing = supabase.getChannels().find((ch) => ch.topic === `realtime:game-${sessionId}`);
    if (existing) supabase.removeChannel(existing);

    const channel = supabase
      .channel(`game-${sessionId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_session', filter: `id=eq.${sessionId}` },
        (payload) => set({ currentSession: payload.new as GameSession })
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_participant', filter: `session_id=eq.${sessionId}` },
        async () => {
          const { data } = await supabase
            .from('game_participant')
            .select('*, member:member_id(name)')
            .eq('session_id', sessionId)
            .order('score', { ascending: false });
          if (data) set({ participants: data });
        }
      )
      .subscribe();

    set({ channel });
  },

  unsubscribeFromSession: () => {
    const { channel } = get();
    if (channel) supabase.removeChannel(channel);
    set({ channel: null });
  },

  subscribeToInvites: (familyId: string, myUserId: string) => {
    const topic = `game-invites-${familyId}`;
    const existing = supabase.getChannels().find((ch) => ch.topic === `realtime:${topic}`);
    if (existing) return;

    const channel = supabase
        .channel(topic)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_session', filter: `family_id=eq.${familyId}` },
        (payload) => {
            const session = payload.new as GameSession;
            if (session.mode !== 'multiplayer' || session.created_by === myUserId) return;

            const { showToast } = useToastStore.getState();
            showToast({
            title: 'Family Game Started!',
            body: `Someone started a ${GAME_META[session.game_type].label} game — join in!`,
            variant: 'info',
            actionRoute: `/(stack)/games/play?sessionId=${session.id}`,
            });
        }
        )
        .subscribe();
    },
}));