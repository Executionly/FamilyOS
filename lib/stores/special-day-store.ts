import { create } from 'zustand';
import { supabase } from '@/lib/_core/supabase';

export interface SpecialDay {
  id: string;
  family_id: string;
  title: string;
  type: 'birthday' | 'anniversary' | 'other';
  month: number;
  day: number;
  related_member_ids: string[];
  notes: string | null;
  auto_generated: boolean;
}

interface SpecialDayState {
  specialDays: SpecialDay[];
  loading: boolean;
  error: string | null;
  fetchSpecialDays: (familyId: string) => Promise<void>;
  createSpecialDay: (
    familyId: string, createdBy: string,
    data: { title: string; type: 'anniversary' | 'other'; month: number; day: number; related_member_ids?: string[]; notes?: string }
  ) => Promise<void>;
  deleteSpecialDay: (id: string) => Promise<void>;
}

export const useSpecialDayStore = create<SpecialDayState>((set) => ({
  specialDays: [],
  loading: false,
  error: null,

  fetchSpecialDays: async (familyId: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('special_day')
        .select('*')
        .eq('family_id', familyId)
        .order('month')
        .order('day');
      if (error) throw error;
      set({ specialDays: data || [], error: null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load special days' });
    } finally {
      set({ loading: false });
    }
  },

  createSpecialDay: async (familyId, createdBy, data) => {
    set({ loading: true });
    try {
      const { error } = await supabase.from('special_day').insert([{
        family_id: familyId, created_by: createdBy, auto_generated: false, ...data,
      }]);
      if (error) throw error;
      await useSpecialDayStore.getState().fetchSpecialDays(familyId);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to add special day' });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  deleteSpecialDay: async (id: string) => {
    try {
      const { error } = await supabase.from('special_day').delete().eq('id', id).eq('auto_generated', false);
      if (error) throw error;
      set((state) => ({ specialDays: state.specialDays.filter((sd) => sd.id !== id) }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete' });
      throw error;
    }
  },
}));