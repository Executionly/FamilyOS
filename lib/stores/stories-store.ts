import { create } from 'zustand';
import { supabase } from '@/lib/_core/supabase';
import { notifyAssignment, notifyFamily } from '../services/notify';

export interface Story {
  id: string;
  family_id: string;
  created_by: string;
  title: string;
  body: string;
  member_tags: string[];
  created_at: string;
  updated_at: string;
}

interface StoriesState {
  stories: Story[];
  loading: boolean;
  error: string | null;
  fetchStories: (familyId: string) => Promise<void>;
  createStory: (story: Partial<Story>) => Promise<Story>;
  updateStory: (id: string, updates: Partial<Story>) => Promise<void>;
  deleteStory: (id: string) => Promise<void>;
}

export const useStoriesStore = create<StoriesState>((set, get) => ({
  stories: [],
  loading: false,
  error: null,
  fetchStories: async (familyId) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('story')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      set({ stories: data || [], error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch stories';
      set({ error: message });
    } finally {
      set({ loading: false });
    }
  },
  createStory: async (story) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('story')
        .insert(story)
        .select()
        .single();
      if (error) throw error;
      set((state) => ({ stories: [data, ...state.stories], error: null }));
      // ── Notifications ──────────────────────────────────────
      const taggedMemberIds: string[] = story.member_tags || [];
 
      if (taggedMemberIds.length === 0) {
        await notifyFamily({
          familyId: data.family_id,
          type: 'family_update',
          priority: 'informational',
          title: 'New family story',
          body: `"${data.title}" has been added to your family story archive.`,
          actionLabel: 'Read Story',
          actionRoute: '/(tabs)/legacy',
        });
      } else {
        for (const memberId of taggedMemberIds) {
          await notifyAssignment({
            familyId: data.family_id,
            assigneeMemberId: memberId,
            type: 'family_update',
            priority: 'informational',
            assigneeMessage: {
              title: "You're featured in a new story",
              body: `You were mentioned in "${data.title}".`,
            },
            othersMessage: {
              title: 'New family story',
              body: `"${data.title}" has been added to your family story archive.`,
            },
            actionLabel: 'Read Story',
            actionRoute: '/(tabs)/legacy',
          });
        }
      }
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create story';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  updateStory: async (id, updates) => {
    set({ loading: true });
    try {
      const { error } = await supabase
        .from('story')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
      set((state) => ({
        stories: state.stories.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        error: null,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update story';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  deleteStory: async (id) => {
    set({ loading: true });
    try {
      const { error } = await supabase.from('story').delete().eq('id', id);
      if (error) throw error;
      set((state) => ({
        stories: state.stories.filter((s) => s.id !== id),
        error: null,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete story';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
}));
