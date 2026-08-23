import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { dockerDb } from '@/lib/docker-db';
import { getDeviceId } from '@/lib/device-session';
import { isValidEmail, normalizeEmail } from '@/lib/password';

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
  const deviceIdRef = useRef<string | null>(null);
  const userId = session?.user?.id;

  const signOutLocally = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const claimCurrentDevice = useCallback(async (): Promise<string | null> => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession?.user) return null;

      const deviceId = deviceIdRef.current ?? await getDeviceId();
      deviceIdRef.current = deviceId;
      const { error } = await supabase.rpc('claim_device_session', { p_device_id: deviceId });
      return error?.message ?? null;
    } catch {
      return null;
    }
  }, []);

  const verifyCurrentDevice = useCallback(async () => {
    if (!deviceIdRef.current) return;
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession?.user) return;

      const { data, error } = await supabase.rpc('is_current_device', { p_device_id: deviceIdRef.current });
      if (!error && data === false) {
        await signOutLocally();
      }
    } catch {
      // Ignore network errors
    }
  }, [signOutLocally]);

  const fetchProfile = async (uId: string) => {
    try {
      // 1. Try Docker PostgreSQL first
      const { data: dockerProfile, error: dockerErr } = await dockerDb
        .from('profiles')
        .select('*')
        .eq('id', uId)
        .maybeSingle();

      if (!dockerErr && dockerProfile) {
        setProfile(dockerProfile as Profile);
        return;
      }

      // 2. Fetch from Supabase as fallback
      const { data: supaProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uId)
        .maybeSingle();

      if (supaProfile) {
        setProfile(supaProfile as Profile);
        // Seed into Docker PostgreSQL for local permanence
        try {
          await dockerDb.from('profiles').upsert({
            id: uId,
            full_name: supaProfile.full_name,
            username: supaProfile.username,
            avatar_url: supaProfile.avatar_url,
            role: supaProfile.role || 'user',
            coins: supaProfile.coins || 0,
            xp: supaProfile.xp || 0,
            level: supaProfile.level || 1,
            streak_days: supaProfile.streak_days || 0,
            is_vip: supaProfile.is_vip || false,
            vip_expires_at: supaProfile.vip_expires_at,
          });
        } catch {}
      } else {
        // Fallback profile if record not yet created
        const fallback: Profile = {
          id: uId,
          full_name: session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'User',
          role: user?.email?.toLowerCase() === 'esra99san@gmail.com' ? 'admin' : 'user',
        };
        setProfile(fallback);
        try {
          await dockerDb.from('profiles').upsert({
            id: uId,
            full_name: fallback.full_name,
            role: fallback.role,
            coins: 0,
            xp: 0,
            level: 1,
            streak_days: 0,
            is_vip: false,
          });
        } catch {}
      }
    } catch {
      setProfile({
        id: uId,
        full_name: session?.user?.user_metadata?.full_name || 'User',
        role: user?.email?.toLowerCase() === 'esra99san@gmail.com' ? 'admin' : 'user',
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
        const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) =>
          setTimeout(() => resolve({ data: { session: null } }), 3000)
        );

        const result = (await Promise.race([
          supabase.auth.getSession(),
          timeoutPromise,
        ])) as { data: { session: Session | null } };

        const sbSession = result?.data?.session ?? null;

        if (isMounted) {
          setSession(sbSession);
          setUser(sbSession?.user ?? null);
          if (sbSession?.user) {
            fetchProfile(sbSession.user.id).finally(() => {
              if (isMounted) setIsLoading(false);
            });
          } else {
            setIsLoading(false);
          }
        }
      } catch {
        if (isMounted) setIsLoading(false);
      }
    }

    initAuth();

    // Listen for real-time auth changes from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (isMounted) {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          fetchProfile(newSession.user.id);
        } else {
          setProfile(null);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const restoreRecoverySession = async (url: string | null) => {
      if (!url) return;
      const hash = url.includes('#') ? url.slice(url.indexOf('#') + 1) : '';
      const params = new URLSearchParams(hash || url.split('?')[1] || '');
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const code = params.get('code');

      if (accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      } else if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      }
    };

    void Linking.getInitialURL().then(restoreRecoverySession);
    const subscription = Linking.addEventListener('url', ({ url }) => void restoreRecoverySession(url));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!userId) return;

    void getDeviceId().then((deviceId) => {
      deviceIdRef.current = deviceId;
      return verifyCurrentDevice();
    });

    const interval = setInterval(() => void verifyCurrentDevice(), 30_000);
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void verifyCurrentDevice();
    });

    return () => {
      clearInterval(interval);
      appStateSubscription.remove();
    };
  }, [userId, verifyCurrentDevice]);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email: normalizeEmail(email), password });
    if (error) {
      return { error: error.message };
    }

    await claimCurrentDevice();
    return { error: null };
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
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: { data: { full_name: fullName.trim() } },
    });
    if (error) return { error: error.message, needsEmailVerification: false };
    
    if (data.session) {
      await claimCurrentDevice();
    }
    const needsEmailVerification = !data.session;
    return { error: null, needsEmailVerification };
  };

  const signOut = async () => {
    setSession(null);
    setUser(null);
    setProfile(null);
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string): Promise<{ error: string | null }> => {
    let redirectTo = 'aniflix://reset-password';
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
      // 1. Update Docker PostgreSQL
      await dockerDb
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      // 2. Sync to Supabase as fallback
      supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .then(() => {});

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
