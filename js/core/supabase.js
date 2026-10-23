/**
 * Supabase client (lazy). Returns null in demo mode (no keys configured),
 * so every caller can fall back to localStorage.
 */
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';
import { CDN } from './cdn.js';

export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let clientPromise = null;

export function getSupabase() {
  if (!isConfigured) return Promise.resolve(null);
  clientPromise ??= import(CDN.supabase).then(({ createClient }) =>
    createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // Implicit flow lets a verification link work even when it is opened
        // on a different device/browser than the one used to sign up.
        flowType: 'implicit',
      },
    }),
  );
  return clientPromise;
}
