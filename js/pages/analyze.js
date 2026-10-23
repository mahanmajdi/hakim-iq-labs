/**
 * Analysis page: capture → on-device scan → results → plan.
 * The photo lives only in this page's memory (a <canvas>); only numbers are saved.
 */
import { renderShell, toast, openModal, confirmDialog } from '../ui/shell.js';
import { initMotion, countUp, reducedMotion } from '../ui/motion.js';
import { initSegmented } from '../ui/widgets.js';
import { icons } from '../ui/icons.js';
import { requireUser, resendVerification } from '../core/auth.js';
import { requireAgeGate } from '../core/age-gate.js';
import { $, $$, escapeHtml, html, sleep, clamp, scoreTier, downloadBlob, storage } from '../core/utils.js';
import { getLandmarker, detectImage, detectVideo, largestFace } from '../analysis/landmarker.js';
import { analyzeLandmarks, frontalize, toPixels, rankFeatures } from '../analysis/metrics.js';
import { METRICS, METRIC_KEYS, FACE_SHAPES, tierLabel, rangeSide } from '../analysis/ideals.js';
import { assessQuality } from '../analysis/quality.js';
import { createOverlay } from '../analysis/overlay.js';
import { findLookalikes, loadCelebrities } from '../analysis/lookalike.js';
import { saveAnalysis, deleteAnalysis, getActivePlan, savePlan } from '../core/store.js';
import { generatePlan } from '../plan/generator.js';
import { renderShareCard } from '../share/share-card.js';

const MAX_SIDE = 1600; // downscale big photos for speed (still plenty of detail)
const PREFS_KEY = 'hiq:prefs';

const state = {
  user: null,
  band: null,
  lenis: null,
  source: null, // canvas holding the photo (memory only)
  analysis: null,
  quality: null,
  overlay: null,
  saved: null,
  lookalikes: [],
  stream: null,
  camLoop: 0,
};

const FEATURE_LABELS = {
  thirds: 'Thirds', canthal: 'Canthal tilt', eyeSpacing: 'Eye spacing', noseMouth: 'Nose : mouth', lips: 'Lips',
  fwhr: 'FWHR', jaw: 'Jaw angle', lw: 'Face length', jawRatio: 'Jaw width', foreheadRatio: 'Forehead width',
  eyeW: 'Eye size', noseW: 'Nose width', mouthW: 'Mouth width', midFace: 'Mid-face height',
};

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */
async function main() {
  renderShell({ solid: true });
  const motion = await initMotion({ smooth: true });
  state.lenis = motion.lenis;

  const user = await requireUser();
  state.user = user;
  if (!user.verified) return showVerify(user);

  state.band = await requireAgeGate();
  setupCapture();
  show('view-capture');

  // Warm up the model and look-alike data while the user picks a photo.
  getLandmarker().catch((e) => console.warn('[analyze] model warm-up failed', e));
  loadCelebrities().catch(() => {});
}

function show(id) {
  $('#app-loading').hidden = true;
  for (const v of $$('.app-view')) v.hidden = v.id !== id;
  if (state.lenis) state.lenis.scrollTo(0, { immediate: true });
  else scrollTo(0, 0);
}

function showVerify(user) {
  $('[data-email]').textContent = user.email || 'your email';
  $('#verify-refresh').addEventListener('click', () => location.reload());
  $('#verify-resend').addEventListener('click', async (e) => {
    e.currentTarget.disabled = true;
    try {
      await resendVerification(user.email);
      toast('Verification email sent. Check your inbox (and spam).', { type: 'success' });
    } catch (err) {
      toast(err.message, { type: 'error' });
    }
  });
  show('view-verify');
}

