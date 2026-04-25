import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { ProfileRow } from '../types';

WebBrowser.maybeCompleteAuthSession();

interface AuthState {
  session:     Session | null
  user:        User | null
  profile:     ProfileRow | null
  isLoading:   boolean
  isNewUser:   boolean        // true immediately after signup → show profile-setup
  error:       string | null

  initialize:          () => Promise<void>
  signInWithEmail:     (email: string, password: string) => Promise<void>
  signInWithGoogle:    () => Promise<void>
  signUpWithEmail:     (email: string, password: string, username: string) => Promise<void>
  sendPasswordReset:   (email: string) => Promise<void>
  signOut:             () => Promise<void>
  fetchProfile:        () => Promise<void>
  updateProfile:       (updates: Partial<Pick<ProfileRow, 'username' | 'avatar_url'>>) => Promise<void>
  completeProfileSetup: () => void
  clearError:          () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session:   null,
  user:      null,
  profile:   null,
  isLoading: true,
  isNewUser: false,
  error:     null,

  // ─── Initialise ────────────────────────────────────────────────────────────

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      set({ session, user: session?.user ?? null, isLoading: false });

      if (session?.user) await get().fetchProfile();

      supabase.auth.onAuthStateChange(async (_event, session) => {
        set({ session, user: session?.user ?? null });
        if (session?.user) {
          await get().fetchProfile();
        } else {
          set({ profile: null, isNewUser: false });
        }
      });
    } catch {
      set({ isLoading: false });
    }
  },

  // ─── Email / password ──────────────────────────────────────────────────────

  signInWithEmail: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Sign in failed' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  signUpWithEmail: async (email, password, username) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });
      if (error) throw error;
      set({ isNewUser: true });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Sign up failed' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  sendPasswordReset: async (email) => {
    set({ isLoading: true, error: null });
    try {
      const redirectTo = AuthSession.makeRedirectUri({
        scheme: 'roamfree',
        path: 'auth/reset-password',
      });
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to send reset email' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  // ─── Google OAuth ──────────────────────────────────────────────────────────

  signInWithGoogle: async () => {
    set({ isLoading: true, error: null });
    try {
      const redirectTo = AuthSession.makeRedirectUri({ scheme: 'roamfree' });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (!data.url) throw new Error('No OAuth URL returned');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type === 'success' && result.url) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(result.url);
        if (exchangeError) throw exchangeError;
        // If no existing profile username set, treat as new user for profile setup
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', (await supabase.auth.getUser()).data.user?.id ?? '')
          .single();
        const emailPrefix = (await supabase.auth.getUser()).data.user?.email?.split('@')[0] ?? '';
        if (!profile || profile.username === emailPrefix) {
          set({ isNewUser: true });
        }
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Google sign-in failed' });
    } finally {
      set({ isLoading: false });
    }
  },

  // ─── Sign out ──────────────────────────────────────────────────────────────

  signOut: async () => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ session: null, user: null, profile: null, isNewUser: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Sign out failed' });
    } finally {
      set({ isLoading: false });
    }
  },

  // ─── Profile ───────────────────────────────────────────────────────────────

  fetchProfile: async () => {
    const { user } = get();
    if (!user) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (data) set({ profile: data });
  },

  updateProfile: async (updates) => {
    const { user } = get();
    if (!user) return;
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
      if (error) throw error;
      await get().fetchProfile();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Update failed' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  completeProfileSetup: () => set({ isNewUser: false }),

  clearError: () => set({ error: null }),
}));
