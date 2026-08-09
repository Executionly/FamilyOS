import { create } from 'zustand';
import { supabase } from '@/lib/_core/supabase';
import { embedContent } from '../services/embed-content';

export interface Charter {
  id: string;
  family_id: string;
  mission: string;
  vision: string;
  values: string[];
  constitution: string;
  created_at: string;
  updated_at: string;
}

interface CharterState {
  // State
  charter: Charter | null;
  loading: boolean;
  error: string | null;
  draftMission: string;
  draftVision: string;
  draftValues: string[];
  draftConstitution: string;
  aiSuggestions: {
    mission?: string;
    vision?: string;
    values?: string[];
    constitution?: string;
  };

  // Actions
  fetchCharter: (familyId: string) => Promise<void>;
  createCharter: (familyId: string, charter: Omit<Charter, 'id' | 'family_id' | 'created_at' | 'updated_at'>) => Promise<Charter>;
  updateCharter: (charterId: string, updates: Partial<Charter>) => Promise<void>;
  setDraftMission: (mission: string) => void;
  setDraftVision: (vision: string) => void;
  setDraftValues: (values: string[]) => void;
  setDraftConstitution: (constitution: string) => void;
  addValue: (value: string) => void;
  removeValue: (index: number) => void;
  setAISuggestions: (suggestions: Partial<CharterState['aiSuggestions']>) => void;
  clearDrafts: () => void;
  setError: (error: string | null) => void;
}

export const useCharterStore = create<CharterState>((set, get) => ({
  charter: null,
  loading: false,
  error: null,
  draftMission: '',
  draftVision: '',
  draftValues: [],
  draftConstitution: '',
  aiSuggestions: {},

  fetchCharter: async (familyId: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('charter')
        .select('*')
        .eq('family_id', familyId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned (expected for new families)
        throw error;
      }

      set({ charter: data || null, error: null });
      set({draftConstitution: data?.constitution})
      set({draftMission: data?.mission})
      set({draftVision: data?.vision})
      set({draftValues: data?.values})
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch charter';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  createCharter: async (familyId: string, charter: Omit<Charter, 'id' | 'family_id' | 'created_at' | 'updated_at'>) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('charter')
        .insert([
          {
            family_id: familyId,
            ...charter,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      set({ charter: data, error: null });

      embedContent({
        family_id: familyId,
        source_type: 'charter',
        source_id: data.id,
        content: `Vision\n\n${charter.vision}\n\nMission\n\n${charter.mission}\n\nConstitution\n\n${charter.constitution}\n\nValues\n\n${charter.values}`,
      });
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create charter';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateCharter: async (charterId: string, updates: Partial<Charter>) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('charter')
        .update(updates)
        .eq('id', charterId)
        .select()
        .single();

      if (error) throw error;

      set({ charter: data, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update charter';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  setDraftMission: (mission: string) => {
    set({ draftMission: mission });
  },

  setDraftVision: (vision: string) => {
    set({ draftVision: vision });
  },

  setDraftValues: (values: string[]) => {
    set({ draftValues: values });
  },

  setDraftConstitution: (constitution: string) => {
    set({ draftConstitution: constitution });
  },

  addValue: (value: string) => {
    set((state) => ({
      draftValues: [...(state.draftValues ?? []), value],
    }));
  },

  removeValue: (index: number) => {
    set((state) => ({
      draftValues: state.draftValues.filter((_, i) => i !== index),
    }));
  },

  setAISuggestions: (suggestions: Partial<CharterState['aiSuggestions']>) => {
    set((state) => ({
      aiSuggestions: {
        ...state.aiSuggestions,
        ...suggestions,
      },
    }));
  },

  clearDrafts: () => {
    set({
      draftMission: '',
      draftVision: '',
      draftValues: [],
      draftConstitution: '',
      aiSuggestions: {},
    });
  },

  setError: (error: string | null) => {
    set({ error });
  },
}));
