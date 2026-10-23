/**
 * Glow-up plan page: pick a timeline (if no plan yet), then tick off the
 * week-by-week / month-by-month checklist. Progress is saved to the account.
 */
import { renderShell, toast, confirmDialog } from '../ui/shell.js';
import { initMotion, countUp, reducedMotion } from '../ui/motion.js';
import { icons } from '../ui/icons.js';
import { requireUser } from '../core/auth.js';
import { requireAgeGate } from '../core/age-gate.js';
import { $, $$, escapeHtml, debounce, storage, formatDate } from '../core/utils.js';
import { latestAnalysis, getActivePlan, savePlan, updatePlanProgress } from '../core/store.js';
import { generatePlan } from '../plan/generator.js';
import { TIMELINES } from '../plan/library.js';
import { FACE_SHAPES } from '../analysis/ideals.js';

const root = $('#plan-root');
const PREFS_KEY = 'hiq:prefs';
let band = null;

async function main() {
  renderShell({ solid: true });
  await initMotion({ smooth: true });
  const user = await requireUser();
  if (!user.verified) return (location.href = 'analyze.html');
  band = await requireAgeGate();

  const [analysis, active] = await Promise.all([latestAnalysis(), getActivePlan()]).catch((err) => {
    root.innerHTML = `<div class="glass card-pad empty"><p>Couldn’t load your plan: ${escapeHtml(err.message)}</p></div>`;
    return [];
  });
  if (active) return renderPlan(active);
  if (!analysis) return renderEmpty();
  renderPicker(analysis);
}

function renderEmpty() {
  root.innerHTML = `
    <div class="glass card-pad empty app-view">
      <h1 class="display d-s">Your plan starts with an analysis</h1>
      <p class="lead">We build your glow-up plan around your own measurements. It takes about 30 seconds, and your photo never leaves your device.</p>
      <a class="btn btn--primary btn--lg" href="analyze.html" data-magnetic>Analyze my face ${icons.arrow}</a>
    </div>`;
}

function renderPicker(analysis, { replacing = false } = {}) {
  const prefs = storage.get(PREFS_KEY, {});
  root.innerHTML = `
    <section class="plan-picker app-view">
      <header class="app-head">
        <p class="eyebrow">Glow-up plan</p>
        <h1 class="display d-m">Choose your timeline.</h1>
        <p class="lead">Based on your analysis from ${formatDate(analysis.created_at)}. We focus on your weakest areas with safe, realistic habits.</p>
      </header>
      <div class="timeline-pick">
        ${Object.entries(TIMELINES)
          .map(([k, t]) => `<button class="tl-option" data-tl="${k}"><b>${t.label}</b><span>${t.summary}</span></button>`)
          .join('')}
      </div>
      <label class="switch"><input type="checkbox" id="pref-facial-hair" ${prefs.facialHair ? 'checked' : ''}> Include facial-hair (beard &amp; stubble) tips</label>
      ${replacing ? '<p class="faint small">Starting a new plan archives your current one.</p>' : ''}
      <ul class="glow__nos" style="display:flex;gap:8px;flex-wrap:wrap">
        <li class="chip">No surgery</li><li class="chip">No crash diets</li><li class="chip">No pseudoscience</li>
      </ul>
    </section>`;
  $('#pref-facial-hair').addEventListener('change', (e) => storage.set(PREFS_KEY, { ...prefs, facialHair: e.target.checked }));
  $$('.tl-option').forEach((b) =>
    b.addEventListener('click', async () => {
      b.setAttribute('aria-pressed', 'true');
      const plan = generatePlan({
        timeline: b.dataset.tl,
        analysis: { id: analysis.id, scores: analysis.scores, values: analysis.metrics, face_shape: analysis.face_shape },
        prefs: { facialHair: $('#pref-facial-hair').checked, ageBand: band },
      });
      try {
        const row = await savePlan(plan);
        renderPlan(row);
        toast('Your plan is ready. Tick things off as you go — progress saves automatically.', { type: 'success' });
      } catch (err) {
        b.setAttribute('aria-pressed', 'false');
        toast(`Couldn’t save your plan: ${err.message}`, { type: 'error' });
      }
    }),
  );
}

