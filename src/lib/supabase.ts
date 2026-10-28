import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';

function isValidHttpUrl(string: string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export const isSupabaseConfigured = Boolean(
  rawUrl &&
  rawKey &&
  isValidHttpUrl(rawUrl) &&
  !rawUrl.includes('your-project')
);

let client: SupabaseClient<Database> | null = null;
if (isSupabaseConfigured) {
  try {
    client = createClient<Database>(rawUrl, rawKey);
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
    client = null;
  }
}

export const supabase = client;
