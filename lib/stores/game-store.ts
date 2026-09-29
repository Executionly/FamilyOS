import { create } from 'zustand';
import { supabase } from '@/lib/_core/supabase';
import { useToastStore } from './toast-store';
import { GAME_META } from '@/constants/games';
import { notifyAssignment } from '../services/notify';

export interface GameQuestion {
  id: string;
  question: string;
  options: string[];
  correct_option_index?: number; // only present after answering, stripped before that client-side
  explanation?: string;
}

type GameType = 'bible_trivia' | 'quiz' | 'family_feud';
 
export interface StartOptions {
  difficulty?: 'easy' | 'medium' | 'hard';
  category?: string;
  count?: number;
  /** "Know Our Family". Only honoured when gameType === 'quiz'. */
  familySpecific?: boolean;
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
  game_type: GameType;
  mode: 'solo' | 'multiplayer';
  status: 'waiting' | 'in_progress' | 'completed' | 'cancelled' | 'paused';
  question_ids: string[];
  current_question_index: number;
  paused_at: string;
  question_started_at: string;
  invited_member_ids: any[];
  lobby_deadline: string;
  created_by: string;
}

// `kind` property instead of a class + instanceof: subclassed Errors can lose their prototype under some RN/Babel transforms.
const startError = (kind: 'daily_limit' | 'charter_required') =>
  Object.assign(new Error(kind), { kind });
 
const isFamilyQuiz = (gameType: GameType, options?: StartOptions) =>
  gameType === 'quiz' && !!options?.familySpecific;
 
async function fetchQuestionIds(
  familyId: string,
  gameType: GameType,
  options?: StartOptions,
): Promise<string[]> {
  const family = isFamilyQuiz(gameType, options);
  const { familySpecific: _ignored, ...rest } = options ?? {};
 
  const { data, error } = await supabase.functions.invoke(
    family ? 'generate-family-quiz' : 'generate-game-questions',
    {
      // The family quiz has no difficulty/category: it is built from the family's own charter.
      body: family
        ? { family_id: familyId, count: rest.count }
        : { family_id: familyId, game_type: gameType, ...rest },
    },
  );
 
  if (error) {
    const status = (error as any)?.context?.status;
    if (status === 429) throw startError('daily_limit');
    if (status === 422) throw startError('charter_required');
    throw error;
  }
  if (!data?.question_ids?.length) throw new Error('No questions available');
  return data.question_ids as string[];
}
 
const startFailure = (error: unknown) => {
  const kind = (error as any)?.kind;
  if (kind === 'daily_limit') return { dailyLimitReached: true, loading: false };
  if (kind === 'charter_required') return { charterRequired: true, loading: false };
  return { error: error instanceof Error ? error.message : 'Failed to start game', loading: false };
};
 
const gameLabelFor = (gameType: GameType, options?: StartOptions) =>
  isFamilyQuiz(gameType, options) ? 'Know Our Family' : gameType === 'bible_trivia' ? 'Bible Trivia' : 'General Quiz';
 

interface GameState {
  currentSession: GameSession | null;
  questions: GameQuestion[];
  participants: GameParticipant[];
  loading: boolean;
  error: string | null;
  dailyLimitReached: boolean;
  charterRequired: boolean;
  channel: ReturnType<typeof supabase.channel> | null;

  startSession: (
    familyId: string, createdBy: string, memberId: string,
    gameType: 'bible_trivia' | 'quiz', mode: 'solo' | 'multiplayer',
    options?: { category?: string; difficulty?: 'easy' | 'medium' | 'hard'; count?: number }
  ) => Promise<GameSession | null>;
  joinSession: (sessionId: string, memberId: string) => Promise<void>;
  submitAnswer: (participantId: string, questionId: string, selectedIndex: number, timeTakenMs: number) => Promise<boolean>;
  advanceQuestion: (sessionId: string, expectedCurrentIndex: number) => Promise<void>;
  endSession: (sessionId: string) => Promise<void>;
  subscribeToSession: (sessionId: string) => void;
  // subscribeToInvites: (familyId: string, myUserId: string) => void;
  unsubscribeFromSession: () => void;
  beginMultiplayerGame: (sessionId: string) => Promise<void>;

