/**
 * Dashboard: score history chart, KPIs, plan progress and account controls
 * (export, delete history, delete account).
 */
import { renderShell, toast, confirmDialog, openModal } from '../ui/shell.js';
import { initMotion, countUp } from '../ui/motion.js';
import { renderLineChart } from '../ui/line-chart.js';
import { icons } from '../ui/icons.js';
import { requireUser, signOut } from '../core/auth.js';
import { $, $$, escapeHtml, formatDate, downloadBlob, html } from '../core/utils.js';
import { listAnalyses, getActivePlan, deleteAnalysis, exportData, deleteAllData, deleteAccount } from '../core/store.js';
import { METRICS, METRIC_KEYS, FACE_SHAPES, tierLabel } from '../analysis/ideals.js';

const root = $('#dash-root');
const state = { user: null, analyses: [], plan: null, metric: 'overall', chart: null };

async function main() {
  renderShell({ solid: true });
  await initMotion({ smooth: true });
  state.user = await requireUser();
  if (!state.user.verified) return (location.href = 'analyze.html');
  try {
    [state.analyses, state.plan] = await Promise.all([listAnalyses(), getActivePlan()]);
  } catch (err) {
    root.innerHTML = `<div class="glass card-pad empty"><p>Couldn’t load your data: ${escapeHtml(err.message)}</p></div>`;
    return;
  }
  render();
}

function seriesFor(key) {
  return state.analyses.map((a) => ({ date: a.created_at, value: Number(key === 'overall' ? a.overall : a.scores?.[key]) })).filter((p) => Number.isFinite(p.value));
}

