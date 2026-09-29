import { create } from 'zustand';
import { supabase } from '@/lib/_core/supabase';
import { GAME_META } from '@/constants/games';

export interface GameInvite {
  sessionId: string;
  gameType: 'bible_trivia' | 'quiz' | 'family_feud';
  hostName: string;
}

interface GameInviteState {
  invites: GameInvite[];
  channel: ReturnType<typeof supabase.channel> | null;
  subscribe: (familyId: string, myMemberId: string) => void;
  unsubscribe: () => void;
  dismissInvite: (sessionId: string) => void;
}

export const useGameInviteStore = create<GameInviteState>((set, get) => ({
  invites: [],
  channel: null,

  subscribe: (familyId: string, myMemberId: string) => {
    const topic = `game-invites-${familyId}`;
    const existing = supabase.getChannels().find((ch) => ch.topic === `realtime:${topic}`);
    if (existing) return;

    const channel = supabase
      .channel(topic)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_session', filter: `family_id=eq.${familyId}` },
        async (payload) => {
          const session = payload.new as any;
          if (session.mode !== 'multiplayer') return;
          if (!session.invited_member_ids?.includes(myMemberId)) return; // only actual invitees

          const { data: host } = await supabase.from('member').select('name').eq('id', session.created_by_member_id ?? '').maybeSingle();
          // Fallback: resolve host name via created_by (auth user id) -> member
          let hostName = host?.name;
          if (!hostName) {
            const { data: hostMember } = await supabase
              .from('member').select('name').eq('user_id', session.created_by).eq('family_id', familyId).maybeSingle();
            hostName = hostMember?.name ?? 'A family member';
          }

          set((state) => {
            if (state.invites.some((i) => i.sessionId === session.id)) return state; // avoid dupes
            return {
              invites: [...state.invites, { sessionId: session.id, gameType: session.game_type, hostName }],
            };
          });
        }
      )
      // Auto-remove an invite if the session gets cancelled (e.g. lobby timed out) or started without me
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_session', filter: `family_id=eq.${familyId}` },
        (payload) => {
          const session = payload.new as any;
          if (session.status !== 'waiting') {
            set((state) => ({ invites: state.invites.filter((i) => i.sessionId !== session.id) }));
          }
        }
      )
      .subscribe();

    set({ channel });
  },

  unsubscribe: () => {
    const { channel } = get();
    if (channel) supabase.removeChannel(channel);
    set({ channel: null, invites: [] });
  },

  dismissInvite: (sessionId: string) => {
    set((state) => ({ invites: state.invites.filter((i) => i.sessionId !== sessionId) }));
  },
}));