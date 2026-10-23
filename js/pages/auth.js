/**
 * Sign in / sign up / verify / password reset.
 * Views are rendered into one card; the URL decides the starting view:
 *   auth.html                 → sign in
 *   auth.html?mode=signup     → create account
 *   auth.html?verified=1      → landing spot after clicking the email link
 *   auth.html?mode=reset      → set a new password (from the reset email)
 *   auth.html?next=page.html  → where to go after signing in
 */
import { renderShell, toast } from '../ui/shell.js';
import { initMotion } from '../ui/motion.js';
import { icons, logoMark } from '../ui/icons.js';
import { $, escapeHtml } from '../core/utils.js';
import { requireAgeGate } from '../core/age-gate.js';
import {
  isConfigured,
  getProviders,
  getUser,
  onAuthChange,
  signIn,
  signUp,
  signInWithGoogle,
  resendVerification,
  sendPasswordReset,
  updatePassword,
} from '../core/auth.js';

const params = new URLSearchParams(location.search);
const rawNext = params.get('next') || 'analyze.html';
const next = /^[a-z-]+\.html(\?[\w=&%-]*)?$/i.test(rawNext) ? rawNext : 'analyze.html'; // only our own pages
const card = $('#auth-card');
let ageBand = null;
let providers = { email: true, google: false };

const FRIENDLY = [
  [/invalid login credentials/i, 'That email and password don’t match. Try again or reset your password.'],
  [/user already registered/i, 'An account with this email already exists — try signing in.'],
  [/password should be at least/i, 'Please use a longer password (at least 8 characters).'],
  [/rate limit|too many/i, 'Too many attempts. Please wait a minute and try again.'],
  [/not authorized|error sending|sending (confirmation|recovery|magic link) email/i, 'We couldn’t send a verification email to this address right now. Please try again later.'],
];
const friendly = (err) => FRIENDLY.find(([re]) => re.test(err?.message || ''))?.[1] || err?.message || 'Something went wrong.';

function header(title, sub) {
  return `
    <a class="brand" href="index.html">${logoMark()}<span>Hakim IQ <span class="brand__lab">Labs</span></span></a>
    <div><h1 class="display">${title}</h1>${sub ? `<p class="muted" style="margin-top:8px">${sub}</p>` : ''}</div>`;
}

// Only offered once Google is enabled in the Supabase project.
const googleBtn = (label) =>
  providers.google
    ? `<button class="btn btn--google btn--block btn--lg" type="button" data-google>${icons.google}<span>${label}</span></button>
       <div class="divider">or</div>`
    : '';

function passwordField(id, label, autocomplete) {
  return `
    <div class="field">
      <label for="${id}">${label}</label>
      <div class="input-wrap">
        <input class="input" id="${id}" name="${id}" type="password" autocomplete="${autocomplete}" required minlength="8">
        <button class="input-wrap__btn" type="button" data-toggle-pw="${id}" aria-label="Show password">${icons.eye}</button>
      </div>
    </div>`;
}

function bindCommon() {
  card.querySelectorAll('[data-toggle-pw]').forEach((b) =>
    b.addEventListener('click', () => {
      const input = card.querySelector(`#${b.dataset.togglePw}`);
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      b.innerHTML = show ? icons.eyeOff : icons.eye;
      b.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    }),
  );
  card.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => render(b.dataset.view)));
  card.querySelector('[data-google]')?.addEventListener('click', async (e) => {
    e.currentTarget.classList.add('is-loading');
    e.currentTarget.insertAdjacentHTML('beforeend', '<span class="spinner"></span>');
    try {
      await signInWithGoogle(next);
    } catch (err) {
      e.currentTarget.classList.remove('is-loading');
      e.currentTarget.querySelector('.spinner')?.remove();
      showError(friendly(err));
    }
  });
}

function showError(msg) {
  const el = card.querySelector('.form-error');
  if (!el) return toast(msg, { type: 'error' });
  el.textContent = msg;
  el.hidden = false;
}

function setLoading(btn, on) {
  btn.classList.toggle('is-loading', on);
  if (on) btn.insertAdjacentHTML('beforeend', '<span class="spinner"></span>');
  else btn.querySelector('.spinner')?.remove();
}