/* ------------------------------------------------------------------ */
/* Capture                                                             */
/* ------------------------------------------------------------------ */
function setupCapture() {
  const tips = [
    [icons.sun, 'Even, front lighting', 'Face a window or soft light. Avoid overhead or one-sided light.'],
    [icons.target, 'Straight-on angle', 'Camera at eye level, about an arm’s length away. Keep your head level.'],
    [icons.smile, 'Neutral expression', 'Relaxed face, lips gently closed, eyes open.'],
    [icons.eye, 'Clear view', 'Remove glasses and move hair away from your forehead and jawline.'],
  ];
  $('#tips').innerHTML = tips.map(([ic, t, d]) => `<li><span class="tips__icon">${ic}</span><b>${t}</b><span>${d}</span></li>`).join('');
  $('#privacy-note').innerHTML = `${icons.lock}<span>Processed locally with MediaPipe Face Landmarker. Your photo never leaves this device and is discarded when you leave the page.</span>`;
  $('.dropzone__icon').innerHTML = icons.upload;

  initSegmented($('.capture__tabs'), (btn) => {
    for (const p of $$('.capture__panel')) p.hidden = p.dataset.panel !== btn.dataset.panel;
    if (btn.dataset.panel !== 'webcam') stopCamera();
  });

  // Upload: picker, drag & drop, paste
  const input = $('#file-input');
  input.addEventListener('change', () => input.files[0] && handleFile(input.files[0]));
  const dz = $('#dropzone');
  ['dragenter', 'dragover'].forEach((ev) =>
    dz.addEventListener(ev, (e) => {
      e.preventDefault();
      dz.classList.add('is-over');
    }),
  );
  ['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, () => dz.classList.remove('is-over')));
  dz.addEventListener('drop', (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  });
  document.addEventListener('paste', (e) => {
    if ($('#view-capture').hidden) return;
    const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image/'));
    if (item) handleFile(item.getAsFile());
  });

  // Webcam
  $('#cam-enable').addEventListener('click', startCamera);
  $('#cam-capture').addEventListener('click', captureFrame);

  // Results-page controls (bound once)
  $('#error-retry').addEventListener('click', resetToCapture);
  $('#btn-again').addEventListener('click', resetToCapture);
  $('#btn-share').addEventListener('click', openShare);
  $$('.layer-toggles .chip').forEach((chip) =>
    chip.addEventListener('click', () => {
      const on = chip.getAttribute('aria-pressed') !== 'true';
      chip.setAttribute('aria-pressed', String(on));
      state.overlay?.setLayers({ [chip.dataset.layer]: on });
    }),
  );
  $$('[data-g]').forEach((chip) =>
    chip.addEventListener('click', async () => {
      $$('[data-g]').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      state.lookalikes = await findLookalikes(state.analysis, { gender: chip.dataset.g }).catch(() => []);
      renderLookalikes();
    }),
  );
  const prefs = storage.get(PREFS_KEY, {});
  $('#pref-facial-hair').checked = Boolean(prefs.facialHair);
  $('#pref-facial-hair').addEventListener('change', (e) => storage.set(PREFS_KEY, { ...prefs, facialHair: e.target.checked }));
  $$('.tl-option').forEach((b) => b.addEventListener('click', () => startPlan(b.dataset.tl, b)));
}

function resetToCapture() {
  state.overlay?.destroy();
  state.overlay = null;
  state.source = null;
  state.analysis = null;
  state.saved = null;
  $('#file-input').value = '';
  show('view-capture');
}

async function handleFile(file) {
  const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name || '');
  if (!isImage) return toast('Please choose an image file (JPG, PNG or WebP).', { type: 'error' });
  if (file.size > 30 * 1024 * 1024) return toast('That image is over 30 MB — please use a smaller one.', { type: 'error' });
  const canvas = await fileToCanvas(file).catch(() => null);
  if (!canvas) return toast('Couldn’t read that image. Try a JPG or PNG.', { type: 'error' });
  analyze(canvas);
}

async function fileToCanvas(file) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    bitmap = await new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = reject;
      img.src = url;
    });
  }
  const w = bitmap.width;
  const h = bitmap.height;
  const s = Math.min(1, MAX_SIDE / Math.max(w, h));
  const c = Object.assign(document.createElement('canvas'), { width: Math.round(w * s), height: Math.round(h * s) });
  c.getContext('2d').drawImage(bitmap, 0, 0, c.width, c.height);
  bitmap.close?.();
  return c;
}

