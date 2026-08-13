import { create } from 'zustand';
import { supabase } from '@/lib/_core/supabase';
import { embedContent } from '../services/embed-content';
import { notifyMember } from '../services/notify';
import { checkStorageBeforeUpload, getFileSizeBytes, recordUpload, StorageLimitError } from '@/utils/storage-gate';

export class MemberLimitError extends Error {
  constructor() {
    super('member_limit_exceeded');
  }
}

export type MemberRole = 'admin' | 'coparent' | 'member' | 'child' | string;
export type AgeBand = 'toddler' | 'child' | 'preteen' | 'teen' | 'adult' | string;

export interface Member {
  id: string;
  family_id: string;
  name: string;
  role: MemberRole;
  age_band?: AgeBand;
  has_login?: boolean;
  user_id?: string;
  avatar_url?: string;
  signup_code?: string;
  is_founding_admin?: boolean;
  date_of_birth?: string | null; 
  bio?: string; 
  phone_number?: string
  created_at: string;
  updated_at: string;
}

export interface Family {
  id: string;
  name: string;
  photo_url?: string;
  created_by: string;
  subscription_status: 'active' | 'inactive' | 'cancelled' | 'expired' | 'billing_issue' | 'paused' | 'refunded' | null;
  subscription_tier: 'free' | 'premium';
  created_at: string;
  updated_at: string;
  image_url?: string;
}

