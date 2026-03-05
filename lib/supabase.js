import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

if (!hasSupabaseConfig) {
  console.error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

/** Client-side Supabase client (anon key, subject to RLS). */
const missingClientProxy = new Proxy({}, {
  get() {
    throw new Error('Supabase client is unavailable: missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
});

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : missingClientProxy;

/**
 * Server-side Supabase client using service role key.
 * Bypasses RLS — use ONLY in API routes, never expose to client.
 */
export function getServiceSupabase() {
  if (!hasSupabaseConfig) {
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const isPlaceholder = !serviceKey || serviceKey.startsWith('your-') || serviceKey.length < 20;
  if (isPlaceholder) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not set or is a placeholder, falling back to anon key');
    return supabase;
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