function render() {
  const { user, analyses, plan } = state;
  const hello = user.demo ? 'Welcome.' : `Welcome back, ${escapeHtml(user.name)}.`;
  const head = `
    <header class="dash-head">
      <div><p class="eyebrow">Dashboard</p><h1 class="display d-m">${hello}</h1></div>
      <a class="btn btn--primary" href="analyze.html" data-magnetic>New analysis ${icons.arrow}</a>
    </header>`;

  if (!analyses.length) {
    root.innerHTML = `${head}
      <div class="glass card-pad empty app-view">
        <h2 class="display d-s">No analyses yet</h2>
        <p class="muted">Run your first analysis to start tracking. Your photo stays on your device — only scores are saved here.</p>
        <a class="btn btn--primary" href="analyze.html">Analyze my face ${icons.arrow}</a>
      </div>
      <div style="margin-top:20px">${accountCard()}</div>`;
    bindAccount();
    return;
  }

  const latest = analyses.at(-1);
  const first = analyses[0];
  const delta = latest.overall - first.overall;
  const best = Math.max(...analyses.map((a) => a.overall));
  const planTotal = plan?.plan?.total || 0;
  const planPct = plan && planTotal ? Math.round(((plan.completed?.length || 0) / planTotal) * 100) : null;
  const deltaHtml =
    analyses.length > 1
      ? `<span class="kpi__delta ${delta > 0.04 ? 'is-up' : delta < -0.04 ? 'is-down' : ''}">${delta > 0.04 ? '↑' : delta < -0.04 ? '↓' : '→'} ${delta >= 0 ? '+' : '−'}${Math.abs(delta).toFixed(1)} since your first analysis</span>`
      : '<span class="kpi__delta">Your first data point</span>';

  root.innerHTML = `${head}
    <section class="kpis app-view" aria-label="Summary">
      <div class="kpi glass"><span class="kpi__label">Latest score</span><b class="kpi__value" data-count="${latest.overall}">${latest.overall.toFixed(1)}</b>${deltaHtml}</div>
      <div class="kpi glass"><span class="kpi__label">Best score</span><b class="kpi__value">${best.toFixed(1)}</b><span class="kpi__delta">${escapeHtml(tierLabel(best))}</span></div>
      <div class="kpi glass"><span class="kpi__label">Analyses</span><b class="kpi__value">${analyses.length}</b><span class="kpi__delta">since ${formatDate(first.created_at)}</span></div>
      <div class="kpi glass"><span class="kpi__label">Plan progress</span><b class="kpi__value">${planPct == null ? '—' : `${planPct}%`}</b><span class="kpi__delta">${plan ? escapeHtml(plan.plan.label) + ' plan' : 'No active plan'}</span></div>
    </section>

    <div class="row" style="margin-bottom:14px">
      <label class="label" for="metric-select">Showing</label>
      <select class="input" id="metric-select" style="width:auto;height:42px">
        <option value="overall">Overall score</option>
        ${METRIC_KEYS.map((k) => `<option value="${k}">${METRICS[k].name}</option>`).join('')}
      </select>
    </div>

    <section class="chart-card glass" aria-labelledby="chart-title">
      <div class="chart-card__head">
        <div><h2 class="h3" id="chart-title"></h2><p class="chart-card__sub">Score out of 10 · one point per analysis · hover or use ← → to inspect</p></div>
      </div>
      <div id="chart"></div>
      <details style="margin-top:14px"><summary class="link small" style="cursor:pointer">Show as table</summary>
        <div class="table-wrap" style="margin-top:12px"><table class="data-table" id="chart-table"><thead><tr><th scope="col">Date</th><th scope="col" class="num">Score</th></tr></thead><tbody></tbody></table></div>
      </details>
    </section>

    <div class="dash-grid">
      <section class="dash-card glass" aria-labelledby="h-history">
        <h2 class="h3" id="h-history">History</h2>
        <div class="history-list">
          ${[...analyses]
            .reverse()
            .map(
              (a) => `
            <div class="history-item" data-id="${escapeHtml(a.id)}">
              <span><b>${a.overall.toFixed(1)}</b> <span class="faint">· ${escapeHtml(FACE_SHAPES[a.face_shape]?.name || '')} face · photo quality ${a.quality ?? '—'}</span></span>
              <span class="faint small">${formatDate(a.created_at)}</span>
              <button class="btn btn--ghost btn--icon" data-del aria-label="Delete analysis from ${formatDate(a.created_at)}">${icons.trash}</button>
            </div>`,
            )
            .join('')}
        </div>
      </section>
      <div style="display:grid;gap:20px">
        ${planCard(planPct)}
        ${accountCard()}
      </div>
    </div>`;

  const select = $('#metric-select');
  select.value = state.metric;
  select.addEventListener('change', () => {
    state.metric = select.value;
    drawChart();
  });
  drawChart();
  $$('[data-del]').forEach((b) => b.addEventListener('click', () => removeAnalysis(b.closest('.history-item').dataset.id)));
  bindAccount();
  const kv = $('[data-count]');
  countUp(kv, Number(kv.dataset.count), { duration: 1200 });
}

function drawChart() {
  const key = state.metric;
  const label = key === 'overall' ? 'Overall score' : METRICS[key].name;
  $('#chart-title').textContent = label;
  const points = seriesFor(key);
  state.chart?.destroy();
  state.chart = renderLineChart($('#chart'), { label, points, band: [8.5, 10], bandLabel: 'Ideal range (8.5+)' });
  $('#chart-table tbody').innerHTML = points
    .map((p) => `<tr><td>${formatDate(p.date, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td><td class="num">${p.value.toFixed(1)}</td></tr>`)
    .join('');
}

function planCard(pct) {
  const plan = state.plan;
  if (!plan)
    return `<section class="dash-card glass"><h2 class="h3">Glow-up plan</h2><p class="muted">Turn your results into a realistic plan for 3–4 weeks, 6 months or 1–2 years.</p><a class="btn btn--glass" href="plan.html">Create my plan ${icons.arrow}</a></section>`;
  return `
    <section class="dash-card glass">
      <h2 class="h3">Glow-up plan · ${escapeHtml(plan.plan.label)}</h2>
      <div class="bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Plan progress"><i style="--w:${pct}%"></i></div>
      <p class="muted small">${plan.completed?.length || 0} of ${plan.plan.total} steps done · focus: ${plan.plan.focus.map((f) => escapeHtml(f.name.toLowerCase())).join(', ')}</p>
      <a class="btn btn--glass" href="plan.html">Open my plan ${icons.arrow}</a>
    </section>`;
}