/* ---------- Webcam with live guides ---------- */
async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) return toast('Your browser does not support camera access. Try uploading a photo.', { type: 'error' });
  const btn = $('#cam-enable');
  if (state.stream || btn.classList.contains('is-loading')) return; // already starting / running
  btn.classList.add('is-loading');
  btn.insertAdjacentHTML('beforeend', '<span class="spinner"></span>');
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
      audio: false,
    });
  } catch (err) {
    btn.classList.remove('is-loading');
    btn.querySelector('.spinner')?.remove();
    const msg = err.name === 'NotAllowedError' ? 'Camera permission was denied. You can allow it in your browser settings, or upload a photo instead.' : 'Couldn’t start the camera. Is another app using it?';
    return toast(msg, { type: 'error', duration: 6000 });
  }
  const video = $('#cam-video');
  video.srcObject = state.stream;
  await video.play();
  $('#cam-start').hidden = true;
  btn.classList.remove('is-loading');
  btn.querySelector('.spinner')?.remove();
  setCamChips([{ label: 'Loading face model…', status: 'warn' }]);
  await getLandmarker();

  let last = 0;
  const stream = state.stream;
  const tick = async (now) => {
    if (state.stream !== stream) return;
    if (now - last > 110 && video.readyState >= 2) {
      last = now;
      try {
        const face = largestFace(await detectVideo(video, now));
        if (state.stream !== stream) return; // camera stopped while this frame was in flight
        updateLiveGuides(video, face);
      } catch (e) {
        console.warn('[cam] frame skipped', e);
      }
    }
    state.camLoop = requestAnimationFrame(tick);
  };
  state.camLoop = requestAnimationFrame(tick);
}

function stopCamera() {
  cancelAnimationFrame(state.camLoop);
  state.stream?.getTracks().forEach((t) => t.stop());
  state.stream = null;
  const video = $('#cam-video');
  if (video) video.srcObject = null;
  $('#cam-start') && ($('#cam-start').hidden = false);
  $('#cam-capture') && ($('#cam-capture').disabled = true);
  $('#cam')?.classList.remove('is-ready');
  $('.cam__tip')?.remove();
}

const STATUS_CHIP = { good: 'chip--good', warn: 'chip--fair', bad: 'chip--low' };
function setCamChips(items) {
  $('#cam-chips').innerHTML = items
    .map((c) => `<span class="chip ${STATUS_CHIP[c.status]}">${c.status === 'good' ? '✓ ' : ''}${escapeHtml(c.label)}</span>`)
    .join('');
}

