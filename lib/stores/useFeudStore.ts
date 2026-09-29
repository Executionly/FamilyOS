import { create } from 'zustand';
import { supabase } from '@/lib/_core/supabase'; 
import { notifyAssignment } from '../services/notify'; 
import type { FeudAnswer, FeudParticipant, FeudQuestion, FeudSession } from '../../types';

interface CreateOptions {
  totalRounds?: number;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

interface FeudState {
  currentSession: FeudSession | null;
  participants: FeudParticipant[];
  questionData: { question: FeudQuestion; answers: FeudAnswer[] } | null;
  loading: boolean;
  error: string | null;
  channel: ReturnType<typeof supabase.channel> | null;

  // ── Lobby ──────────────────────────────────────────────────
  createSession: (
    familyId: string,
    createdBy: string,
    memberId: string,
    invitedMemberIds: string[],
    options?: CreateOptions,
  ) => Promise<FeudSession | null>;
  joinSession: (sessionId: string, memberId: string) => Promise<void>;
  fetchParticipants: (sessionId: string) => Promise<void>;
  // Goes through family-feud-action (service role) rather than updating
  // game_participant rows directly: the creator has to write other
  // members' team_id, which row-level security on that table may block.
  shuffleTeams: (sessionId: string, memberId: string) => Promise<void>;
  startGame: (sessionId: string, memberId: string) => Promise<void>;
  cancelSession: (sessionId: string) => Promise<void>;

  // ── Gameplay (thin wrappers around family-feud-action) ─────
  submitFaceOffAnswer: (sessionId: string, memberId: string, answerText: string) => Promise<void>;
  choosePlayOrPass: (sessionId: string, memberId: string, choice: 'play' | 'pass') => Promise<void>;
  submitTurnAnswer: (sessionId: string, memberId: string, answerText: string) => Promise<void>;
  submitStealAnswer: (sessionId: string, memberId: string, answerText: string) => Promise<void>;
  startNextRound: (sessionId: string, memberId: string) => Promise<void>;