function passwordScore(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 14) s++;
  return pw.length < 8 ? Math.min(s, 1) : s;
}

/* ------------------------------------------------------------------ */
/* Views                                                               */
/* ------------------------------------------------------------------ */
const views = {
  signin() {
    card.innerHTML = `
      ${header('Welcome back', 'Sign in to analyse and track your progress.')}
      ${googleBtn('Continue with Google')}
      <form novalidate>
        <div class="field"><label for="email">Email</label><input class="input" id="email" type="email" autocomplete="email" required></div>
        ${passwordField('password', 'Password', 'current-password')}
        <button class="auth__link small" type="button" data-view="forgot" style="justify-self:start">Forgot password?</button>
        <p class="form-error" hidden></p>
        <button class="btn btn--primary btn--lg btn--block" type="submit"><span>Sign in</span></button>
      </form>
      <p class="auth__switch">New here? <button type="button" data-view="signup">Create a free account</button></p>`;
    bindCommon();
    card.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.submitter;
      const email = card.querySelector('#email').value.trim();
      const password = card.querySelector('#password').value;
      if (!email || !password) return showError('Enter your email and password.');
      setLoading(btn, true);
      try {
        await signIn({ email, password });
        location.href = next;
      } catch (err) {
        setLoading(btn, false);
        if (err.code === 'email_not_confirmed') return render('check', { email });
        showError(friendly(err));
      }
    });
  },

  async signup() {
    ageBand = ageBand || (await requireAgeGate()); // 13+ gate before creating an account
    card.innerHTML = `
      ${header('Create your free account', 'Save your scores, track progress and follow your glow-up plan.')}
      ${googleBtn('Sign up with Google')}
      <form novalidate>
        <div class="field"><label for="email">Email</label><input class="input" id="email" type="email" autocomplete="email" required></div>
        ${passwordField('password', 'Password', 'new-password')}
        <div class="pw-meter" data-score="0" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
        <p class="pw-hint">At least 8 characters. A mix of cases, numbers and symbols makes it stronger.</p>
        <label class="check"><input type="checkbox" id="consent" required><span>I’m 13 or older and I agree to the <a class="link" href="privacy.html" target="_blank" rel="noopener">privacy policy</a>.</span></label>
        <p class="form-error" hidden></p>
        <button class="btn btn--primary btn--lg btn--block" type="submit"><span>Create account</span></button>
      </form>
      <p class="auth__switch">Already have an account? <button type="button" data-view="signin">Sign in</button></p>`;
    bindCommon();
    const pw = card.querySelector('#password');
    pw.addEventListener('input', () => (card.querySelector('.pw-meter').dataset.score = String(passwordScore(pw.value))));
    card.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.submitter;
      const email = card.querySelector('#email').value.trim();
      const password = pw.value;
      if (!/^\S+@\S+\.\S+$/.test(email)) return showError('Please enter a valid email address.');
      if (password.length < 8) return showError('Please use at least 8 characters for your password.');
      if (!card.querySelector('#consent').checked) return showError('Please confirm you’re 13+ and agree to the privacy policy.');
      setLoading(btn, true);
      try {
        const { needsVerification } = await signUp({ email, password, ageBand });
        if (needsVerification) render('check', { email });
        else location.href = next;
      } catch (err) {
        setLoading(btn, false);
        showError(friendly(err));
      }
    });
  },

  check({ email } = {}) {
    card.innerHTML = `
      ${header('Check your inbox', `We sent a verification link to <strong>${escapeHtml(email || 'your email')}</strong>. Click it to activate your account — then you can start your analysis.`)}
      <p class="form-note">Can’t find it? Check spam or promotions. Links expire after 24 hours.</p>
      <button class="btn btn--glass btn--block" type="button" id="resend">Resend verification email</button>
      <p class="auth__switch"><button type="button" data-view="signin">Back to sign in</button></p>`;
    bindCommon();
    const btn = card.querySelector('#resend');
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        await resendVerification(email);
        toast('Sent! Check your inbox.', { type: 'success' });
      } catch (err) {
        toast(friendly(err), { type: 'error' });
      }
      let s = 60;
      const t = setInterval(() => {
        btn.textContent = `Resend available in ${--s}s`;
        if (s <= 0) {
          clearInterval(t);
          btn.disabled = false;
          btn.textContent = 'Resend verification email';
        }
      }, 1000);
    });
  },

  forgot() {
    card.innerHTML = `
      ${header('Reset your password', 'We’ll email you a secure link to choose a new one.')}
      <form novalidate>
        <div class="field"><label for="email">Email</label><input class="input" id="email" type="email" autocomplete="email" required></div>
        <p class="form-error" hidden></p>
        <button class="btn btn--primary btn--lg btn--block" type="submit"><span>Send reset link</span></button>
      </form>
      <p class="auth__switch"><button type="button" data-view="signin">Back to sign in</button></p>`;
    bindCommon();
    card.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.submitter;
      const email = card.querySelector('#email').value.trim();
      if (!/^\S+@\S+\.\S+$/.test(email)) return showError('Please enter a valid email address.');
      setLoading(btn, true);
      try {
        await sendPasswordReset(email);
      } catch {
        /* same message either way — don't reveal whether an account exists */
      }
      card.innerHTML = `${header('Check your inbox', `If an account exists for <strong>${escapeHtml(email)}</strong>, a reset link is on its way.`)}
        <p class="auth__switch"><button type="button" data-view="signin">Back to sign in</button></p>`;
      bindCommon();
    });
  },

  reset() {
    card.innerHTML = `
      ${header('Choose a new password')}
      <form novalidate>
        ${passwordField('password', 'New password', 'new-password')}
        ${passwordField('password2', 'Confirm new password', 'new-password')}
        <p class="form-error" hidden></p>
        <button class="btn btn--primary btn--lg btn--block" type="submit"><span>Update password</span></button>
      </form>`;
    bindCommon();
    card.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.submitter;
      const a = card.querySelector('#password').value;
      const b = card.querySelector('#password2').value;
      if (a.length < 8) return showError('Please use at least 8 characters.');
      if (a !== b) return showError('The passwords don’t match.');
      setLoading(btn, true);
      try {
        await updatePassword(a);
        toast('Password updated.', { type: 'success' });
        location.href = next;
      } catch (err) {
        setLoading(btn, false);
        showError(friendly(err));
      }
    });
  },

  verified() {
    card.innerHTML = `
      ${header('Email verified ✓', 'Your account is active. Your photos stay on your device — only your scores are saved.')}
      <a class="btn btn--primary btn--lg btn--block" href="${escapeHtml(next)}" data-magnetic><span>Start my analysis</span>${icons.arrow}</a>`;
  },

  demo() {
    card.innerHTML = `
      ${header('Accounts aren’t set up yet', 'This copy of Hakim IQ Labs is running in <strong>demo mode</strong> because Supabase keys haven’t been added to <code>js/config.js</code>.')}
      <p class="form-note">You can still try everything — your history is kept only in this browser. See the README for the 10-minute Supabase setup (email verification + Google sign-in).</p>
      <a class="btn btn--primary btn--lg btn--block" href="${escapeHtml(next)}"><span>Continue in demo mode</span>${icons.arrow}</a>`;
  },
};

async function render(view, data) {
  await views[view](data);
  card.querySelector('input')?.focus({ preventScroll: true });
}

async function main() {
  renderShell({ solid: true });
  initMotion({ smooth: false });

  if (!isConfigured) return render('demo');

  providers = await getProviders();
  const mode = params.get('mode');
  // Recovery links sign the user in temporarily and fire PASSWORD_RECOVERY.
  onAuthChange((event) => {
    if (event === 'PASSWORD_RECOVERY') render('reset');
  });
  const user = await getUser();

  if (mode === 'reset' && user) return render('reset');
  if (params.get('verified') && user) return render('verified');
  if (user && user.verified) return location.replace(next);
  // Expired/invalid email links come back with an error in the query or hash.
  const linkError = params.get('error_description') || new URLSearchParams(location.hash.slice(1)).get('error_description');
  if (linkError) toast(linkError.replace(/\+/g, ' '), { type: 'error', duration: 8000 });
  render(mode === 'signup' ? 'signup' : 'signin');
}

main();
