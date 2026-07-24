import { create } from 'zustand';
import { supabase } from '@/lib/_core/supabase';
import { notifyFamily } from '../services/notify';

export interface CalendarEvent {
  id: string;
  family_id: string;
  created_by: string;
  title: string;
  start_date: string;
  end_date: string;
  location?: string;
  color?: string;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  created_at: string;
  updated_at: string;
}

interface CalendarState {
  events: CalendarEvent[];
  loading: boolean;
  error: string | null;

  fetchEvents: (familyId: string) => Promise<void>;
  createEvent: (familyId: string, createdBy: string, event: Omit<CalendarEvent, 'id' | 'family_id' | 'created_by' | 'created_at' | 'updated_at'>) => Promise<CalendarEvent>;
  updateEvent: (eventId: string, updates: Partial<CalendarEvent>) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
  setError: (error: string | null) => void;
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  events: [],
  loading: false,
  error: null,

  fetchEvents: async (familyId: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('calendar_event')
        .select('*')
        .eq('family_id', familyId)
        .order('start_date', { ascending: true });

      if (error) throw error;
      set({ events: data || [], error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch events';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  createEvent: async (familyId: string, createdBy: string, event: Omit<CalendarEvent, 'id' | 'family_id' | 'created_by' | 'created_at' | 'updated_at'>) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('calendar_event')
        .insert([{ family_id: familyId, created_by: createdBy, ...event }])
        .select()
        .single();

      if (error) throw error;
      set((state) => ({ events: [data, ...state.events], error: null }));
      await notifyFamily({
        familyId,
        type: 'event_reminder',
        priority: 'informational',
        title: 'New family event',
        body: `"${data.title}" has been added — ${new Date(data.start_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}${data.location ? ` at ${data.location}` : ''}.`,
        actionLabel: 'View Calendar',
        actionRoute: '/(tabs)/calendar',
      });
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create event';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateEvent: async (eventId: string, updates: Partial<CalendarEvent>) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('calendar_event')
        .update(updates)
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw error;
      set((state) => ({
        events: state.events.map((e) => (e.id === eventId ? data : e)),
        error: null,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update event';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  deleteEvent: async (eventId: string) => {
    set({ loading: true });
    try {
      const { error } = await supabase.from('calendar_event').delete().eq('id', eventId);

      if (error) throw error;
      set((state) => ({ events: state.events.filter((e) => e.id !== eventId), error: null }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete event';
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