function updateLiveGuides(video, face) {
  const cam = $('#cam');
  const btn = $('#cam-capture');
  let tip = $('.cam__tip');
  if (!tip) {
    tip = html('<div class="cam__tip" role="status"></div>');
    cam.append(tip);
  }
  if (!face) {
    cam.classList.remove('is-ready');
    btn.disabled = true;
    btn.textContent = 'Capture';
    setCamChips([{ label: 'No face found', status: 'bad' }]);
    tip.textContent = 'Centre your face inside the oval.';
    return;
  }
  const w = video.videoWidth;
  const h = video.videoHeight;
  const P = toPixels(face.landmarks, w, h);
  const { pose } = frontalize(P);
  const q = assessQuality({ source: video, pixels: P, width: w, height: h, pose, blendshapes: face.blendshapes, live: true });

  // Is the face roughly centred and a good size?
  const xs = P.map((p) => p[0]);
  const ys = P.map((p) => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2 / w;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2 / h;
  const fw = (Math.max(...xs) - Math.min(...xs)) / w;
  const centred = Math.abs(cx - 0.5) < 0.12 && Math.abs(cy - 0.47) < 0.14;
  const sizeOk = fw > 0.22 && fw < 0.75;
  const frame = { key: 'frame', label: 'Framing', status: centred && sizeOk ? 'good' : 'warn', tip: !sizeOk ? (fw <= 0.22 ? 'Move a little closer.' : 'Move back a little.') : 'Centre your face inside the oval.' };

  const shown = [frame, ...q.checks.filter((c) => ['light', 'even', 'angle', 'expression'].includes(c.key))];
  setCamChips(shown.map((c) => ({ label: { frame: 'Framing', light: 'Light', even: 'Even light', angle: 'Angle', expression: 'Neutral' }[c.key], status: c.status })));
  const firstIssue = shown.find((c) => c.status !== 'good');
  tip.textContent = firstIssue ? firstIssue.tip : 'Looks great — hold still and capture.';
  const ready = shown.every((c) => c.status === 'good');
  cam.classList.toggle('is-ready', ready);
  btn.disabled = false;
  btn.textContent = ready ? 'Capture' : 'Capture anyway';
}

async function captureFrame() {
  const video = $('#cam-video');
  const btn = $('#cam-capture');
  btn.disabled = true;
  if ($('#cam-timer').checked) {
    const count = $('#cam-count');
    for (let i = 3; i > 0; i--) {
      count.textContent = i;
      await sleep(1000);
    }
    count.textContent = '';
  }
  const c = Object.assign(document.createElement('canvas'), { width: video.videoWidth, height: video.videoHeight });
  c.getContext('2d').drawImage(video, 0, 0);
  stopCamera();
  analyze(c);
}

/* ------------------------------------------------------------------ */
/* Scan                                                                */
/* ------------------------------------------------------------------ */
function drawCover(canvas, source) {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  const g = canvas.getContext('2d');
  const s = Math.max(canvas.width / source.width, canvas.height / source.height);
  g.drawImage(source, (canvas.width - source.width * s) / 2, (canvas.height - source.height * s) / 2, source.width * s, source.height * s);
}

async function step(name, fn) {
  const li = $(`#scan-steps [data-step="${name}"]`);
  li.classList.add('is-active');
  const t0 = performance.now();
  const out = await fn();
  const minMs = reducedMotion() ? 0 : 420;
  const left = minMs - (performance.now() - t0);
  if (left > 0) await sleep(left);
  li.classList.remove('is-active');
  li.classList.add('is-done');
  return out;
}

async function analyze(canvas) {
  state.source = canvas;
  $$('#scan-steps li').forEach((li) => li.classList.remove('is-active', 'is-done'));
  show('view-scan');
  requestAnimationFrame(() => drawCover($('#scan-canvas'), canvas));

  try {
    await step('model', () => getLandmarker());
    const result = await step('detect', () => detectImage(canvas));
    const face = largestFace(result);
    if (!face) return showError('We couldn’t find a face', 'Try a brighter, straight-on photo where your whole face is visible and not too small.');

    const analysis = await step('pose', async () => analyzeLandmarks(face.landmarks, canvas.width, canvas.height));
    const quality = await step('measure', async () =>
      assessQuality({
        source: canvas,
        pixels: analysis.pixels,
        width: canvas.width,
        height: canvas.height,
        pose: analysis.pose,
        blendshapes: face.blendshapes,
        faceCount: face.faceCount,
      }),
    );
    state.analysis = analysis;
    state.quality = quality;
    await step('compare', async () => {
      state.lookalikes = await findLookalikes(analysis, { gender: 'all' }).catch(() => []);
    });

    renderResults();
    autoSave();
  } catch (err) {
    console.error('[analyze] failed', err);
    showError(
      'The analysis engine couldn’t start',
      'This usually means the face model couldn’t download or your browser blocked WebAssembly/WebGL. Check your connection, try Chrome, Edge, Safari or Firefox, and try again.',
    );
  }
}

function showError(title, msg) {
  $('#error-title').textContent = title;
  $('#error-msg').textContent = msg;
  show('view-error');
}

/* ------------------------------------------------------------------ */
/* Results                                                             */
/* ------------------------------------------------------------------ */
function renderResults() {
  show('view-results');
  // reset filter chips
  $$('[data-g]').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.g === 'all')));
  $$('.layer-toggles .chip').forEach((c) => c.setAttribute('aria-pressed', 'true'));

  const a = state.analysis;
  state.overlay = createOverlay($('#overlay-canvas'), { image: state.source, width: state.source.width, height: state.source.height, pixels: a.pixels });
  state.overlay.reveal(2000, reducedMotion());

  renderOverall();
  renderFeatureLists();
  renderTable();
  renderQuality();
  renderLookalikes();
  bindHighlights();
}

