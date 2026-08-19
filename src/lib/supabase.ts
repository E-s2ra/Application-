import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const SUPABASE_URL = 'https://zkbprmyxwjfznsucyuvi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_gw13qL5Hs7d2o0gLP0FOuQ_siBOh5VK';

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