  // ── Realtime ─────────────────────────────────────────────────
  fetchSession: (sessionId: string) => Promise<void>;
  fetchQuestionData: (questionId: string) => Promise<void>;
  subscribeToSession: (sessionId: string) => void;
  unsubscribeFromSession: () => void;
}

async function callAction(
  sessionId: string,
  memberId: string,
  action: string,
  extra?: Record<string, unknown>,
): Promise<FeudSession> {
  const { data, error } = await supabase.functions.invoke('family-feud-action', {
    body: { session_id: sessionId, member_id: memberId, action, ...extra },
  });
  if (error) {
    // supabase-js's error shape for non-2xx responses varies by version:
    // error.context can be the raw Response (needs .json(), and can only
    // be read once) or already the parsed body. Try both, fall back to
    // error.message rather than ever surfacing something unparsed.
    let message = error.message || 'Request failed';
    try {
      const ctx = (error as any).context;
      if (ctx && typeof ctx.json === 'function' && ctx.bodyUsed !== true) {
        const body = await ctx.json();
        if (body?.error) message = body.error;
      } else if (ctx?.error) {
        message = ctx.error;
      }
    } catch {
      // Body already consumed or wasn't JSON — stick with error.message.
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data.session as FeudSession;
}

export const useFeudStore = create<FeudState>((set, get) => ({
  currentSession: null,
  participants: [],
  questionData: null,
  loading: false,
  error: null,
  channel: null,

  createSession: async (familyId, createdBy, memberId, invitedMemberIds, options) => {
    set({ loading: true, error: null });
    try {
      const { data: session, error } = await supabase
        .from('game_session')
        .insert([
          {
            family_id: familyId,
            game_type: 'family_feud',
            mode: 'multiplayer',
            status: 'waiting',
            created_by: createdBy,
            invited_member_ids: invitedMemberIds,
            lobby_deadline: new Date(Date.now() + 90000).toISOString(),
            question_ids: [], // unused by Family Feud, but the column is NOT NULL
            feud_total_rounds: options?.totalRounds ?? 5,
            feud_category: options?.category ?? null,
            feud_difficulty: options?.difficulty ?? 'medium',
            feud_round: 0,
            team_scores: { A: 0, B: 0 },
          },
        ])
        .select()
        .single();
      if (error) throw error;

      const { data: participant, error: pErr } = await supabase
        .from('game_participant')
        .insert([{ session_id: session.id, member_id: memberId }])
        .select()
        .single();
      if (pErr) throw pErr;

      for (const invitedId of invitedMemberIds) {
        await notifyAssignment({
          familyId,
          assigneeMemberId: invitedId,
          type: 'family_update',
          priority: 'important',
          assigneeMessage: { title: "You've been invited to play", body: "You've been invited to play Family Feud." },
          othersMessage: { title: 'Game invitation sent', body: 'A family member has been invited to play Family Feud.' },
          actionLabel: 'Go to lobby',
          actionRoute: `/(stack)/games/feud/feud-lobby?sessionId=${session.id}`,
        });
      }

      set({
        currentSession: session as FeudSession,
        participants: [{ ...participant, member: undefined }],
        loading: false,
      });
      return session as FeudSession;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create game', loading: false });
      return null;
    }
  },

  joinSession: async (sessionId, memberId) => {
    try {
      const { error } = await supabase.from('game_participant').insert([{ session_id: sessionId, member_id: memberId }]);
      if (error && error.code !== '23505') throw error; // ignore "already joined"
      await get().fetchSession(sessionId);
      await get().fetchParticipants(sessionId);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to join game' });
    }
  },

  fetchParticipants: async (sessionId) => {
    // No .order() on created_at: if game_participant has no such column the
    // whole query errors, and the old code swallowed that error, leaving the
    // lobby stuck on whatever list it started with.
    const { data, error } = await supabase
      .from('game_participant')
      .select('*, member:member_id(name)')
      .eq('session_id', sessionId);
    if (error) {
      console.error('fetchParticipants error:', error);
      return;
    }
    if (data) set({ participants: data as FeudParticipant[] });
  },

  shuffleTeams: async (sessionId, memberId) => {
    try {
      await callAction(sessionId, memberId, 'shuffle_teams');
      await get().fetchParticipants(sessionId);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to assign teams' });
    }
  },

  startGame: async (sessionId, memberId) => {
    const { participants } = get();
    const teamA = participants.filter((p) => p.team_id === 'A');
    const teamB = participants.filter((p) => p.team_id === 'B');
    if (participants.some((p) => !p.team_id)) {
      set({ error: 'Some players are not on a team yet. Assign teams first.' });
      return;
    }
    if (!teamA.length || !teamB.length) {
      set({ error: 'Both teams need at least one player before starting' });
      return;
    }

    set({ loading: true, error: null });
    try {
      const session = await callAction(sessionId, memberId, 'start_round');
      set({ currentSession: session, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to start game', loading: false });
    }
  },

  cancelSession: async (sessionId) => {
    await supabase.from('game_session').update({ status: 'cancelled' }).eq('id', sessionId);
  },

  submitFaceOffAnswer: async (sessionId, memberId, answerText) => {
    try {
      const session = await callAction(sessionId, memberId, 'submit_face_off_answer', { answer_text: answerText });
      set({ currentSession: session, error: null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to submit answer' });
    }
  },

  choosePlayOrPass: async (sessionId, memberId, choice) => {
    try {
      const session = await callAction(sessionId, memberId, 'choose_play_or_pass', { choice });
      set({ currentSession: session, error: null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to submit choice' });
    }
  },

  submitTurnAnswer: async (sessionId, memberId, answerText) => {
    try {
      const session = await callAction(sessionId, memberId, 'submit_turn_answer', { answer_text: answerText });
      set({ currentSession: session, error: null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to submit answer' });
    }
  },

  submitStealAnswer: async (sessionId, memberId, answerText) => {
    try {
      const session = await callAction(sessionId, memberId, 'submit_steal_answer', { answer_text: answerText });
      set({ currentSession: session, error: null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to submit steal' });
    }
  },

  startNextRound: async (sessionId, memberId) => {
    try {
      const session = await callAction(sessionId, memberId, 'start_round');
      set({ currentSession: session, error: null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to start next round' });
    }
  },

  fetchSession: async (sessionId) => {
    const { data, error } = await supabase.from('game_session').select('*').eq('id', sessionId).single();
    if (!error && data) set({ currentSession: data as FeudSession });
  },

  fetchQuestionData: async (questionId) => {
    const [{ data: question }, { data: answers }] = await Promise.all([
      supabase.from('family_feud_question').select('id, question, category, difficulty').eq('id', questionId).single(),
      supabase.from('family_feud_answer').select('id, question_id, answer, rank, points').eq('question_id', questionId).order('rank'),
    ]);
    if (question) set({ questionData: { question: question as FeudQuestion, answers: (answers ?? []) as FeudAnswer[] } });
  },

  subscribeToSession: (sessionId) => {
    const existing = supabase.getChannels().find((ch) => ch.topic === `realtime:feud-${sessionId}`);
    if (existing) supabase.removeChannel(existing);

    const channel = supabase
      .channel(`feud-${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_session', filter: `id=eq.${sessionId}` },
        (payload) => {
          const next = payload.new as FeudSession;
          set({ currentSession: next });
          if (next.feud_question_id && next.feud_question_id !== get().questionData?.question.id) {
            get().fetchQuestionData(next.feud_question_id);
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_participant', filter: `session_id=eq.${sessionId}` },
        () => get().fetchParticipants(sessionId),
      )
      .subscribe();

    set({ channel });
  },

  unsubscribeFromSession: () => {
    const { channel } = get();
    if (channel) supabase.removeChannel(channel);
    set({ channel: null });
  },
}));