function renderOverall() {
  const a = state.analysis;
  const { strengths } = rankFeatures(a.scores);
  const shape = FACE_SHAPES[a.shape.key];
  const runner = FACE_SHAPES[a.shape.runnerUp];
  const q = state.quality;
  const qTier = q.score >= 80 ? 'good' : q.score >= 60 ? 'fair' : 'low';
  const C = 2 * Math.PI * 78;
  $('#overall').innerHTML = `
    <div class="ring overall__ring">
      <svg viewBox="0 0 180 180" aria-hidden="true">
        <defs><linearGradient id="ovGrad" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#67e8f9"/><stop offset=".5" stop-color="#818cf8"/><stop offset="1" stop-color="#e879f9"/></linearGradient></defs>
        <circle class="ring__track" cx="90" cy="90" r="78" stroke-width="11" fill="none"/>
        <circle class="ring__value" id="ov-ring" cx="90" cy="90" r="78" stroke="url(#ovGrad)" stroke-width="11" stroke-linecap="round" fill="none" stroke-dasharray="${C}" stroke-dashoffset="${C}"/>
      </svg>
      <div class="ring__label"><b class="overall__num" id="ov-num">0.0</b><span class="overall__of">/ 10</span></div>
    </div>
    <div>
      <p class="eyebrow">Overall</p>
      <h2 class="overall__tier">${tierLabel(a.overall)}</h2>
      <p class="overall__sub">Weighted average of 8 proportion scores. Strongest: ${strengths
        .slice(0, 2)
        .map((s) => s.def.name.toLowerCase())
        .join(' and ')}.</p>
      <div class="overall__chips">
        <span class="chip chip--accent" title="${escapeHtml(shape.blurb)}">${shape.name} face${a.shape.confidence < 0.5 ? ` · close to ${runner.name.toLowerCase()}` : ''}</span>
        <span class="chip chip--${qTier}">Photo quality ${q.score}/100</span>
      </div>
      <p class="faint small" style="margin-top:12px">${shape.blurb} Face shape is descriptive — never scored.</p>
    </div>`;
  requestAnimationFrame(() => {
    $('#ov-ring').style.strokeDashoffset = String(C * (1 - a.overall / 10));
    countUp($('#ov-num'), a.overall, { duration: 1800 });
  });
}

function featureCard(f, mode) {
  const a = state.analysis;
  const def = METRICS[f.key];
  const v = a.values[f.key];
  const [d0, d1] = def.domain;
  const pct = (x) => clamp(((x - d0) / (d1 - d0)) * 100, 0, 100);
  const side = rangeSide(f.key, v);
  const copy = mode === 'strength' ? def.strength : def.improve[side] || Object.values(def.improve)[0];
  return `
    <article class="feature" data-key="${f.key}" tabindex="0">
      <div class="feature__top">
        <h3 class="feature__name">${def.name}</h3>
        <span class="feature__score tier-${scoreTier(f.score)}">${f.score.toFixed(1)}<small>/10 · ${tierLabel(f.score)}</small></span>
      </div>
      <div class="feature__vals"><span>Your value <b>${def.format(v)}</b></span><span>Ideal <b>${def.idealLabel}</b></span></div>
      <div class="meter" style="--lo:${pct(def.ideal[0])}%;--hi:${pct(def.ideal[1])}%;--v:${pct(v)}%" role="img" aria-label="${escapeHtml(def.short)}: ${escapeHtml(def.format(v))}; ideal ${escapeHtml(def.idealLabel)}">
        <div class="meter__track"></div><div class="meter__ideal"></div><div class="meter__dot"></div>
      </div>
      <p>${copy}</p>
      ${mode === 'improve' ? `<p class="feature__influence"><b>What you can influence:</b> ${def.changeable}</p>` : ''}
      <details><summary>How it’s measured</summary><p>${def.what}</p><p>${def.how}</p><p class="faint">${def.reference}</p></details>
    </article>`;
}