  findActiveSession: (familyId: string, memberId: string) => Promise<GameSession | null>;
  inviteAndStart: (familyId: string, createdBy: string, memberId: string, gameType: 'bible_trivia'|'quiz', invitedMemberIds: string[], options?: any) => Promise<GameSession | null>;
  cancelSession: (sessionId: string) => Promise<void>;
  pauseSession: (sessionId: string) => Promise<void>;
  resumeSession: (sessionId: string) => Promise<void>;
  refreshParticipants: (sessionId: string) => Promise<void>;
}

export const useGameStore = create<GameState>((set, get) => ({
  currentSession: null,
  questions: [],
  participants: [],
  loading: false,
  error: null,
  dailyLimitReached: false,
  channel: null,
  charterRequired: false,

  // startSession — multiplayer now creates in 'waiting' status, not 'in_progress'
  // startSession: async (familyId, createdBy, memberId, gameType, mode, options) => {
  //   set({ loading: true, error: null, dailyLimitReached: false });
  //   try {
  //     const { data, error } = await supabase.functions.invoke('generate-game-questions', {
  //       body: { family_id: familyId, game_type: gameType, ...options },
  //     });

  //     if (error) {
  //       const status = (error as any)?.context?.status;
  //       if (status === 429) {
  //         set({ dailyLimitReached: true, loading: false });
  //         return null;
  //       }
  //       throw error;
  //     }

  //     const questionIds = data.question_ids;
  //     const isMultiplayer = mode === 'multiplayer';

  //     const { data: session, error: sessionError } = await supabase
  //       .from('game_session')
  //       .insert([{
  //         family_id: familyId, game_type: gameType, mode,
  //         question_ids: questionIds, created_by: createdBy,
  //         status: isMultiplayer ? 'waiting' : 'in_progress',
  //         question_started_at: isMultiplayer ? null : new Date().toISOString(),
  //       }])
  //       .select()
  //       .single();
  //     if (sessionError) throw sessionError;

  //     const { data: participant, error: participantError } = await supabase
  //       .from('game_participant')
  //       .insert([{ session_id: session.id, member_id: memberId }])
  //       .select()
  //       .single();
  //     if (participantError) throw participantError;

  //     const { data: questions } = await supabase
  //       .from('game_question')
  //       .select('id, question, options, explanation')
  //       .in('id', questionIds);

  //     const orderedQuestions = questionIds.map((id: string) => questions?.find((q) => q.id === id)).filter(Boolean);

  //     set({
  //       currentSession: session,
  //       questions: orderedQuestions,
  //       participants: [{ ...participant, member: undefined }],
  //       loading: false,
  //     });

  //     return session;
  //   } catch (error) {
  //     set({ error: error instanceof Error ? error.message : 'Failed to start game', loading: false });
  //     return null;
  //   }
  // },


startSession: async (familyId, createdBy, memberId, gameType, mode, options) => {
  set({ loading: true, error: null, dailyLimitReached: false, charterRequired: false });
  try {
    const questionIds = await fetchQuestionIds(familyId, gameType, options);
    const isMultiplayer = mode === 'multiplayer';
 
    const { data: session, error: sessionError } = await supabase
      .from('game_session')
      .insert([{
        family_id: familyId, game_type: gameType, mode,
        variant: isFamilyQuiz(gameType, options) ? 'family' : 'standard',
        question_ids: questionIds, created_by: createdBy,
        status: isMultiplayer ? 'waiting' : 'in_progress',
        question_started_at: isMultiplayer ? null : new Date().toISOString(),
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
 
    const orderedQuestions = questionIds.map((id: string) => questions?.find((q) => q.id === id)).filter(Boolean);
 
    set({
      currentSession: session,
      questions: orderedQuestions as GameQuestion[],
      participants: [{ ...participant, member: undefined }],
      loading: false,
    });
 
    return session;
  } catch (error) {
    set(startFailure(error));
    return null;
  }
},
 
inviteAndStart: async (familyId, createdBy, memberId, gameType, invitedMemberIds, options) => {
  set({ loading: true, error: null, dailyLimitReached: false, charterRequired: false });
  try {
    const questionIds = await fetchQuestionIds(familyId, gameType, options);
 
    const { data: session, error: sErr } = await supabase
      .from('game_session')
      .insert([{
        family_id: familyId, game_type: gameType, mode: 'multiplayer',
        variant: isFamilyQuiz(gameType, options) ? 'family' : 'standard',
        question_ids: questionIds, created_by: createdBy,
        status: 'waiting', invited_member_ids: invitedMemberIds,
        lobby_deadline: new Date(Date.now() + 90000).toISOString(),
      }])
      .select().single();
    if (sErr) throw sErr;
 
    const { data: participant, error: pErr } = await supabase
      .from('game_participant')
      .insert([{ session_id: session.id, member_id: memberId }])
      .select()
      .single();
    if (pErr) throw pErr;
 
    const { data: questions } = await supabase
      .from('game_question')
      .select('id, question, options, explanation')
      .in('id', questionIds);
    const ordered = questionIds.map((id: string) => questions?.find((q) => q.id === id)).filter(Boolean);
 
    const label = gameLabelFor(gameType, options);
    for (const invitedId of invitedMemberIds) {
      await notifyAssignment({
        familyId,
        assigneeMemberId: invitedId,
        type: 'family_update',
        priority: 'important',
        assigneeMessage: {
          title: "You've been invited to play",
          body: `You've been invited to play ${label}.`,
        },
        othersMessage: {
          title: 'Game invitation sent',
          body: `A family member has been invited to play ${label}.`,
        },
        actionLabel: 'Go to lobby',
        actionRoute: `/(stack)/games/lobby?sessionId=${session.id}`,
      });
    }
 
    set({
      currentSession: session,
      questions: ordered as GameQuestion[],
      loading: false,
      participants: [{ ...participant, member: undefined }],
    });
    return session;
  } catch (error) {
    set(startFailure(error));
    return null;
  }
},
  
  beginMultiplayerGame: async (sessionId: string) => {
    const { data, error } = await supabase
      .from('game_session')
      .update({ status: 'in_progress', question_started_at: new Date().toISOString() })
      .eq('id', sessionId)
      .select()
      .single();
    if (!error && data) set({ currentSession: data });
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

  advanceQuestion: async (sessionId: string, expectedCurrentIndex: number) => {
    const session = get().currentSession;
    if (!session) return;

    const nextIndex = expectedCurrentIndex + 1;
    const isLast = nextIndex >= session.question_ids.length;

    const { data, error } = await supabase
      .from('game_session')
      .update({
        current_question_index: nextIndex,
        question_started_at: new Date().toISOString(),
        status: isLast ? 'completed' : 'in_progress',
        ended_at: isLast ? new Date().toISOString() : null,
      })
      .eq('id', sessionId)
      .eq('current_question_index', expectedCurrentIndex) // ← only succeeds if nothing else already advanced it
      .select()
      .maybeSingle();

    if (error) {
      console.error('advanceQuestion error:', error);
      return;
    }

    // If data is null, another call already advanced this session first — that's fine, ignore silently
    if (data) set({ currentSession: data });
  },

  endSession: async (sessionId: string) => {
    await supabase.from('game_session').update({ status: 'completed', ended_at: new Date().toISOString() }).eq('id', sessionId);
  },

  findActiveSession: async (familyId, memberId) => {
  const { data: participantRows } = await supabase
    .from('game_participant').select('session_id').eq('member_id', memberId);
  const sessionIds = (participantRows ?? []).map((p) => p.session_id);
  if (sessionIds.length === 0) return null;

  const { data } = await supabase
    .from('game_session')
    .select('*')
    .in('id', sessionIds)
    .eq('family_id', familyId)
    .in('status', ['waiting', 'in_progress', 'paused'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ?? null;
},

// inviteAndStart: async (familyId, createdBy, memberId, gameType, invitedMemberIds, options) => {
//   set({ loading: true, error: null, dailyLimitReached: false });
//   try {
//     const { data, error } = await supabase.functions.invoke('generate-game-questions', {
//       body: { family_id: familyId, game_type: gameType, ...options },
//     });
//     if (error) {
//       const status = (error as any)?.context?.status;
//       if (status === 429) { set({ dailyLimitReached: true, loading: false }); return null; }
//       throw error;
//     }

//     const { data: session, error: sErr } = await supabase
//       .from('game_session')
//       .insert([{
//         family_id: familyId, game_type: gameType, mode: 'multiplayer',
//         question_ids: data.question_ids, created_by: createdBy,
//         status: 'waiting', invited_member_ids: invitedMemberIds,
//         lobby_deadline: new Date(Date.now() + 90000).toISOString(),
//       }])
//       .select().single();
//     if (sErr) throw sErr;

//     const { data: participant, error: pErr } = await supabase
//       .from('game_participant')
//       .insert([{ session_id: session.id, member_id: memberId }])
//       .select()
//       .single();
//     if (pErr) throw pErr;

//     const { data: questions } = await supabase.from('game_question').select('id, question, options, explanation').in('id', data.question_ids);
//     const ordered = data.question_ids.map((id: string) => questions?.find((q) => q.id === id)).filter(Boolean);

//     for (const invitedId of invitedMemberIds) {
//       await notifyAssignment({
//         familyId,
//         assigneeMemberId: invitedId,
//         type: 'family_update',
//         priority: 'important',
//         assigneeMessage: {
//           title: 'You\'ve been invited to play',
//           body: `You've been invited to join a ${gameType} game.`,
//         },
//         othersMessage: {
//           title: 'Game invitation sent',
//           body: `A family member has been invited to join a ${gameType} game.`,
//         },
//         actionLabel: 'Go to lobby',
//         actionRoute: `/(stack)/games/lobby?sessionId=${session.id}`,
//       });
//     }

//     set({
//       currentSession: session,
//       questions: ordered,
//       loading: false,
//       participants: [{ ...participant, member: undefined }],
//     });
//     return session;
//   } catch (error) {
//     set({ error: error instanceof Error ? error.message : 'Failed to start game', loading: false });
//     return null;
//   }
// },

cancelSession: async (sessionId: string) => {
  await supabase.from('game_session').update({ status: 'cancelled' }).eq('id', sessionId);
},

pauseSession: async (sessionId: string) => {
  const { data } = await supabase
    .from('game_session')
    .update({ status: 'paused', paused_at: new Date().toISOString() })
    .eq('id', sessionId).select().single();
  if (data) set({ currentSession: data });
},

resumeSession: async (sessionId: string) => {
  const session = get().currentSession;
  if (!session?.paused_at || !session.question_started_at) return;

  const pausedMs = Date.now() - new Date(session.paused_at).getTime();
  const newStart = new Date(new Date(session.question_started_at).getTime() + pausedMs).toISOString();

  const { data } = await supabase
    .from('game_session')
    .update({ status: 'in_progress', question_started_at: newStart, paused_at: null })
    .eq('id', sessionId).select().single();
  if (data) set({ currentSession: data });
},

refreshParticipants: async (sessionId: string) => {
  const { data } = await supabase
    .from('game_participant')
    .select('*, member:member_id(name)')
    .eq('session_id', sessionId);
  if (data) set({ participants: data });
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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_answer', filter: `session_id=eq.${sessionId}` },
        () => {
          // Just trigger a lightweight refetch signal — the screen's own effect (watching answer count) reacts
          set((state) => ({ currentSession: state.currentSession ? { ...state.currentSession } : null }));
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

  // subscribeToInvites: (familyId: string, myUserId: string) => {
  //   const topic = `game-invites-${familyId}`;
  //   const existing = supabase.getChannels().find((ch) => ch.topic === `realtime:${topic}`);
  //   if (existing) return;

  //   const channel = supabase
  //       .channel(topic)
  //       .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_session', filter: `family_id=eq.${familyId}` },
  //       (payload) => {
  //           const session = payload.new as GameSession;
  //           console.log("payload",payload)
  //           if (session.mode !== 'multiplayer' || session.created_by === myUserId) return;

  //           const { showToast } = useToastStore.getState();
  //           showToast({
  //             title: 'Family Game Started!',
  //             body: `Someone started a ${GAME_META[session.game_type].label} game — join in!`,
  //             variant: 'info',
  //             actionRoute: `/(stack)/games/lobby?sessionId=${session.id}`, // ← was /games/play
  //           });
  //       }
  //       )
  //       .subscribe();
  //   },
}));