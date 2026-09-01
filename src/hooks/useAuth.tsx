import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
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
  const claimingDeviceRef = useRef(false);
  const router = useRouter();
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
        await signOutLocally();
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
            fetchProfile(sbSession.user.id, sbSession.user.email).finally(() => {
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
      if (_event === 'PASSWORD_RECOVERY') {
        router.replace('/reset-password');
      }
      if (isMounted) {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          fetchProfile(newSession.user.id, newSession.user.email);
        } else {
          setProfile(null);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const signIn = async (inputIdentifier: string, password: string): Promise<{ error: string | null }> => {
    try {
      let targetEmail = normalizeEmail(inputIdentifier);

      // If user entered a username instead of an email (e.g. "esra99san"), resolve their email from profiles
      if (!isValidEmail(targetEmail)) {
        const { data: foundProfile } = await supabase
          .from('profiles')
          .select('email')
          .ilike('username', targetEmail)
          .maybeSingle();

        if (foundProfile?.email) {
          targetEmail = foundProfile.email.toLowerCase();
        }
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
        await claimCurrentDevice();
        setSession(data.session);
        setUser(data.session.user);
        await fetchProfile(data.session.user.id, data.session.user.email);
      }

      return { error: null };
    } catch (err: any) {
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
        data: { full_name: fullName.trim() },
        emailRedirectTo: Platform.OS === 'web' && typeof window !== 'undefined' 
          ? `${window.location.origin}/verified` 
          : 'aniflix://verified'
      },
    });
    
    if (error) {
      claimingDeviceRef.current = false;
      return { error: error.message, needsEmailVerification: false };
    }
    
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
      const { error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
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