function renderFeatureLists() {
  const { strengths, improve } = rankFeatures(state.analysis.scores);
  $('#strengths').innerHTML = strengths.map((f) => featureCard(f, 'strength')).join('');
  $('#improve').innerHTML = improve.length
    ? improve.map((f) => featureCard(f, 'improve')).join('')
    : `<p class="note-card">Every measurement sits close to its ideal range. Your plan will focus on keeping skin, sleep and style at their best.</p>`;
}

function renderTable() {
  const a = state.analysis;
  const rows = METRIC_KEYS.map((key) => {
    const def = METRICS[key];
    const s = a.scores[key];
    const tier = scoreTier(s);
    return `<tr data-key="${key}" tabindex="0"><td>${def.name}</td><td class="mono">${def.format(a.values[key])}</td><td class="mono">${def.idealLabel}</td>
      <td class="num"><span class="score-pill score-pill--${tier}"><i></i><b>${s.toFixed(1)}</b><span class="faint">${tierLabel(s)}</span></span></td></tr>`;
  });
  rows.push(`<tr><td>Face shape</td><td>${FACE_SHAPES[a.shape.key].name}</td><td>All shapes work</td><td class="num faint">Not scored</td></tr>`);
  $('#all-table tbody').innerHTML = rows.join('');
}

function renderQuality() {
  const q = state.quality;
  const summary =
    q.score >= 80
      ? 'Good photo — these results are reliable.'
      : q.score >= 60
        ? 'Usable, but a few things may nudge the numbers. A retake could help.'
        : 'Low photo quality — consider retaking for more accurate results.';
  const icon = { good: '✓', warn: '!', bad: '×' };
  $('#quality').innerHTML = `
    <div class="quality__top"><span class="quality__score">${q.score}<span class="faint small">/100</span></span><p class="muted">${summary}</p></div>
    <ul class="quality__list">
      ${q.checks.map((c) => `<li class="quality__item"><span class="status-icon status-icon--${c.status}" aria-label="${c.status}">${icon[c.status]}</span><span><b>${escapeHtml(c.label)}</b> — ${escapeHtml(c.tip)}</span></li>`).join('')}
    </ul>`;
}

function renderLookalikes() {
  const box = $('#lookalikes');
  if (!state.lookalikes.length) {
    box.innerHTML = '<p class="muted">Look-alike data isn’t available right now.</p>';
    return;
  }
  const initials = (name) =>
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  box.innerHTML = state.lookalikes
    .map(
      (l, i) => `
      <article class="look" style="--i:${i}">
        <div class="look__ava" aria-hidden="true">${escapeHtml(initials(l.name))}</div>
        <div class="look__name">${escapeHtml(l.name)}</div>
        <div class="look__sim">${l.similarity}%<small> similar</small></div>
        <div class="bar" aria-hidden="true"><i style="--w:${l.similarity}%"></i></div>
        <div class="look__why">Closest in ${l.closest.map((k) => FEATURE_LABELS[k] || k).join(', ').toLowerCase()}</div>
      </article>`,
    )
    .join('');
}

