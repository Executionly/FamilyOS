import { create } from 'zustand';
import { supabase } from '@/lib/_core/supabase';
import { notifyAssignment, notifyFamily } from '../services/notify';
import { embedContent } from '../services/embed-content';
import { useAuthStore } from './auth-store';
import { useFamilyStore } from './family-store';
import { useToastStore } from './toast-store';

export interface Commitment {
  id: string;
  family_id: string;
  created_by: string;
  title: string;
  description?: string;
  assigned_to?: string;
  due_date?: string;
  meeting_id?: string | null
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
}

interface CommitmentState {
  commitments: Commitment[];
  loading: boolean;
  error: string | null;

  fetchCommitments: (familyId: string) => Promise<void>;
  createCommitment: (familyId: string, createdBy: string, commitment: Omit<Commitment, 'id' | 'family_id' | 'created_by' | 'created_at' | 'updated_at'>) => Promise<Commitment>;
  updateCommitment: (commitmentId: string, updates: Partial<Commitment>) => Promise<void>;
  deleteCommitment: (commitmentId: string) => Promise<void>;
  setError: (error: string | null) => void;

  channel: ReturnType<typeof supabase.channel> | null;
  subscribeToRealtime: (familyId: string) => void;
  unsubscribeFromRealtime: () => void;
}

export const useCommitmentStore = create<CommitmentState>((set, get) => ({
  commitments: [],
  loading: false,
  error: null,

  channel: null,

  subscribeToRealtime: (familyId: string) => {
    const topic = `commitments-${familyId}`;

    const existing = supabase.getChannels().find((ch) => ch.topic === `realtime:${topic}`);
    if (existing) {
      supabase.removeChannel(existing);
    }
    const channel = supabase
      .channel(topic)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'commitment', filter: `family_id=eq.${familyId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newCommitment = payload.new as Commitment;
            const currentUserId = useAuthStore.getState().user?.id;

            set((state) => {
              if (state.commitments.some((c) => c.id === newCommitment.id)) return state;
              return { commitments: [newCommitment, ...state.commitments] };
            });

            if (newCommitment.created_by === currentUserId) return; // don't toast yourself

            const currentMember = useFamilyStore.getState().currentMember;
            if (currentMember && newCommitment.assigned_to === currentMember.id) {
              useToastStore.getState().showToast({
                title: 'New commitment assigned to you',
                body: newCommitment.title,
                variant: 'assigned',
                actionRoute: '/(tabs)/meetings',
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            set((state) => ({
              commitments: state.commitments.map((c) => (c.id === payload.new.id ? (payload.new as Commitment) : c)),
            }));
          } else if (payload.eventType === 'DELETE') {
            set((state) => ({
              commitments: state.commitments.filter((c) => c.id !== payload.old.id),
            }));
          }
        }
      )
      .subscribe();

    set({ channel });
  },

  unsubscribeFromRealtime: () => {
    const { channel } = get();
    if (channel) supabase.removeChannel(channel);
    set({ channel: null });
  },

  fetchCommitments: async (familyId: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('commitment')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ commitments: data || [], error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch commitments';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  createCommitment: async (familyId: string, createdBy: string, commitment: Omit<Commitment, 'id' | 'family_id' | 'created_by' | 'created_at' | 'updated_at'>) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('commitment')
        .insert([{ family_id: familyId, created_by: createdBy, ...commitment }])
        .select()
        .single();

      if (error) throw error;
      set((state) => ({ commitments: [data, ...state.commitments], error: null }));
      await notifyAssignment({
        familyId,
        assigneeMemberId: data.assigned_to, // member.id
        type: 'task_assigned',
        priority: 'important',
        assigneeMessage: {
          title: 'You have a new commitment',
          body: `"${data.title}" has been assigned to you${data.due_date ? ` — due ${new Date(data.due_date).toLocaleDateString()}` : ''}.`,
        },
        othersMessage: {
          title: 'New commitment added',
          body: `"${data.title}" has been added to the family commitments.`,
        },
        actionLabel: 'View',
        actionRoute: '/(tabs)/meetings',
      });
      embedContent({
        family_id: familyId,
        source_type: 'commitment',
        source_id: data.id,
        content: `Commitment: ${data.title}. ${data.description ?? ''}${data.due_date ? ` Due ${new Date(data.due_date).toLocaleDateString()}.` : ''}`,
      });
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create commitment';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateCommitment: async (commitmentId: string, updates: Partial<Commitment>) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('commitment')
        .update(updates)
        .eq('id', commitmentId)
        .select()
        .single();

      if (error) throw error;
      set((state) => ({
        commitments: state.commitments.map((c) => (c.id === commitmentId ? data : c)),
        error: null,
      }));
      if (updates.status === 'completed') {
        await notifyFamily({
          familyId: data?.family_id,
          type: 'family_update',
          priority: 'informational',
          title: 'Commitment completed ✓',
          body: `"${data?.title}" has been marked as done.`,
          actionLabel: 'View',
          actionRoute: '/(tabs)/meetings',
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update commitment';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  deleteCommitment: async (commitmentId: string) => {
    set({ loading: true });
    try {
      const { error } = await supabase.from('commitment').delete().eq('id', commitmentId);

      if (error) throw error;
      set((state) => ({ commitments: state.commitments.filter((c) => c.id !== commitmentId), error: null }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete commitment';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  setError: (error: string | null) => {
    set({ error });
  },
}));
