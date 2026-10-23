/**
 * 13+ age gate (neutral age screen).
 * Asks for birth month/year once, keeps only the resulting age band
 * ("13-17" or "18+") — never the date itself. Under-13s are blocked, and the
 * answer is remembered so the form can't simply be retried.
 */
import { MIN_AGE } from '../config.js';
import { storage, html } from './utils.js';
import { openModal } from '../ui/shell.js';

const KEY = 'hiq:age';

export function ageBand() {
  const s = storage.get(KEY, null);
  return s?.band && s.band !== 'under' ? s.band : null;
}

function computeAge(year, month) {
  const now = new Date();
  let age = now.getFullYear() - year;
  if (now.getMonth() + 1 < month) age -= 1;
  return age;
}

export function blockedPanel() {
  return html(`
    <section class="gate-blocked container container--narrow">
      <div class="glass card-pad center">
        <h1 class="display d-s">Thanks for stopping by</h1>
        <p class="lead" style="margin-top:12px">Hakim IQ Labs is for people aged ${MIN_AGE} and over. Come back when you're ${MIN_AGE} — we'll be here.</p>
        <a class="btn btn--glass" style="margin-top:24px" href="index.html">Back to home</a>
      </div>
    </section>`);
}

/**
 * Resolves with the age band once confirmed. For under-13s it replaces the
 * page content with a friendly message and never resolves.
 */
export async function requireAgeGate() {
  const saved = storage.get(KEY, null);
  if (saved?.band === 'under') return block();
  if (saved?.band) return saved.band;

  const now = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => now - i);
  const months = Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat(undefined, { month: 'long' }).format(new Date(2000, i, 1)));
  const body = html(`
    <form class="stack age-form" novalidate>
      <p>Hakim IQ Labs is for people aged ${MIN_AGE}+. Please enter your date of birth. We only keep your age group — not your birthday.</p>
      <div class="age-form__row">
        <div class="field"><label for="age-month">Month</label>
          <select class="input" id="age-month" required><option value="">Month</option>${months.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('')}</select>
        </div>
        <div class="field"><label for="age-year">Year</label>
          <select class="input" id="age-year" required><option value="">Year</option>${years.map((y) => `<option>${y}</option>`).join('')}</select>
        </div>
      </div>
      <p class="form-error" hidden></p>
    </form>`);

  let band = null;
  await openModal({
    title: 'Before we start',
    body,
    dismissible: false,
    actions: [
      {
        label: 'Continue',
        variant: 'primary',
        onClick: () => {
          const m = Number(body.querySelector('#age-month').value);
          const y = Number(body.querySelector('#age-year').value);
          const err = body.querySelector('.form-error');
          if (!m || !y) {
            err.textContent = 'Please choose your birth month and year.';
            err.hidden = false;
            return false;
          }
          const age = computeAge(y, m);
          band = age < MIN_AGE ? 'under' : age < 18 ? '13-17' : '18+';
          storage.set(KEY, { band, at: new Date().toISOString() });
          return true;
        },
      },
    ],
  });
  if (band === 'under') return block();
  return band;
}

function block() {
  const main = document.querySelector('main');
  main.replaceChildren(blockedPanel());
  return new Promise(() => {});
}