function bindHighlights() {
  const targets = [...$$('#strengths .feature, #improve .feature, #all-table tbody tr[data-key]')];
  const set = (key) => {
    state.overlay?.setHighlight(key);
    targets.forEach((t) => t.classList.toggle('is-active', t.dataset.key === key));
    $('#overlay-hint').textContent = key ? `Showing: ${METRICS[key].name}` : 'Hover or tap a measurement to see exactly what was measured.';
  };
  for (const t of targets) {
    t.addEventListener('pointerenter', () => set(t.dataset.key));
    t.addEventListener('focus', () => set(t.dataset.key));
    t.addEventListener('pointerleave', () => set(null));
    t.addEventListener('blur', () => set(null));
    t.addEventListener('click', (e) => {
      if (e.target.closest('summary, details')) return;
      set(t.classList.contains('is-active') && e.pointerType !== 'mouse' ? null : t.dataset.key);
    });
  }
}

/* ------------------------------------------------------------------ */
/* Save, share, plan                                                   */
/* ------------------------------------------------------------------ */
async function autoSave() {
  const a = state.analysis;
  try {
    const row = await saveAnalysis({
      overall: a.overall,
      scores: a.scores,
      values: a.values,
      face_shape: a.shape.key,
      quality: state.quality.score,
    });
    state.saved = row;
    toast('Scores saved to your history. Your photo was not stored.', {
      type: 'success',
      duration: 7000,
      action: {
        label: 'Undo',
        onClick: async () => {
          await deleteAnalysis(row.id).catch(() => {});
          state.saved = null;
          toast('Removed from your history.');
        },
      },
    });
  } catch (err) {
    console.error(err);
    toast(`Couldn’t save to your history: ${err.message}`, { type: 'error', duration: 7000 });
  }
}

async function startPlan(timeline, btn) {
  const a = state.analysis;
  const existing = await getActivePlan().catch(() => null);
  if (existing) {
    const ok = await confirmDialog({
      title: 'Start a new plan?',
      message: `You already have an active ${existing.plan?.label || ''} plan. Starting a new one archives it (your old progress stays in your data export).`,
      confirmLabel: 'Start new plan',
    });
    if (!ok) return;
  }
  btn.setAttribute('aria-pressed', 'true');
  const plan = generatePlan({
    timeline,
    analysis: { id: state.saved?.id, scores: a.scores, values: a.values, face_shape: a.shape.key },
    prefs: { facialHair: $('#pref-facial-hair').checked, ageBand: state.band },
  });
  try {
    await savePlan(plan);
    location.href = 'plan.html';
  } catch (err) {
    btn.setAttribute('aria-pressed', 'false');
    toast(`Couldn’t save your plan: ${err.message}`, { type: 'error' });
  }
}

async function openShare() {
  const body = html(`
    <div class="share-preview">
      <img alt="Preview of your results card">
      <label class="switch"><input type="checkbox" id="share-photo"> Include my photo (made on this device)</label>
    </div>`);
  const img = body.querySelector('img');
  let blob = null;
  let url = null;
  const update = async () => {
    const photo = body.querySelector('#share-photo').checked ? state.overlay.snapshot(880, 1100) : null;
    const canvas = await renderShareCard({ analysis: state.analysis, lookalike: state.lookalikes[0] || null, photo });
    blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
    if (url) URL.revokeObjectURL(url);
    url = URL.createObjectURL(blob);
    img.src = url;
  };
  body.querySelector('#share-photo').addEventListener('change', update);
  await update();

  const fileName = `hakim-iq-results-${new Date().toISOString().slice(0, 10)}.png`;
  const canShareFiles = (() => {
    try {
      return Boolean(navigator.canShare?.({ files: [new File([blob], fileName, { type: 'image/png' })] }));
    } catch {
      return false;
    }
  })();
  const actions = [{ label: 'Download PNG', variant: 'primary', onClick: () => (downloadBlob(blob, fileName), false) }];
  if (canShareFiles)
    actions.unshift({
      label: 'Share…',
      variant: 'glass',
      onClick: async () => {
        try {
          await navigator.share({ files: [new File([blob], fileName, { type: 'image/png' })], title: 'My Hakim IQ Labs results' });
        } catch {
          /* user cancelled */
        }
        return false;
      },
    });
  await openModal({ title: 'Your results card', body, actions, wide: true });
  if (url) URL.revokeObjectURL(url);
}

addEventListener('pagehide', stopCamera);
main();
