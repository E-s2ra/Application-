import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Local Docker CORS Proxy on port 54324
export const DOCKER_POSTGREST_URL =
  process.env.EXPO_PUBLIC_DOCKER_POSTGREST_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:54324' : 'http://127.0.0.1:54324');

// Valid local HS256 JWT signed with Docker container secret
export const DOCKER_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNjcwMDAwMDAwLCJleHAiOjIwODcwMDAwMDB9.jjx2F-4f4MyPHfE435brkahvEse6WQZVAQexGnboLIw';

// Hosted Supabase fallback — used when Docker is not running (web / dev without Docker Desktop)
const SUPABASE_CLOUD_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://zkbprmyxwjfznsucyuvi.supabase.co';
const SUPABASE_CLOUD_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_gw13qL5Hs7d2o0gLP0FOuQ_siBOh5VK';

/**
 * On native (Android/iOS) we target the local Docker PostgREST when available.
 * On web (localhost / production) Docker is never reachable, so we fall back
 * directly to the hosted Supabase project — this eliminates ERR_CONNECTION_REFUSED.
 */
const useLocalDocker = Platform.OS !== 'web';

export const dockerDb = useLocalDocker
  ? createClient(DOCKER_POSTGREST_URL, DOCKER_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : createClient(SUPABASE_CLOUD_URL, SUPABASE_CLOUD_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
