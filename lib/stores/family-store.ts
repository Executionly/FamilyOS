import { create } from 'zustand';
import { supabase } from '@/lib/_core/supabase';

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
  created_at: string;
  updated_at: string;
}

export interface Family {
  id: string;
  name: string;
  photo_url?: string;
  created_by: string;
  subscription_status: 'free' | 'premium';
  created_at: string;
  updated_at: string;
}

interface FamilyState {
  // State
  family: Family | null;
  members: Member[];
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
  setError: (error: string | null) => void;
  
}

export const useFamilyStore = create<FamilyState>((set, get) => ({
  family: null,
  members: [],
  loading: false,
  error: null,

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

      set({ family, members: members || [], error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch family for user';
      console.error('[FamilyStore] fetchFamilyForUser error:', error);
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
console.log('Fetched family:', data);
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
            subscription_status: 'free',
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

      if (error) throw error;

      set((state) => ({
        members: [...state.members, data],
        error: null,
      }));
    } catch (error) {
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

  setError: (error: string | null) => {
    set({ error });
  },
}));
