import { create } from 'zustand';
import { supabase } from '@/lib/_core/supabase';
import { notifyAssignment, notifyFamily } from '../services/notify';

export interface Chore {
  id: string;
  family_id: string;
  created_by: string;
  title: string;
  description?: string;
  assigned_to?: string;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly';
  due_date?: string;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  points?: number;
  created_at: string;
  updated_at: string;
}

interface ChoreState {
  chores: Chore[];
  loading: boolean;
  error: string | null;

  fetchChores: (familyId: string) => Promise<void>;
  createChore: (familyId: string, createdBy: string, chore: Omit<Chore, 'id' | 'family_id' | 'created_by' | 'created_at' | 'updated_at'>) => Promise<Chore>;
  updateChore: (choreId: string, updates: Partial<Chore>) => Promise<void>;
  deleteChore: (choreId: string) => Promise<void>;
  setError: (error: string | null) => void;
}

export const useChoreStore = create<ChoreState>((set, get) => ({
  chores: [],
  loading: false,
  error: null,

  fetchChores: async (familyId: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('chore')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ chores: data || [], error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch chores';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  createChore: async (familyId: string, createdBy: string, chore: Omit<Chore, 'id' | 'family_id' | 'created_by' | 'created_at' | 'updated_at'>) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('chore')
        .insert([{ family_id: familyId, created_by: createdBy, ...chore }])
        .select()
        .single();

      if (error) throw error;
      set((state) => ({ chores: [data, ...state.chores], error: null }));
      await notifyAssignment({
        familyId,
        assigneeMemberId: data.assigned_to, // member.id
        type: 'task_assigned',
        priority: 'important',
        assigneeMessage: {
          title: 'New chore assigned to you',
          body: `"${data.title}" has been assigned to you${data.due_date ? ` — due ${new Date(data.due_date).toLocaleDateString()}` : ''}.`,
        },
        othersMessage: {
          title: 'Chore assigned',
          body: `"${data.title}" has been assigned to a family member.`,
        },
        actionLabel: 'View Chores',
        actionRoute: '/(tabs)',
      });
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create chore';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateChore: async (choreId: string, updates: Partial<Chore>) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('chore')
        .update(updates)
        .eq('id', choreId)
        .select()
        .single();

      if (error) throw error;
      set((state) => ({
        chores: state.chores.map((c) => (c.id === choreId ? data : c)),
        error: null,
      }));
      if (updates.status === 'completed') {
        await notifyFamily({
          familyId: data?.family_id,
          type: 'family_update',
          priority: 'informational',
          title: 'Chore completed ✓',
          body: `"${data?.title}" has been marked as done.`,
          actionRoute: '/(tabs)',
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update chore';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  deleteChore: async (choreId: string) => {
    set({ loading: true });
    try {
      const { error } = await supabase.from('chore').delete().eq('id', choreId);

      if (error) throw error;
      set((state) => ({ chores: state.chores.filter((c) => c.id !== choreId), error: null }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete chore';
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
