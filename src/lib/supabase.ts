import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';


// Always use the hosted Supabase cloud URL for auth — the local Docker URL
// is only for the separate dockerDb client (payments/VIP/points data).
export const SUPABASE_URL =
  Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:54324' : 'http://127.0.0.1:54324');

export const SUPABASE_ANON_KEY =
  Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNjcwMDAwMDAwLCJleHAiOjIwODcwMDAwMDB9.jjx2F-4f4MyPHfE435brkahvEse6WQZVAQexGnboLIw';

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
