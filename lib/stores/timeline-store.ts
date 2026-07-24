import { create } from 'zustand';
import { supabase } from '@/lib/_core/supabase';

export interface TimelineEvent {
  id: string;
  family_id: string;
  ref_type: 'memory' | 'story' | 'milestone';
  ref_id: string;
  date: string;
  title: string;
  description?: string;
  created_at: string;
}

interface TimelineState {
  events: TimelineEvent[];
  loading: boolean;
  error: string | null;
  fetchTimeline: (familyId: string) => Promise<void>;
  createTimelineEvent: (event: Partial<TimelineEvent>) => Promise<TimelineEvent>;
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
  events: [],
  loading: false,
  error: null,
  fetchTimeline: async (familyId) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('timeline_event')
        .select('*')
        .eq('family_id', familyId)
        .order('date', { ascending: false });
      if (error) throw error;
      set({ events: data || [], error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch timeline';
      set({ error: message });
    } finally {
      set({ loading: false });
    }
  },
  createTimelineEvent: async (event) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('timeline_event')
        .insert(event)
        .select()
        .single();
      if (error) throw error;
      set((state) => ({ events: [data, ...state.events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), error: null }));
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create timeline event';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
}));
