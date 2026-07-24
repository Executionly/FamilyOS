import { create } from 'zustand';
import { supabase } from '@/lib/_core/supabase';

export type NotificationType =
  | 'task_assigned'
  | 'task_due_soon'
  | 'task_overdue'
  | 'event_reminder'
  | 'family_update'
  | 'ai_suggestion'
  | 'meeting_starting'
  | 'commitment_due'
  | 'chore_overdue'
  | 'weekly_summary'
  | 'security_alert';

export type NotificationPriority = 'critical' | 'important' | 'informational';

export interface AppNotification {
  id: string;
  family_id: string;
  user_id: string | null;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string;
  action_label: string | null;
  action_route: string | null;
  is_read: boolean;
  sent_at: string;
  created_at: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  family_id: string;
  push_enabled: boolean;
  push_tasks: boolean;
  push_events: boolean;
  push_family_updates: boolean;
  push_ai_suggestions: boolean;
  push_security: boolean;
  email_enabled: boolean;
  email_weekly_summary: boolean;
  email_monthly_report: boolean;
  email_security: boolean;
}

interface NotificationState {
  notifications: AppNotification[];
  preferences: NotificationPreferences | null;
  loading: boolean;
  prefsLoading: boolean;
  error: string | null;

  // Computed
  unreadCount: () => number;

  // Actions
  fetchNotifications: (familyId: string) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: (familyId: string) => Promise<void>;
  fetchPreferences: (userId: string, familyId: string) => Promise<void>;
  updatePreferences: (updates: Partial<NotificationPreferences>) => Promise<void>;
  setError: (error: string | null) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  preferences: null,
  loading: false,
  prefsLoading: false,
  error: null,

  unreadCount: () => {
    return get().notifications.filter((n) => !n.is_read).length;
  },

  fetchNotifications: async (familyId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('family_id', familyId)
        .order('sent_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      set({ notifications: data || [], error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load notifications';
      set({ error: message });
    } finally {
      set({ loading: false });
    }
  },

  markAsRead: async (notificationId: string) => {
    // Optimistic update
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === notificationId ? { ...n, is_read: true } : n
      ),
    }));

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      // Revert optimistic update on failure
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === notificationId ? { ...n, is_read: false } : n
        ),
        error: error instanceof Error ? error.message : 'Failed to mark as read',
      }));
    }
  },

  markAllAsRead: async (familyId: string) => {
    // Optimistic update
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
    }));

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('family_id', familyId)
        .eq('is_read', false);

      if (error) throw error;
    } catch (error) {
      // Re-fetch to revert on failure
      const { family_id } = get().notifications[0] || { family_id: familyId };
      await get().fetchNotifications(family_id);
      set({ error: error instanceof Error ? error.message : 'Failed to mark all as read' });
    }
  },

  fetchPreferences: async (userId: string, familyId: string) => {
    set({ prefsLoading: true });
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // Row doesn't exist yet — create default preferences
        const { data: newPrefs, error: insertError } = await supabase
          .from('notification_preferences')
          .insert({
            user_id: userId,
            family_id: familyId,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        set({ preferences: newPrefs });
        return;
      }

      if (error) throw error;
      set({ preferences: data });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load preferences';
      set({ error: message });
    } finally {
      set({ prefsLoading: false });
    }
  },

  updatePreferences: async (updates: Partial<NotificationPreferences>) => {
    const current = get().preferences;
    if (!current) return;

    // Optimistic update
    set({ preferences: { ...current, ...updates } });

    try {
      const { error } = await supabase
        .from('notification_preferences')
        .update(updates)
        .eq('user_id', current.user_id);

      if (error) throw error;
    } catch (error) {
      // Revert
      set({
        preferences: current,
        error: error instanceof Error ? error.message : 'Failed to update preferences',
      });
    }
  },

  setError: (error: string | null) => set({ error }),
}));