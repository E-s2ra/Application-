import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { getDeviceId } from '@/lib/device-session';

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
  refreshProfile: () => Promise<void>;
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
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uId)
        .single();

      if (!error && data) {
        setProfile(data as Profile);
      } else {
        // Fallback profile if record not yet created
        setProfile({
          id: uId,
          full_name: session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'User',
          role: 'user',
        });
      }
    } catch {
      setProfile({
        id: uId,
        full_name: session?.user?.user_metadata?.full_name || 'User',
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
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
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
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
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
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (error) return { error: error.message };
    return { error: null };
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, isLoading, signIn, signUp, signOut, resetPassword, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