function renderPlan(row) {
  const plan = row.plan;
  const done = new Set(row.completed || []);
  const C = 2 * Math.PI * 50;
  const shape = FACE_SHAPES[plan.shape]?.name || '';

  root.innerHTML = `
    <section class="app-view">
      <div class="plan-head">
        <div>
          <p class="eyebrow">Glow-up plan · ${escapeHtml(plan.label)}</p>
          <h1 class="display d-m">${plan.polish ? 'Polish what’s already working.' : 'Your plan, built around you.'}</h1>
          <p class="lead">${escapeHtml(plan.summary)}</p>
          <div class="plan-focus">
            ${plan.focus.map((f) => `<span class="chip chip--accent">Focus: ${escapeHtml(f.name)}</span>`).join('')}
            ${shape ? `<span class="chip">${escapeHtml(shape)} face</span>` : ''}
          </div>
        </div>
        <div class="glass card-pad plan-progress">
          <div class="ring">
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <defs><linearGradient id="plGrad" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#67e8f9"/><stop offset=".5" stop-color="#818cf8"/><stop offset="1" stop-color="#e879f9"/></linearGradient></defs>
              <circle class="ring__track" cx="60" cy="60" r="50" stroke-width="9" fill="none"/>
              <circle class="ring__value" id="pl-ring" cx="60" cy="60" r="50" stroke="url(#plGrad)" stroke-width="9" stroke-linecap="round" fill="none" stroke-dasharray="${C}" stroke-dashoffset="${C}"/>
            </svg>
            <div class="ring__label"><b class="plan-progress__num" id="pl-pct">0%</b></div>
          </div>
          <div>
            <p class="muted small" id="pl-count"></p>
            <p class="faint small" style="margin-top:6px">Started ${formatDate(row.created_at)}</p>
            <button class="btn btn--ghost btn--sm" id="pl-new" style="margin-top:10px;margin-left:-12px">${icons.refresh}New plan</button>
          </div>
        </div>
      </div>

      <div class="plan-meta">
        <div class="glass card-pad">
          <h2 class="h3">What’s realistic in ${escapeHtml(plan.label)}</h2>
          <ul>${plan.expect.map((e) => `<li>${escapeHtml(e)}</li>`).join('')}</ul>
        </div>
        <div class="glass card-pad">
          <h2 class="h3">Honest note</h2>
          <p class="muted" style="margin-top:10px">${escapeHtml(plan.notChanging)}</p>
          ${plan.focus.map((f) => `<p class="faint small" style="margin-top:8px"><b>${escapeHtml(f.name)}:</b> ${escapeHtml(f.changeable)}</p>`).join('')}
        </div>
      </div>

      <div class="plan-periods" id="periods">
        ${plan.periods
          .map(
            (p, pi) => `
          <section class="period" data-period="${pi}">
            <button class="period__head" aria-expanded="false" aria-controls="pbody-${pi}">
              <span class="period__title">${escapeHtml(p.label)}</span>
              <span class="period__count mono" data-count></span>
              <span class="bar period__bar" aria-hidden="true"><i data-bar></i></span>
            </button>
            <div class="period__body" id="pbody-${pi}"><div>
              ${p.items
                .map(
                  (it) => `
                <label class="task ${done.has(it.id) ? 'is-checked' : ''}">
                  <input type="checkbox" data-id="${escapeHtml(it.id)}" ${done.has(it.id) ? 'checked' : ''}>
                  <span>
                    <span class="task__title">${escapeHtml(it.title)}</span>
                    <span class="task__detail">${escapeHtml(it.detail)}</span>
                    <span class="task__lever">${escapeHtml(it.leverLabel)}</span>
                  </span>
                </label>`,
                )
                .join('')}
            </div></div>
          </section>`,
          )
          .join('')}
      </div>
      <p class="faint small" style="margin-top:24px">General wellness guidance, not medical advice. Check with a doctor or dermatologist before changing diet, training or skincare if you have a health condition.</p>
    </section>`;

  const save = debounce(async () => {
    try {
      await updatePlanProgress(row.id, [...done]);
    } catch (err) {
      toast(`Couldn’t save progress: ${err.message}`, { type: 'error' });
    }
  }, 500);

  const refresh = (animate = false) => {
    const total = plan.total || plan.periods.reduce((s, p) => s + p.items.length, 0);
    const pct = total ? Math.round((done.size / total) * 100) : 0;
    $('#pl-ring').style.strokeDashoffset = String(C * (1 - pct / 100));
    if (animate) countUp($('#pl-pct'), pct, { decimals: 0, suffix: '%', duration: 1200 });
    else $('#pl-pct').textContent = `${pct}%`;
    $('#pl-count').textContent = `${done.size} of ${total} steps done`;
    $$('.period').forEach((el) => {
      const items = plan.periods[el.dataset.period].items;
      const n = items.filter((i) => done.has(i.id)).length;
      el.querySelector('[data-count]').textContent = `${n}/${items.length}`;
      el.querySelector('[data-bar]').style.setProperty('--w', `${items.length ? (n / items.length) * 100 : 0}%`);
      el.classList.toggle('is-done', items.length > 0 && n === items.length);
    });
  };

  // Open the first period that still has work in it.
  const firstOpen = plan.periods.findIndex((p) => p.items.some((i) => !done.has(i.id)));
  const openPeriod = (el, open) => {
    el.classList.toggle('is-open', open);
    el.querySelector('.period__head').setAttribute('aria-expanded', String(open));
  };
  $$('.period').forEach((el, i) => {
    openPeriod(el, i === (firstOpen === -1 ? 0 : firstOpen));
    el.querySelector('.period__head').addEventListener('click', () => openPeriod(el, !el.classList.contains('is-open')));
  });

  $('#periods').addEventListener('change', (e) => {
    const input = e.target.closest('input[data-id]');
    if (!input) return;
    const id = input.dataset.id;
    input.checked ? done.add(id) : done.delete(id);
    input.closest('.task').classList.toggle('is-checked', input.checked);
    refresh();
    save();
    const period = input.closest('.period');
    if (input.checked && period.classList.contains('is-done')) {
      toast(`${period.querySelector('.period__title').textContent} complete — nice work.`, { type: 'success' });
      if (!reducedMotion()) burst(input);
    }
  });

  $('#pl-new').addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Start a new plan?',
      message: 'Your current plan will be archived. You can pick a new timeline based on your latest analysis.',
      confirmLabel: 'Choose a new plan',
    });
    if (!ok) return;
    const analysis = await latestAnalysis();
    if (!analysis) return renderEmpty();
    renderPicker(analysis, { replacing: true });
  });

  refresh(true);
}

/** Tiny celebratory particle burst from a checkbox. */
function burst(el) {
  const r = el.getBoundingClientRect();
  const colors = ['#67e8f9', '#818cf8', '#e879f9', '#4ade80'];
  for (let i = 0; i < 14; i++) {
    const p = document.createElement('i');
    const angle = (i / 14) * Math.PI * 2;
    const dist = 30 + Math.random() * 30;
    Object.assign(p.style, {
      position: 'fixed',
      left: `${r.left + r.width / 2}px`,
      top: `${r.top + r.height / 2}px`,
      width: '6px',
      height: '6px',
      borderRadius: '50%',
      background: colors[i % colors.length],
      pointerEvents: 'none',
      zIndex: 99,
    });
    document.body.append(p);
    p.animate(
      [
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(angle) * dist}px), calc(-50% + ${Math.sin(angle) * dist}px)) scale(0.3)`, opacity: 0 },
      ],
      { duration: 700, easing: 'cubic-bezier(.22,1,.36,1)' },
    ).onfinish = () => p.remove();
  }
}

main();
