import { getDeviceId } from '@/lib/device-session';
import { isValidEmail, normalizeEmail } from '@/lib/password';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

export type Profile = {
  id: string;
  full_name: string | null;
  username?: string | null;
  avatar_url?: string | null;
  role: 'user' | 'admin';
  coins?: number;
  xp?: number;
  level?: number;
  streak_days?: number;
  is_vip?: boolean;
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isDeviceSessionReady: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null; needsEmailVerification: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: string | null }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeviceSessionReady, setIsDeviceSessionReady] = useState(false);
  const deviceIdRef = useRef<string | null>(null);
  const claimingDeviceRef = useRef(false);
  const router = useRouter();
  const userId = session?.user?.id;

  const signOutLocally = useCallback(async () => {
    setIsDeviceSessionReady(false);
    await supabase.auth.signOut({ scope: 'local' });
  }, []);

  const claimCurrentDevice = useCallback(async (): Promise<string | null> => {
    claimingDeviceRef.current = true;
    setIsDeviceSessionReady(false);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession?.user) return 'Not authenticated';

      const deviceId = deviceIdRef.current ?? await getDeviceId();
      deviceIdRef.current = deviceId;

      const { error } = await supabase.rpc('claim_device_session', { p_device_id: deviceId });
      if (error) return error.message;
      setIsDeviceSessionReady(true);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'Unable to verify device session';
    } finally {
      claimingDeviceRef.current = false;
    }
  }, []);

  const verifyCurrentDevice = useCallback(async () => {
    if (!deviceIdRef.current || claimingDeviceRef.current) return;
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession?.user) return;

      const { data, error } = await supabase.rpc('is_current_device', { p_device_id: deviceIdRef.current });
      if (!error && data === false) {
        setIsDeviceSessionReady(false);
        await signOutLocally();
      } else if (!error && data === true) {
        setIsDeviceSessionReady(true);
      }
    } catch {
      // Ignore network errors
    }
  }, [signOutLocally]);

  const fetchProfile = async (uId: string, providedEmail?: string) => {
    try {
      const { data: supaProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uId)
        .maybeSingle();

      if (supaProfile) {
        // Role is sourced exclusively from the database — no client-side override.
        setProfile(supaProfile as Profile);
      } else {
        // Profile row not yet created (e.g. immediately after signup before trigger fires).
        // Default to 'user' — never elevate role client-side.
        const fallback: Profile = {
          id: uId,
          full_name: providedEmail?.split('@')[0] || 'User',
          role: 'user',
        };
        setProfile(fallback);
      }
    } catch {
      // Network error — fallback to minimal non-elevated profile.
      setProfile({
        id: uId,
        full_name: 'User',
        role: 'user',
      });
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const { data: { session: sbSession } } = await supabase.auth.getSession();

        if (isMounted) {
          setSession(sbSession);
          setUser(sbSession?.user ?? null);
          if (sbSession?.user) {
            await fetchProfile(sbSession.user.id, sbSession.user.email);
          }
        }
      } catch (error) {
        console.warn('[useAuth] initAuth error:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initAuth();

    // Listen for real-time auth changes from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (_event === 'PASSWORD_RECOVERY') {
        router.replace('/reset-password');
      }

      if (!isMounted) return;

      if (_event === 'SIGNED_IN' || _event === 'TOKEN_REFRESHED' || _event === 'USER_UPDATED') {
        setSession(newSession);
        setUser(newSession?.user ?? null);
      } else if (_event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setProfile(null);
        setIsDeviceSessionReady(false);
      }

      // Only fetch profile explicitly on SIGNED_IN. initAuth handles the initial app load.
      if (_event === 'SIGNED_IN' && newSession?.user) {
        await fetchProfile(newSession.user.id, newSession.user.email);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const restoreRecoverySession = async (url: string | null) => {
      if (!url) return;

      const parsed = Linking.parse(url);
      const scheme = parsed.scheme?.toLowerCase() ?? '';
      const path = (parsed.path ?? '').replace(/^\/+|\/+$/g, '');
      if (scheme !== 'aniflix' || (path !== 'reset-password' && path !== 'verified')) {
        return;
      }

      const getParam = (key: string) => {
        const value = parsed.queryParams?.[key];
        return typeof value === 'string' ? value : null;
      };

      const code = getParam('code');
      if (!code) return;

      let authError: Error | null = null;
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        authError = error;
      } catch (err) {
        console.warn('[useAuth] Link session restoration failed:', err);
        return;
      }

      if (authError) {
        console.warn('[useAuth] Auth callback was rejected:', authError.message);
        return;
      }

      if (path === 'reset-password') {
        router.replace('/reset-password');
      } else {
        router.replace('/verified');
      }
    };

    void Linking.getInitialURL().then(restoreRecoverySession);
    const subscription = Linking.addEventListener('url', ({ url }) => void restoreRecoverySession(url));
    return () => subscription.remove();
  }, [router]);

  useEffect(() => {
    if (!userId) {
      setIsDeviceSessionReady(false);
      return;
    }

    // Bind the persisted Supabase auth session to this installed-app device on
    // startup. The server rejects an older displaced session, so a stale JWT
    // cannot reclaim the account after a newer login wins the single-device lock.
    void getDeviceId().then(async (deviceId) => {
      deviceIdRef.current = deviceId;
      const claimError = await claimCurrentDevice();
      if (claimError) {
        await signOutLocally();
      }
    });

    const interval = setInterval(() => void verifyCurrentDevice(), 30_000);
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void verifyCurrentDevice();
    });

    return () => {
      clearInterval(interval);
      appStateSubscription.remove();
    };
  }, [claimCurrentDevice, signOutLocally, userId, verifyCurrentDevice]);

  const signIn = async (inputIdentifier: string, password: string): Promise<{ error: string | null }> => {
    try {
      let targetEmail = normalizeEmail(inputIdentifier);

      // Username login is resolved inside a public auth Edge Function so the
      // profiles table never exposes account emails to anonymous clients.
      if (!isValidEmail(targetEmail)) {
        claimingDeviceRef.current = true;
        const { data, error } = await supabase.functions.invoke('username-login', {
          body: {
            identifier: inputIdentifier.trim(),
            password,
          },
        });

        if (error || !data?.access_token || !data?.refresh_token) {
          claimingDeviceRef.current = false;
          return { error: 'Invalid email/username or password. Please check your credentials.' };
        }

        const { data: sessionData, error: setSessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });

        if (setSessionError || !sessionData.session) {
          claimingDeviceRef.current = false;
          return { error: 'Unable to start your session. Please try again.' };
        }

        const claimError = await claimCurrentDevice();
        if (claimError) {
          await signOutLocally();
          return { error: 'Unable to start this device session. Please sign in again.' };
        }
        return { error: null };
      }

      claimingDeviceRef.current = true;
      const { data, error } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password,
      });

      if (error) {
        claimingDeviceRef.current = false;
        if (error.message.includes('Invalid login credentials')) {
          return { error: 'Invalid email/username or password. Please check your credentials.' };
        }
        if (error.message.includes('Email not confirmed')) {
          return { error: 'Please check your email inbox and confirm your account before logging in.' };
        }
        return { error: error.message };
      }

      if (data.session) {
        const claimError = await claimCurrentDevice();
        if (claimError) {
          await signOutLocally();
          return { error: 'Unable to start this device session. Please sign in again.' };
        }
        // State updates and profile fetching are automatically handled by the onAuthStateChange listener
      }

      return { error: null };
    } catch (err: any) {
      claimingDeviceRef.current = false;
      console.warn('[useAuth] signIn error:', err);
      return { error: err.message || 'Network error. Please check your connection and try again.' };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
  ): Promise<{ error: string | null; needsEmailVerification: boolean }> => {
    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      return { error: 'Enter a valid email address.', needsEmailVerification: false };
    }

    claimingDeviceRef.current = true;
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: { full_name: fullName.trim(), email: normalizedEmail },
        emailRedirectTo: Platform.OS === 'web' && typeof window !== 'undefined'
          ? `${window.location.origin}/verified`
          : Linking.createURL('verified'),
      },
    });

    if (error) {
      claimingDeviceRef.current = false;
      if (
        error.message.toLowerCase().includes('already registered') ||
        error.message.toLowerCase().includes('already exists') ||
        error.message.toLowerCase().includes('user_already_exists')
      ) {
        return {
          error: 'An account with this email address already exists. Please sign in instead.',
          needsEmailVerification: false,
        };
      }
      return { error: error.message, needsEmailVerification: false };
    }

    // 2. Check for obfuscated duplicate signup in Supabase Auth (user returned with identities: [])
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      claimingDeviceRef.current = false;
      return {
        error: 'An account with this email address already exists. Please sign in instead.',
        needsEmailVerification: false,
      };
    }

    if (data.session) {
      const claimError = await claimCurrentDevice();
      if (claimError) {
        await signOutLocally();
        return {
          error: 'Unable to start this device session. Please sign in again.',
          needsEmailVerification: false,
        };
      }
    }
    const needsEmailVerification = !data.session;
    return { error: null, needsEmailVerification };
  };

  const signOut = async () => {
    setSession(null);
    setUser(null);
    setProfile(null);
    setIsDeviceSessionReady(false);
    await supabase.auth.signOut({ scope: 'local' });
  };

  const resetPassword = async (email: string): Promise<{ error: string | null }> => {
    let redirectTo = Linking.createURL('reset-password');
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      redirectTo = `${window.location.origin}/reset-password`;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(email), {
      redirectTo,
    });
    if (error) return { error: error.message || 'Unable to start password recovery. Please try again later.' };
    return { error: null };
  };

  const updatePassword = async (password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error?.message ?? null };
  };

  const updateProfile = async (updates: Partial<Profile>): Promise<{ error: string | null }> => {
    if (!user?.id) return { error: 'Not authenticated' };
    try {
      // SECURITY: Whitelist only non-economic, non-privilege fields.
      // Never forward role, coins, xp, level, is_vip, streak_days, etc.
      // Column-level GRANTs on the DB also protect these, but we add a
      // client-side guard here as defense-in-depth.
      const safeUpdates: { username?: string | null; full_name?: string | null; avatar_url?: string | null; updated_at: string } = {
        updated_at: new Date().toISOString(),
      };
      if (updates.username !== undefined) safeUpdates.username = updates.username;
      if (updates.full_name !== undefined) safeUpdates.full_name = updates.full_name;
      if (updates.avatar_url !== undefined) safeUpdates.avatar_url = updates.avatar_url;

      const { error } = await supabase
        .from('profiles')
        .update(safeUpdates)
        .eq('id', user.id);

      if (error) return { error: error.message };

      setProfile((prev) => (prev ? { ...prev, ...updates } : null));
      return { error: null };
    } catch (err: any) {
      return { error: err?.message || 'Failed to update profile' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        isLoading,
        isDeviceSessionReady,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
        refreshProfile,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
