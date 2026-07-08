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
  isAuthenticated: boolean;

  // Actions
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  verifyOTP: (email: string, token: string) => Promise<void>;
  signInWithOAuth: (provider: 'apple' | 'google') => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: false,
  error: null,
  isAuthenticated: false,

  initialize: async () => {
    set({ loading: true });
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user || null;

      set({
        session,
        user,
        isAuthenticated: !!user,
        error: null,
      });

      // console.log("USER", user)
      if (user) {
        console.log("USER", user.id)
        await useFamilyStore.getState().fetchFamilyForUser(user.id);
      }
      // Listen for auth changes
      supabase.auth.onAuthStateChange(
        async (event, session) => {
          set({
            session,
            user: session?.user || null,
            isAuthenticated: !!session?.user,
          });
        }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initialize auth';
      set({ error: message, isAuthenticated: false });
      throw error;
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

  signUp: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      set({
        user: data.user,
        session: data.session,
        isAuthenticated: !!data.session,
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign up failed';
      set({ error: message, isAuthenticated: false });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  verifyOTP: async (email: string, token: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
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

  resetPassword: async (email: string) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'family-os://reset-password',
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

  setError: (error: string | null) => {
    set({ error });
  },
}));
