import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Local Docker CORS Proxy on port 54324
export const DOCKER_POSTGREST_URL =
  process.env.EXPO_PUBLIC_DOCKER_POSTGREST_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:54324' : 'http://127.0.0.1:54324');

// Valid local HS256 JWT signed with Docker container secret
export const DOCKER_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNjcwMDAwMDAwLCJleHAiOjIwODcwMDAwMDB9.jjx2F-4f4MyPHfE435brkahvEse6WQZVAQexGnboLIw';

/**
 * Direct Client connection to local Docker PostgreSQL (backed by Nginx CORS Gateway on 54324)
 */
export const dockerDb = createClient(DOCKER_POSTGREST_URL, DOCKER_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
