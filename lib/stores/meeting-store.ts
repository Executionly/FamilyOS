import { create } from 'zustand';
import { supabase } from '@/lib/_core/supabase';
import { notifyFamily } from '../services/notify';

export interface Meeting {
  id: string;
  family_id: string;
  title: string;
  description?: string;
  scheduled_date: string;
  duration_minutes: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface MeetingAgenda {
  id: string;
  meeting_id: string;
  title: string;
  description?: string;
  order: number;
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface MeetingSummary {
  id: string;
  meeting_id: string;
  summary_text: string;
  key_decisions: string[];
  action_items: string[];
  created_at: string;
}

interface MeetingState {
  meetings: Meeting[];
  currentMeeting: Meeting | null;
  agendaItems: MeetingAgenda[];
  summary: MeetingSummary | null;
  loading: boolean;
  error: string | null;

  fetchMeetings: (familyId: string) => Promise<void>;
  fetchMeeting: (meetingId: string) => Promise<void>;
  createMeeting: (familyId: string, meeting: Omit<Meeting, 'id' | 'family_id' | 'created_at' | 'updated_at'>) => Promise<Meeting>;
  updateMeeting: (meetingId: string, updates: Partial<Meeting>) => Promise<void>;
  deleteMeeting: (meetingId: string) => Promise<void>;
  fetchAgenda: (meetingId: string) => Promise<void>;
  addAgendaItem: (meetingId: string, item: Omit<MeetingAgenda, 'id' | 'meeting_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateAgendaItem: (agendaId: string, updates: Partial<MeetingAgenda>) => Promise<void>;
  deleteAgendaItem: (agendaId: string) => Promise<void>;
  fetchSummary: (meetingId: string) => Promise<void>;
  createSummary: (meetingId: string, summary: Omit<MeetingSummary, 'id' | 'created_at'>) => Promise<void>;
  setError: (error: string | null) => void;
}

export const useMeetingStore = create<MeetingState>((set, get) => ({
  meetings: [],
  currentMeeting: null,
  agendaItems: [],
  summary: null,
  loading: false,
  error: null,

  fetchMeetings: async (familyId: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('meeting')
        .select('*')
        .eq('family_id', familyId)
        .order('scheduled_date', { ascending: false });

      if (error) throw error;
      set({ meetings: data || [], error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch meetings';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  fetchMeeting: async (meetingId: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('meeting')
        .select('*')
        .eq('id', meetingId)
        .single();

      if (error) throw error;
      set({ currentMeeting: data, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch meeting';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  createMeeting: async (familyId: string, meeting: Omit<Meeting, 'id' | 'family_id' | 'created_at' | 'updated_at'>) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('meeting')
        .insert([{ family_id: familyId, ...meeting }])
        .select()
        .single();

      if (error) throw error;
      set((state) => ({ meetings: [data, ...state.meetings], error: null }));
      // ── Notify all family members ──────────────────────────
      await notifyFamily({
        familyId,
        type: 'meeting_starting',
        priority: 'important',
        title: '📅 Family meeting scheduled',
        body: `"${data.title}" is scheduled for ${new Date(data.scheduled_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}.`,
        actionLabel: 'View Meeting',
        actionRoute: '/(tabs)/meetings',
      });
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create meeting';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateMeeting: async (meetingId: string, updates: Partial<Meeting>) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('meeting')
        .update(updates)
        .eq('id', meetingId)
        .select()
        .single();

      if (error) throw error;
      set((state) => ({
        meetings: state.meetings.map((m) => (m.id === meetingId ? data : m)),
        currentMeeting: state.currentMeeting?.id === meetingId ? data : state.currentMeeting,
        error: null,
      }));

      // ── Notify if meeting is completed ────────────────────
      if (updates.status === 'completed') {
        await notifyFamily({
          familyId: data.family_id,
          type: 'family_update',
          priority: 'informational',
          title: 'Meeting completed',
          body: `"${data.title}" has been completed. Check the summary for key decisions.`,
          actionLabel: 'View Summary',
          actionRoute: '/(tabs)/meetings',
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update meeting';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  deleteMeeting: async (meetingId: string) => {
    set({ loading: true });
    try {
      const { error } = await supabase.from('meeting').delete().eq('id', meetingId);

      if (error) throw error;
      set((state) => ({ meetings: state.meetings.filter((m) => m.id !== meetingId), error: null }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete meeting';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  fetchAgenda: async (meetingId: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('meeting_agenda')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('order', { ascending: true });

      if (error) throw error;
      set({ agendaItems: data || [], error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch agenda';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  addAgendaItem: async (meetingId: string, item: Omit<MeetingAgenda, 'id' | 'meeting_id' | 'created_at' | 'updated_at'>) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('meeting_agenda')
        .insert([{ meeting_id: meetingId, ...item }])
        .select()
        .single();

      if (error) throw error;
      set((state) => ({ agendaItems: [...state.agendaItems, data], error: null }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add agenda item';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateAgendaItem: async (agendaId: string, updates: Partial<MeetingAgenda>) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('meeting_agenda')
        .update(updates)
        .eq('id', agendaId)
        .select()
        .single();

      if (error) throw error;
      set((state) => ({ agendaItems: state.agendaItems.map((a) => (a.id === agendaId ? data : a)), error: null }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update agenda item';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  deleteAgendaItem: async (agendaId: string) => {
    set({ loading: true });
    try {
      const { error } = await supabase.from('meeting_agenda').delete().eq('id', agendaId);

      if (error) throw error;
      set((state) => ({ agendaItems: state.agendaItems.filter((a) => a.id !== agendaId), error: null }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete agenda item';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  fetchSummary: async (meetingId: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('meeting_summary')
        .select('*')
        .eq('meeting_id', meetingId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      set({ summary: data || null, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch summary';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  createSummary: async (meetingId: string, summary: Omit<MeetingSummary, 'id' | 'created_at' | 'meeting_id'>) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('meeting_summary')
        .insert([{ meeting_id: meetingId, ...summary }])
        .select()
        .single();

      if (error) throw error;
      set({ summary: data, error: null });
      // ── Notify family that summary is ready ───────────────
      // Get the meeting's family_id first
      const meeting = get().meetings.find((m) => m.id === meetingId)
        || get().currentMeeting;
 
      if (meeting) {
        await notifyFamily({
          familyId: meeting.family_id,
          type: 'ai_suggestion',
          priority: 'informational',
          title: 'Meeting summary ready',
          body: `The AI summary for "${meeting.title}" is ready. ${summary.key_decisions?.length ? `${summary.key_decisions.length} key decision(s) recorded.` : ''}`,
          actionLabel: 'View Summary',
          actionRoute: '/(tabs)/meetings',
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create summary';
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
