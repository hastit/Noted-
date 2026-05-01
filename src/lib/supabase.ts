import {createClient} from '@supabase/supabase-js';

const url =
  import.meta.env.VITE_SUPABASE_URL ??
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ??
  import.meta.env.EXPO_PUBLIC_SUPABASE_URL ??
  '';
const anonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  import.meta.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  '';
const fallbackUrl = 'http://localhost:54321';
const fallbackAnonKey = 'not-configured-anon-key';

export const isSupabaseConfigured = Boolean(url && anonKey);

// Avoid crashing app startup when env vars are missing.
// UI can still render and show configuration guidance.
export const supabase = createClient(
  isSupabaseConfigured ? url : fallbackUrl,
  isSupabaseConfigured ? anonKey : fallbackAnonKey,
  {
    auth: {
      /** Required so `#access_token=…&type=recovery` from the email is accepted (not PKCE-only). */
      flowType: 'implicit',
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  },
);
