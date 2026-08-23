import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const isLocalDevWeb =
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Use local Docker PostgREST in local web testing for 0 CORS errors and 100% reliability
export const SUPABASE_URL = isLocalDevWeb
  ? 'http://127.0.0.1:54324'
  : Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54324';

export const SUPABASE_ANON_KEY = isLocalDevWeb
  ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTY3MDAwMDAwMH0.local-dev-key'
  : Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'anon-key';

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
});