interface FamilyState {
  // State
  family: Family | null;
  members: Member[];
  currentMember: Member | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchFamily: (familyId: string) => Promise<void>;
  fetchFamilyForUser: (userId: string) => Promise<void>;
  fetchMembers: (familyId: string) => Promise<void>;
  createFamily: (name: string, userId: string) => Promise<Family>;
  updateFamily: (familyId: string, updates: Partial<Family>) => Promise<void>;
  addMember: (familyId: string, member: Omit<Member, 'id' | 'family_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateMember: (memberId: string, updates: Partial<Member>) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  uploadAvatar: (familyId: string, memberId: string, userId: string, fileUri: string, mimeType: string, fileName: string) => Promise<Family>;
  getAvatarSignedUrl: (storagePath: string) => Promise<string | null>;
  uploadFamilyPhoto: (familyId: string, userId: string, fileUri: string, mimeType: string, fileName: string) => Promise<Family>;
  getFamilyPhotoSignedUrl: (storagePath: string) => Promise<string | null>;
  updateFamilyName: (familyId: string,name: string) => Promise<void>;
  promoteMember: (memberId: string,familyId: string) => Promise<void>;
  demoteMember: (memberId: string,familyId: string) => Promise<void>;
  setError: (error: string | null) => void;

  storageLimitError: StorageLimitError | null
  upgradeRequired: boolean;
  upgradeReason: 'ai_feature' | 'quota_exceeded' | null;
  clearStorageLimitError: () => void;
  
}

export const useFamilyStore = create<FamilyState>((set, get) => ({
  family: null,
  members: [],
  currentMember: null,
  loading: false,
  error: null,

  upgradeRequired: false,
  upgradeReason: null,
  storageLimitError: null,

  clearStorageLimitError: () => set({ storageLimitError: null }),

 fetchFamilyForUser: async (userId: string) => {
    set({ loading: true });
    try {
      // Try the member path first (works for co-parents / non-admin members)
      const { data: memberRows, error: memberError } = await supabase
      .from('member')
      .select('family_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (memberError) throw memberError;

    let familyId = memberRows?.[0]?.family_id ?? null;

    if (!familyId) {
      const { data: ownedFamilies, error: ownedError } = await supabase
        .from('family')
        .select('id, created_at')
        .eq('created_by', userId)
        .order('created_at', { ascending: false })
        .limit(1);

        
      if (ownedError) throw ownedError;

      familyId = ownedFamilies?.[0]?.id ?? null;
    }

      if (!familyId) {
        set({ family: null, members: [], error: null });
        return;
      }

      const [{ data: family, error: familyError }, { data: members, error: membersError }] =
        await Promise.all([
          supabase.from('family').select('*').eq('id', familyId).single(),
          supabase.from('member').select('*').eq('family_id', familyId).order('created_at', { ascending: true }),
        ]);

      if (familyError) throw familyError;
      if (membersError) throw membersError;

      const { data: { user } } = await supabase.auth.getUser();
      const currentMember = members?.find((m) => m.user_id === user?.id) ?? null;

      set({ family, members: members || [],currentMember, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch family for user';
      set({ error: message });
    } finally {
      set({ loading: false });
    }
  },

  fetchFamily: async (familyId: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('family')
        .select('*')
        .eq('id', familyId)
        .single();

      if (error) throw error;

      set({ family: data, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch family';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  fetchMembers: async (familyId: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('member')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      set({ members: data || [], error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch members';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  createFamily: async (name: string, userId: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('family')
        .insert([
          {
            name,
            created_by: userId,
            subscription_status: 'inactive',
            subscription_tier: 'free',
          },
        ])
        .select()
        .single();

      if (error) throw error;

      set({ family: data, error: null });
      return data;
    } catch (error) {
      // Extract real error message from Supabase PostgrestError or standard Error
      const message = 
        (error as any)?.message ||
        (error as any)?.details ||
        (error instanceof Error ? error.message : 'Failed to create family');
      console.error('[FamilyStore] createFamily error:', error);
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateFamily: async (familyId: string, updates: Partial<Family>) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('family')
        .update(updates)
        .eq('id', familyId)
        .select()
        .single();

      if (error) throw error;

      set({ family: data, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update family';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  addMember: async (familyId: string, member: Omit<Member, 'id' | 'family_id' | 'created_at' | 'updated_at'>) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('member')
        .insert([
          {
            family_id: familyId,
            ...member,
          },
        ])
        .select()
        .single();

      if (error) {
        if (error.message?.includes('member_limit_exceeded')) {
          throw new MemberLimitError();
        }
        throw error;
      }

      set((state) => ({
        members: [...state.members, data],
        error: null,
      }));
      embedContent({
        family_id: familyId,
        source_type: 'member',
        source_id: data.id,
        content: `Family member: ${data.name}, role: ${data.role}${data.age_band ? `, age group: ${data.age_band}` : ''}.`,
      });
    } catch (error) {
      if (error instanceof MemberLimitError) {
        set({ loading: false });
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Failed to add member';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateMember: async (memberId: string, updates: Partial<Member>) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('member')
        .update(updates)
        .eq('id', memberId)
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        members: state.members.map((m) => (m.id === memberId ? data : m)),
        currentMember: state.currentMember?.id === memberId ? { ...state.currentMember, ...data } : state.currentMember,
        error: null,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update member';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  removeMember: async (memberId: string) => {
    set({ loading: true });
    try {
      const { error } = await supabase
        .from('member')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      set((state) => ({
        members: state.members.filter((m) => m.id !== memberId),
        error: null,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove member';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  uploadAvatar: async (familyId: string, memberId: string,userId: string, fileUri: string, mimeType: string, fileName: string) => {
    set({ loading: true, error: null });
    try {
      const fileSizeBytes = await getFileSizeBytes(fileUri);
      await checkStorageBeforeUpload(familyId, fileSizeBytes);

      const storagePath = `${memberId}/${Date.now()}_${fileName}`;

      const formData = new FormData();
      formData.append('file', {
        uri: fileUri,
        name: fileName,
        type: mimeType,
      } as any);

      const { error: uploadError } = await supabase.storage
        .from('member-avatars')
        .upload(storagePath, formData, { contentType: mimeType, upsert: false });
      if (uploadError) throw uploadError;

      await recordUpload({
          familyId, bucket: 'member-avatars', storagePath, sizeBytes: fileSizeBytes,
          sourceType: 'avatar', createdBy: userId,
      });

      const { data, error } = await supabase
        .from('member')
        .update({ avatar_url: storagePath })
        .eq('id', memberId)
        .select()
        .single();
      if (error) throw error;

      // Update local state so it reflects immediately
      set((state) => ({
        members: state.members.map((m) => (m.id === memberId ? { ...m, avatar_url: storagePath } : m)),
        currentMember: state.currentMember?.id === memberId ? { ...state.currentMember, avatar_url: storagePath } : state.currentMember,
        error: null,
      }));

      return data;
    } catch (error) {
      if (error instanceof StorageLimitError) {
        set({ storageLimitError: error, loading: false });
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Failed to upload avatar';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  getAvatarSignedUrl: async (storagePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('member-avatars')
        .createSignedUrl(storagePath, 60 * 60 * 24 * 7); // 7 days — avatars are viewed constantly, no need to re-resolve often
      if (error) throw error;
      return data.signedUrl;
    } catch {
      return null;
    }
  },

  uploadFamilyPhoto: async (familyId: string, userId: string, fileUri: string, mimeType: string, fileName: string) => {
    set({ loading: true, error: null });
    try {
      const fileSizeBytes = await getFileSizeBytes(fileUri);
      await checkStorageBeforeUpload(familyId, fileSizeBytes);

      const storagePath = `${familyId}/${Date.now()}_${fileName}`;

      const formData = new FormData();
      formData.append('file', { uri: fileUri, name: fileName, type: mimeType } as any);

      const { error: uploadError } = await supabase.storage
        .from('family-photos')
        .upload(storagePath, formData, { contentType: mimeType, upsert: false });
      if (uploadError) throw uploadError;

      await recordUpload({
          familyId, bucket: 'family-memories', storagePath, sizeBytes: fileSizeBytes,
          sourceType: 'family_photo', createdBy: userId,
      });

      const { data, error } = await supabase
        .from('family')
        .update({ photo_url: storagePath })
        .eq('id', familyId)
        .select()
        .single();
      if (error) throw error;

      set((state) => ({ family: state.family ? { ...state.family, photo_url: storagePath } : state.family, error: null }));
      return data;
    } catch (error) {
      if (error instanceof StorageLimitError) {
        set({ storageLimitError: error, loading: false });
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Failed to upload family photo';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  getFamilyPhotoSignedUrl: async (storagePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('family-photos')
        .createSignedUrl(storagePath, 60 * 60 * 24 * 7);
      if (error) throw error;
      return data.signedUrl;
    } catch {
      return null;
    }
  },

  updateFamilyName: async (familyId: string, name: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('family')
        .update({ name })
        .eq('id', familyId)
        .select()
        .single();
      if (error) throw error;

      set((state) => ({ family: state.family ? { ...state.family, name } : state.family, error: null }));
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update family name';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  promoteMember: async (memberId: string, familyId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('member')
        .update({ role: 'admin' })
        .eq('id', memberId)
        .select()
        .single();
      if (error) throw error;

      set((state) => ({
        members: state.members.map((m) => (m.id === memberId ? { ...m, role: 'admin' } : m)),
        error: null,
      }));

      await notifyMember(memberId, {
        familyId,
        type: 'family_update',
        priority: 'important',
        title: "You're now a family admin",
        body: 'You can now manage chores, meals, calendar, and members for your family.',
        actionRoute: '/(tabs)',
      });

      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to promote member';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  demoteMember: async (memberId: string, familyId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('member')
        .update({ role: 'member' })
        .eq('id', memberId)
        .select()
        .single();
      if (error) throw error; // will throw the trigger's exception if this is the founder

      set((state) => ({
        members: state.members.map((m) => (m.id === memberId ? { ...m, role: 'member' } : m)),
        error: null,
      }));

      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update member role';
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
