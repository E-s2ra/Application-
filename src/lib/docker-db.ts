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
 * Always use cloud Supabase to avoid network hangs on physical devices.
 * 10.0.2.2 is only reachable from Android Emulator.
 */
import { supabase } from './supabase';

export const dockerDb = supabase;
