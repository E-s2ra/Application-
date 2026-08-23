import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Local PostgREST API port exposed by docker-compose
export const DOCKER_POSTGREST_URL =
  process.env.EXPO_PUBLIC_DOCKER_POSTGREST_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:54324' : 'http://127.0.0.1:54324');

// Valid local HS256 JWT signed with Docker container secret
export const DOCKER_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNjcwMDAwMDAwLCJleHAiOjIwODcwMDAwMDB9.jjx2F-4f4MyPHfE435brkahvEse6WQZVAQexGnboLIw';

/**
 * Custom fetch function that routes /rest/v1 directly to PostgREST root on port 54324
 */
export const postgrestCustomFetch = (url: RequestInfo | URL, init?: RequestInit) => {
  let urlStr = typeof url === 'string' ? url : url.toString();
  if (urlStr.includes(':54324/rest/v1')) {
    urlStr = urlStr.replace(':54324/rest/v1', ':54324');
  }
  return fetch(urlStr, init);
};

/**
 * Direct Client connection to local Docker PostgreSQL (aniflix-postgres-db / aniflix-postgrest-api)
 * Exclusively handles Payments, VIP subscriptions, Coins, XP, and Gamification.
 */
export const dockerDb = createClient(DOCKER_POSTGREST_URL, DOCKER_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    fetch: postgrestCustomFetch,
  },
});
