import { create } from 'zustand';
import { supabase } from '@/lib/_core/supabase';
import { notifyAssignment, notifyFamily } from '../services/notify';
import { embedContent } from '../services/embed-content';
import { checkStorageBeforeUpload, checkVideoQuota, getFileSizeBytes, recordUpload, StorageLimitError, VideoLimitError } from '@/utils/storage-gate';


export interface Memory {
  id: string;
  family_id: string;
  created_by: string;
  type: 'photo' | 'clip' | 'note';
  media_url?: string;
  caption?: string;
  member_tags: string[];
  event_date: string;
  created_at: string;
  updated_at: string;
}

interface MemoriesState {
  memories: Memory[];
  loading: boolean;
  uploading: boolean;
  error: string | null;
  fetchMemories: (familyId: string) => Promise<void>;
  fetchFamilyMembers: (familyId: string) => Promise<any[]>;
  createMemory: (memory: Partial<Memory>) => Promise<Memory>;
  updateMemory: (id: string, updates: Partial<Memory>) => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;
  uploadMemoryMedia: (
    familyId: string,
    userId: string,
    fileUri: string,
    mimeType: string,
    fileName: string,
    mediaType: 'photo' | 'video'
  ) => Promise<string>; // returns the storage path
  getSignedUrl: (storagePath: string) => Promise<string | null>;
}

export const useMemoriesStore = create<MemoriesState>((set) => ({
  memories: [],
  loading: false,
  uploading: false,
  error: null,

  fetchMemories: async (familyId) => {
    set({ loading: true });
    try {
      // Fetch memories and family members in parallel
      const [memoriesRes, membersRes] = await Promise.all([
        supabase
          .from('memory')
          .select('*')
          .eq('family_id', familyId)
          .order('event_date', { ascending: false }),
        supabase
          .from('member')
          .select('id, name')
          .eq('family_id', familyId),
      ]);

      if (memoriesRes.error) throw memoriesRes.error;

      const members = membersRes.data || [];

      // Build id → name map
      const memberMap = new Map(members.map((m) => [m.id, m.name]));

      // Replace member IDs in member_tags with names
      const memories = (memoriesRes.data || []).map((memory) => ({
        ...memory,
        member_tags: (memory.member_tags || []).map(
          (id: string) => memberMap.get(id) || id // fallback to id if not found
        ),
      }));

      set({ memories, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch memories';
      set({ error: message });
    } finally {
      set({ loading: false });
    }
  },

  createMemory: async (memory) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('memory')
        .insert(memory)
        .select()
        .single();
      if (error) throw error;
      set((state) => ({ memories: [data, ...state.memories], error: null }));
      // ── Notifications ──────────────────────────────────────
      const taggedMemberIds: string[] = memory.member_tags || [];
 
      if (taggedMemberIds.length === 0) {
        // No tags — just tell the family a memory was added
        await notifyFamily({
          familyId: data.family_id,
          type: 'family_update',
          priority: 'informational',
          title: 'New memory added',
          body: data.caption
            ? `"${data.caption}" has been added to the family memories.`
            : 'A new memory has been added to your family timeline.',
          actionLabel: 'View Memory',
          actionRoute: '/(tabs)/legacy',
        });
      } else {
        // Send personalized notification to each tagged member
        // and a family-wide update for everyone else
        for (const memberId of taggedMemberIds) {
          await notifyAssignment({
            familyId: data.family_id,
            assigneeMemberId: memberId,
            type: 'family_update',
            priority: 'informational',
            assigneeMessage: {
              title: "You've been tagged in a memory",
              body: data.caption
                ? `You were tagged in "${data.caption}".`
                : 'You were tagged in a new family memory.',
            },
            othersMessage: {
              title: 'New memory added',
              body: data.caption
                ? `"${data.caption}" has been added to the family memories.`
                : 'A new memory has been added to your family timeline.',
            },
            actionLabel: 'View Memory',
            actionRoute: '/(tabs)/legacy',
          });
        }
      }
      if (memory.caption?.trim()) {
        embedContent({
          family_id: data.family_id,
          source_type: 'memory',
          source_id: data.id,
          content: data.caption,
        });
      }
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create memory';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateMemory: async (id, updates) => {
    set({ loading: true });
    try {
      const { error } = await supabase.from('memory').update(updates).eq('id', id);
      if (error) throw error;
      set((state) => ({
        memories: state.memories.map((m) => (m.id === id ? { ...m, ...updates } : m)),
        error: null,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update memory';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  deleteMemory: async (id) => {
    set({ loading: true });
    try {
      // Also delete the file from storage if media_url exists
      const memory = (await supabase.from('memory').select('media_url').eq('id', id).single()).data;
      if (memory?.media_url) {
        await supabase.storage.from('family-memories').remove([memory.media_url]);
      }

      const { error } = await supabase.from('memory').delete().eq('id', id);
      if (error) throw error;
      set((state) => ({
        memories: state.memories.filter((m) => m.id !== id),
        error: null,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete memory';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  uploadMemoryMedia: async (familyId, fileUri,userId, mimeType, fileName, mediaType: 'photo' | 'video') => {
    set({ uploading: true });
    try {
      const fileSizeBytes = await getFileSizeBytes(fileUri);
      await checkStorageBeforeUpload(familyId, fileSizeBytes);

      if (mediaType === 'video') {
        await checkVideoQuota(familyId); // separate check, video-specific
      }

      const storagePath = `${familyId}/${Date.now()}_${fileName}`;

      const formData = new FormData();
      formData.append('file', {
        uri: fileUri,
        name: fileName,
        type: mimeType,
      } as any);

      const { error } = await supabase.storage
        .from('family-memories')
        .upload(storagePath, formData, {
          contentType: mimeType,
          upsert: false,
        });

      if (error) throw error;
      await recordUpload({
        familyId, bucket: 'family-memories', storagePath, sizeBytes: fileSizeBytes,
        sourceType: 'memory', createdBy: userId,
      });

      return storagePath;
    } catch (error) {
       if (error instanceof StorageLimitError || error instanceof VideoLimitError) {
        set({ uploading: false });
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Failed to upload media';
      set({ error: message });
      throw error;
    } finally {
      set({ uploading: false });
    }
  },

  getSignedUrl: async (storagePath) => {
    try {
      const { data, error } = await supabase.storage
        .from('family-memories')
        .createSignedUrl(storagePath, 60 * 60); // 1 hour expiry
      if (error) throw error;
      return data.signedUrl;
    } catch {
      return null;
    }
  },

  fetchFamilyMembers: async (familyId) => {
    const { data, error } = await supabase
        .from('member')
        .select('id, name, role')
        .eq('family_id', familyId)
        // .neq('role', 'child'); // children have no login — optional filter
    if (error) throw error;
    return data || [];
    },
}));
