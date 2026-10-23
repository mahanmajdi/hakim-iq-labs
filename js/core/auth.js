/**
 * Authentication helpers (Supabase Auth).
 *
 * - Email + password sign-up sends a verification email (Supabase "Confirm
 *   email" setting). Until the address is verified Supabase refuses to create
 *   a session, so unverified users can never read or write data.
 * - "Continue with Google" uses Supabase's OAuth provider (Google accounts
 *   arrive already verified).
 * - In demo mode (no Supabase keys) a local guest user is returned instead.
 */
import { getSupabase, isConfigured } from './supabase.js';
import { siteUrl } from './utils.js';

const DEMO_USER = Object.freeze({
  id: 'local-demo',
  email: null,
  name: 'Guest',
  verified: true,
  provider: 'demo',
  ageBand: null,
  demo: true,
});

function normalize(user) {
  if (!user) return null;
  const meta = user.user_metadata || {};
  return {
    id: user.id,
    email: user.email,
    name: meta.full_name || meta.name || (user.email ? user.email.split('@')[0] : 'You'),
    verified: Boolean(user.email_confirmed_at || user.confirmed_at),
    provider: user.app_metadata?.provider || 'email',
    ageBand: meta.age_band || null,
    demo: false,
  };
}

async function client() {
  const sb = await getSupabase();
  if (!sb) throw new Error('Accounts are not configured yet (demo mode).');
  return sb;
}

/** Current user (from the locally stored session — no network round-trip). */
export async function getUser() {
  const sb = await getSupabase();
  if (!sb) return DEMO_USER;
  const { data } = await sb.auth.getSession();
  return normalize(data.session?.user);
}

/** Subscribe to sign-in / sign-out / recovery events. Returns an unsubscribe fn. */
export async function onAuthChange(cb) {
  const sb = await getSupabase();
  if (!sb) return () => {};
  const { data } = sb.auth.onAuthStateChange((event, session) => cb(event, normalize(session?.user)));
  return () => data.subscription.unsubscribe();
}

export async function signUp({ email, password, ageBand }) {
  const sb = await client();
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: siteUrl('auth.html?verified=1'),
      data: { age_band: ageBand },
    },
  });
  if (error) throw error;
  // Supabase hides whether an address already exists: it returns a user with
  // no identities. We still show "check your inbox" (no account enumeration).
  return { needsVerification: !data.session, user: normalize(data.user) };
}

export async function signIn({ email, password }) {
  const sb = await client();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === 'email_not_confirmed' || /not confirmed/i.test(error.message)) {
      const e = new Error('Please verify your email first — check your inbox for the link.');
      e.code = 'email_not_confirmed';
      throw e;
    }
    throw error;
  }
  return normalize(data.user);
}

export async function signInWithGoogle(next = 'analyze.html') {
  const sb = await client();
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: siteUrl(next) },
  });
  if (error) throw error;
}

export async function resendVerification(email) {
  const sb = await client();
  const { error } = await sb.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: siteUrl('auth.html?verified=1') },
  });
  if (error) throw error;
}

export async function sendPasswordReset(email) {
  const sb = await client();
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: siteUrl('auth.html?mode=reset') });
  if (error) throw error;
}

export async function updatePassword(password) {
  const sb = await client();
  const { error } = await sb.auth.updateUser({ password });
  if (error) throw error;
}

export async function updateMetadata(data) {
  const sb = await getSupabase();
  if (!sb) return;
  await sb.auth.updateUser({ data });
}

export async function signOut() {
  const sb = await getSupabase();
  if (sb) await sb.auth.signOut();
  location.href = 'index.html';
}

/**
 * Gate for app pages. Redirects to the sign-in page when there is no session.
 * Resolves with the user (who may still be unverified — pages show a
 * "verify your email" panel in that case).
 */
export async function requireUser() {
  const user = await getUser();
  if (user) return user;
  const next = location.pathname.split('/').pop() + location.search;
  location.replace(`auth.html?next=${encodeURIComponent(next || 'analyze.html')}`);
  return new Promise(() => {}); // never resolves; page is navigating away
}

export { isConfigured };
