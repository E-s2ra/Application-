/**
 * @deprecated
 * dockerDb is a legacy alias retained only for import compatibility.
 * All database operations must use the canonical `supabase` client from '@/lib/supabase'.
 * This file contains no credentials or configuration.
 */
import { supabase } from './supabase';

export const dockerDb = supabase;
