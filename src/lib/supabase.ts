import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { postgrestCustomFetch, DOCKER_ANON_KEY, DOCKER_POSTGREST_URL } from '@/lib/docker-db';

const isLocalDevWeb =
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Use local Docker PostgREST in local web testing for 0 CORS errors and 100% reliability
export const SUPABASE_URL = isLocalDevWeb
  ? DOCKER_POSTGREST_URL
  : Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || DOCKER_POSTGREST_URL;

export const SUPABASE_ANON_KEY = isLocalDevWeb
  ? DOCKER_ANON_KEY
  : Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || DOCKER_ANON_KEY;

// Access and refresh tokens must never be kept in general-purpose app storage.
// Expo SecureStore uses the platform's encrypted credential storage on native.
const secureSessionStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Browser storage cannot provide the same protection as the native keychain.
    storage: Platform.OS === 'web' ? undefined : secureSessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
  global: {
    fetch: isLocalDevWeb ? postgrestCustomFetch : undefined,
  },
});