function accountCard() {
  const u = state.user;
  return `
    <section class="dash-card glass" aria-labelledby="h-account" id="account">
      <h2 class="h3" id="h-account">Account &amp; privacy</h2>
      ${u.demo ? '<p class="muted small">Demo mode: everything is stored only in this browser.</p>' : `<p class="muted small">Signed in as <strong>${escapeHtml(u.email || '')}</strong> via ${u.provider === 'google' ? 'Google' : 'email'}.</p>`}
      <p class="faint small">We store your scores, measurements and plan progress — never photos or face landmarks.</p>
      <div class="row">
        <button class="btn btn--glass btn--sm" data-export>${icons.download}Export my data</button>
        ${u.demo ? '' : `<button class="btn btn--ghost btn--sm" data-signout>${icons.logout}Sign out</button>`}
      </div>
      <div class="danger-zone card-pad" style="border-radius:16px;display:grid;gap:10px">
        <strong>Danger zone</strong>
        <div class="row">
          <button class="btn btn--danger btn--sm" data-wipe>Delete all history</button>
          ${u.demo ? '' : '<button class="btn btn--danger btn--sm" data-delete-account>Delete my account</button>'}
        </div>
      </div>
    </section>`;
}

function bindAccount() {
  $('[data-export]')?.addEventListener('click', async () => {
    try {
      const data = await exportData();
      downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `hakim-iq-data-${new Date().toISOString().slice(0, 10)}.json`);
    } catch (err) {
      toast(`Export failed: ${err.message}`, { type: 'error' });
    }
  });
  $('[data-signout]')?.addEventListener('click', signOut);
  $('[data-wipe]')?.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Delete all history?',
      message: 'This permanently deletes every saved score and plan. Your account stays. This can’t be undone.',
      confirmLabel: 'Delete everything',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteAllData();
      state.analyses = [];
      state.plan = null;
      toast('All history deleted.', { type: 'success' });
      render();
    } catch (err) {
      toast(`Couldn’t delete: ${err.message}`, { type: 'error' });
    }
  });
  $('[data-delete-account]')?.addEventListener('click', confirmAccountDeletion);
}

async function removeAnalysis(id) {
  const ok = await confirmDialog({ title: 'Delete this analysis?', message: 'It will be removed from your history and charts.', confirmLabel: 'Delete', danger: true });
  if (!ok) return;
  try {
    await deleteAnalysis(id);
    state.analyses = state.analyses.filter((a) => a.id !== id);
    render();
    toast('Analysis deleted.');
  } catch (err) {
    toast(`Couldn’t delete: ${err.message}`, { type: 'error' });
  }
}

async function confirmAccountDeletion() {
  const body = html(`
    <div class="stack">
      <p>This permanently deletes your account, every saved score and your glow-up plans. It can’t be undone.</p>
      <div class="field"><label for="confirm-del">Type <span class="kbd">DELETE</span> to confirm</label><input class="input" id="confirm-del" autocomplete="off"></div>
      <p class="form-error" hidden></p>
    </div>`);
  await openModal({
    title: 'Delete your account?',
    body,
    actions: [
      { label: 'Cancel', variant: 'ghost' },
      {
        label: 'Delete my account',
        variant: 'danger',
        onClick: async () => {
          if (body.querySelector('#confirm-del').value.trim() !== 'DELETE') {
            const e = body.querySelector('.form-error');
            e.textContent = 'Please type DELETE in capitals.';
            e.hidden = false;
            return false;
          }
          try {
            await deleteAccount();
            toast('Your account and data have been deleted.', { type: 'success' });
            setTimeout(() => (location.href = 'index.html'), 1200);
          } catch (err) {
            const e = body.querySelector('.form-error');
            e.textContent = `Couldn’t delete the account: ${err.message}. Did you run supabase/schema.sql?`;
            e.hidden = false;
            return false;
          }
          return true;
        },
      },
    ],
  });
}

main();
