import { create } from 'zustand';
import { supabase, getCurrentUser, signOut as supabaseSignOut } from '@/lib/_core/supabase';
import { User, Session } from '@supabase/supabase-js';
import { useFamilyStore } from './family-store';

interface AuthState {
  // State
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  userSignupMeta: {
    roleType: string | null;
    full_name: string | null;
  } | null;
  isAuthenticated: boolean;

  // Actions
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, meta?: any) => Promise<void>;
  verifyOTP: (email: string, token: string, type: 'email' | 'recovery' ) => Promise<void>;
  signInWithOAuth: (provider: 'apple' | 'google') => Promise<void>;
  signOut: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (password: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateProfile: (id: string, update: any) => Promise<void>;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: false,
  error: null,
  isAuthenticated: false,
  roleType: null,
  userSignupMeta: null,

  initialize: async () => {
    set({ loading: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user || null;

      set({
        session,
        user,
        isAuthenticated: !!user,
        error: null,
      });

      if (user) {
        try {
          await useFamilyStore.getState().fetchFamilyForUser(user.id);
        } catch (familyError) {
          // Don't let a family-fetch failure block auth resolution —
          // user is still authenticated even if family data fails to load
          console.error('Failed to fetch family during init:', familyError);
        }
      }

      supabase.auth.onAuthStateChange(async (event, session) => {
        set({
          session,
          user: session?.user || null,
          isAuthenticated: !!session?.user,
        });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initialize auth';
      console.error('Auth initialization error:', message);
      set({ error: message, isAuthenticated: false, user: null, session: null });
      // No rethrow — initialize always resolves, never rejects
    } finally {
      set({ loading: false });
    }
  },

  signIn: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      set({
        user: data.user,
        session: data.session,
        isAuthenticated: true,
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign in failed';
      set({ error: message, isAuthenticated: false });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  signUp: async (
    email: string,
    password: string,
    meta?: { fullName?: string; country?: string; ethnicity?: string; signupCode?: string,role: string }
  ) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: meta?.fullName ?? null,
            country: meta?.country ?? null,
            ethnicity: meta?.ethnicity ?? null,
            signup_code: meta?.signupCode ?? null,
          },
        },
      });

      if (error) throw error;

      set({
        user: data.user,
        session: data.session,
        isAuthenticated: !!data.session,
        error: null,
        userSignupMeta: {
          roleType: meta?.role!,
          full_name: meta?.fullName!
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign up failed';
      set({ error: message, isAuthenticated: false });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  verifyOTP: async (email: string, token: string, type = 'email') => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type,
      });

      if (error) throw error;

      set({
        user: data.user,
        session: data.session,
        isAuthenticated: true,
        error: null,
      });
    } catch (error) {
      const message = (error as any)?.message || (error instanceof Error ? error.message : 'OTP verification failed');
      set({ error: message, isAuthenticated: false });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  signInWithOAuth: async (provider: 'apple' | 'google') => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: 'family-os://oauth-callback',
        },
      });

      if (error) throw error;

      // OAuth session will be handled by onAuthStateChange listener
    } catch (error) {
      const message = error instanceof Error ? error.message : `${provider} sign in failed`;
      set({ error: message, isAuthenticated: false });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    set({ loading: true, error: null });
    try {
      await supabaseSignOut();
      set({
        user: null,
        session: null,
        isAuthenticated: false,
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign out failed';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  forgotPassword: async (email: string) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
        },
      });

      if (error) throw error;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Password reset failed';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  resetPassword: async (newPassword: string) => {
    set({ loading: true, error: null });

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  changePassword: async (
    currentPassword: string,
    newPassword: string
  ) => {
    set({ loading: true, error: null });

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.email) {
        throw new Error("User not found");
      }

      // Verify current password
      const { error: signInError } =
        await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword,
        });

      if (signInError) {
        throw new Error("Current password is incorrect");
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to change password";

      set({ error: message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  updateProfile: async (
    userId: string,
    updates: { fullName?: string; country?: string; ethnicity?: string }
  ) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          full_name: updates.fullName,
          country: updates.country,
          ethnicity: updates.ethnicity,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      // Keep member.name in sync, since that's what's shown across the app (dashboards, chat, etc.)
      if (updates.fullName) {
        await supabase.from('member').update({ name: updates.fullName }).eq('user_id', userId);
      }

      set({ error: null });
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update profile';
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
