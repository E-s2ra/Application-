import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { Database } from '@/types/database.types';

// Default local PostgREST API port exposed by docker-compose
export const DOCKER_POSTGREST_URL =
  process.env.EXPO_PUBLIC_DOCKER_POSTGREST_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:54324' : 'http://127.0.0.1:54324');

// Local anonymous JWT key
export const DOCKER_ANON_KEY =
  process.env.EXPO_PUBLIC_DOCKER_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM0MTgwMDB9.local-anon-key';

/**
 * Direct Client connection to local Docker PostgreSQL (aniflix-postgres-db / aniflix-postgrest-api)
 * Exclusively handles Payments, VIP subscriptions, Coins, XP, and Gamification.
 */
export const dockerDb = createClient<Database>(DOCKER_POSTGREST_URL, DOCKER_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
