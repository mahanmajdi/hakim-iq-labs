/**
 * Landing page: 3D hero, Apple-style scroll storytelling, metric gallery,
 * score demo, glow-up preview and FAQ.
 */
import { renderShell } from '../ui/shell.js';
import { initMotion, countUp, onVisible, initReveals } from '../ui/motion.js';
import { faceDiagram } from '../ui/diagrams.js';
import { initAccordion, initSegmented } from '../ui/widgets.js';
import { METRICS, FACE_SHAPES } from '../analysis/ideals.js';
import { TASKS, TIMELINES, SHAPE_TIPS } from '../plan/library.js';
import { createHeroFace } from '../landing/hero-face.js';
import { $, $$, escapeHtml } from '../core/utils.js';

const FAQ = [
  ['Is Hakim IQ Labs really free?', 'Yes. There are no subscriptions, ads or locked "premium reports". The analysis runs in your browser and accounts run on Supabase’s free tier, so there is nothing to charge for.'],
  ['Is my photo uploaded anywhere?', 'No. The face model runs on your device (WebAssembly + WebGL). Your photo stays in your browser’s memory and is discarded when you leave the page. Only the resulting numbers — scores and measurements — are saved to your account.'],
  ['How accurate are the scores?', 'The landmarks are precise, but every measurement depends on the photo: lighting, lens distance, head angle and expression all shift results. That is why we run a photo-quality check and correct for head pose. Scores describe proportions only — they cannot capture skin, expression, style or charisma. Beauty isn’t one number.'],
  ['Where do the ideal ranges come from?', 'From proportions commonly cited in facial aesthetics, orthodontics and attractiveness research — equal facial thirds, the rule of fifths for eye spacing, a mouth about 1.5–1.6× the nose width, and so on. Each range is shown next to your measured value so you can judge it yourself.'],
  ['Why do I need an account?', 'To save your score history and plan progress, and to protect them. You can sign up with email (we send a verification link) or continue with Google.'],
  ['Can I actually improve my score?', 'Some readings — jaw definition, facial width, puffiness-related symmetry — respond to habits like sleep, body composition and posture. Others are set by bone structure. Your plan tells you honestly which is which, and never suggests surgery, crash diets or pseudoscience.'],
  ['How does the celebrity look-alike work?', 'It compares the ratios of your face (thirds, eye spacing, width-to-height and more) with ratios measured from public photos of well-known people. It is about proportions, not identity or appearance — and it is purely for fun.'],
  ['Who can use it?', 'Anyone aged 13 or older. Under-18s get glow-up plans without any calorie or dieting advice.'],
  ['How do I delete my data?', 'Dashboard → Account → Delete account removes your account and every saved score and plan immediately. You can export your data as JSON first, or delete only your history and keep the account.'],
];

const DEMO = [
  ['Symmetry', 9.1],
  ['Lips', 8.9],
  ['Thirds', 8.6],
  ['Canthal tilt', 8.2],
  ['Jawline', 7.4],
];

async function main() {
  renderShell();
  buildMetricCards();
  buildFaq();
  buildDemoBars();
  buildHowDots();
  initReveals();

  const hero = await createHeroFace($('#hero-canvas'));
  const motion = await initMotion({ smooth: true });
  initGlowPreview();

  if (motion.reduced || !motion.gsap) {
    document.body.classList.add('no-motion');
    revealScoreDemo();
    return;
  }
  scrollScenes(motion, hero);
}

/* ------------------------------------------------------------------ */
/* Content builders                                                    */
/* ------------------------------------------------------------------ */
function buildMetricCards() {
  const track = $('#metrics-track');
  const cards = Object.entries(METRICS).map(
    ([key, m], i) => `
    <article class="metric-card glass" data-spotlight data-tilt>
      <span class="metric-card__num">${String(i + 1).padStart(2, '0')}</span>
      ${faceDiagram(key)}
      <h3 class="h3">${m.name}</h3>
      <p>${m.what}</p>
      <div class="metric-card__ideal"><span>Ideal</span><b>${m.idealLabel}</b></div>
    </article>`,
  );
  cards.push(`
    <article class="metric-card glass" data-spotlight data-tilt>
      <span class="metric-card__num">09</span>
      ${faceDiagram('shape')}
      <h3 class="h3">Face shape</h3>
      <p>Oval, round, square, oblong, heart or diamond — from length, cheek, jaw and forehead ratios. Descriptive only, never scored: it drives your haircut, facial-hair and frame suggestions.</p>
      <div class="metric-card__ideal"><span>Ideal</span><b>None — all shapes work</b></div>
    </article>`);
  track.innerHTML = cards.join('');
}

function buildFaq() {
  $('#faq-list').innerHTML = FAQ.map(
    ([q, a], i) => `
    <div class="acc-item">
      <button class="acc-item__btn" aria-expanded="false" aria-controls="faq-${i}" id="faq-q-${i}">${escapeHtml(q)}<span class="acc-item__icon" aria-hidden="true"></span></button>
      <div class="acc-item__panel" id="faq-${i}" role="region" aria-labelledby="faq-q-${i}"><div><p>${escapeHtml(a)}</p></div></div>
    </div>`,
  ).join('');
  initAccordion($('#faq-list'));
}

function buildDemoBars() {
  $('#demo-bars').innerHTML = DEMO.map(
    ([label, v]) => `<li><span>${label}</span><div class="bar"><i data-w="${v * 10}%"></i></div><b>${v.toFixed(1)}</b></li>`,
  ).join('');
  onVisible($('.score__visual'), revealScoreDemo, 0.4);
}

function revealScoreDemo() {
  const ring = $('#demo-ring');
  const C = 2 * Math.PI * 112;
  ring.style.strokeDashoffset = String(C * (1 - 0.84));
  countUp($('#demo-score'), 8.4, { duration: 1800 });
  $$('#demo-bars i').forEach((el, i) => setTimeout(() => (el.style.width = el.dataset.w), 150 + i * 90));
}

/** Scatter landmark dots inside the "Measure" illustration. */
function buildHowDots() {
  const g = $('.how-dots');
  if (!g) return;
  let seed = 3;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const dots = [];
  for (let i = 0; i < 90; i++) {
    const t = rand() * Math.PI * 2;
    const r = Math.sqrt(rand());
    const x = 200 + Math.cos(t) * r * 74;
    const y = 200 + Math.sin(t) * r * 112;
    dots.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(1.4 + rand() * 1.4).toFixed(1)}" opacity="${(0.5 + rand() * 0.5).toFixed(2)}"/>`);
  }
  g.innerHTML = dots.join('');
}

function initGlowPreview() {
  const panel = $('#glow-panel');
  const tips = SHAPE_TIPS.oval;
  const ctx = { shape: 'oval', hairTip: tips.hair, beardTip: tips.beard, glassesTip: tips.glasses, necklineTip: tips.neckline, browTip: '' };
  const fill = (t) => t.replace(/\{(\w+)\}/g, (_, k) => ctx[k] ?? '');
  const render = (key) => {
    const tl = TIMELINES[key];
    const periods = tl.periods.slice(0, 3).map((ids, pi) => {
      const items = ids.filter((id) => TASKS[id] && !TASKS[id].teen && TASKS[id].lever !== 'beard').slice(0, 3);
      const label = tl.periodLabels?.[pi] || `${tl.unit} ${pi + 1}`;
      return `<div class="glow__period" style="--i:${pi}"><h4>${label}</h4><ul>${items
        .map((id, ii) => `<li class="${pi === 0 && ii < 2 ? 'done' : ''}"><i></i>${escapeHtml(fill(TASKS[id].title))}</li>`)
        .join('')}</ul></div>`;
    });
    panel.innerHTML = `
      <div>
        <h3 class="display d-s">${tl.label}</h3>
        <p class="muted">${tl.summary}</p>
        <ul class="glow__expect">${tl.expect.map((e) => `<li>${e}</li>`).join('')}</ul>
        <p class="glow__note"><strong>Honest note:</strong> ${tl.notChanging}</p>
      </div>
      <div class="glow__periods">${periods.join('')}</div>`;
  };
  initSegmented($('.glow__tabs'), (btn) => render(btn.dataset.tl));
  render('weeks');
}

/* ------------------------------------------------------------------ */
/* Scroll storytelling                                                 */
/* ------------------------------------------------------------------ */
function scrollScenes({ gsap, ScrollTrigger }, hero) {
  // Hero: copy lifts away, mesh dissolves into a constellation.
  ScrollTrigger.create({
    trigger: '.hero',
    start: 'top top',
    end: 'bottom top',
    scrub: true,
    onUpdate: (s) => hero.setScroll(s.progress),
  });
  gsap.to('.hero__content', {
    yPercent: -22,
    opacity: 0,
    scale: 0.97,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: '65% top', scrub: true },
  });
  gsap.to('.hero__hud', { opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: '5% top', end: '40% top', scrub: true } });
  gsap.from('.hero__content > *', { y: 30, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: 0.09, delay: 0.15 });

  // Statement: words light up as you read.
  const text = $('.statement__text');
  text.innerHTML = text.textContent
    .split(' ')
    .map((w) => `<span class="word">${escapeHtml(w)}</span>`)
    .join(' ');
  gsap.to('.statement__text .word', {
    opacity: 1,
    stagger: 0.1,
    ease: 'none',
    scrollTrigger: { trigger: '.statement', start: 'top 78%', end: 'bottom 50%', scrub: true },
  });

  const mm = gsap.matchMedia();

  // How it works: pinned, three steps.
  mm.add('(min-width: 901px)', () => {
    const steps = $$('.how__step');
    const layers = $$('.how-layer');
    const bar = $('.how__progress i');
    let current = -1;
    const setStep = (i) => {
      if (i === current) return;
      current = i;
      steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
      layers.forEach((l, k) => gsap.to(l, { opacity: k === i ? 1 : 0, duration: 0.6, ease: 'power2.out' }));
    };
    setStep(0);
    ScrollTrigger.create({
      trigger: '.how',
      start: 'top top',
      end: '+=220%',
      pin: '.how__pin',
      scrub: true,
      onUpdate: (s) => {
        bar.style.transform = `scaleX(${0.33 + s.progress * 0.67})`;
        setStep(Math.min(2, Math.floor(s.progress * 3)));
      },
    });
    return () => layers.forEach((l) => (l.style.opacity = ''));
  });
  mm.add('(max-width: 900px)', () => {
    $$('.how-layer').forEach((l) => (l.style.opacity = l.dataset.layer === '1' ? 1 : 0));
  });

  // Metrics: horizontal gallery driven by vertical scroll.
  mm.add('(min-width: 901px)', () => {
    const track = $('#metrics-track');
    const distance = () => Math.max(0, track.scrollWidth - innerWidth);
    gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: '.metrics',
        start: 'top top',
        end: () => `+=${distance()}`,
        pin: '.metrics__pin',
        scrub: 0.6,
        invalidateOnRefresh: true,
      },
    });
  });

  // Privacy: headline scales into place, lock clicks shut.
  gsap.fromTo(
    '.privacy__title',
    { scale: 0.84, opacity: 0.25 },
    { scale: 1, opacity: 1, ease: 'none', scrollTrigger: { trigger: '.privacy', start: 'top 85%', end: 'top 20%', scrub: true } },
  );
  gsap.fromTo(
    '.lock-shackle',
    { y: -14 },
    { y: 0, duration: 0.7, ease: 'back.out(3)', scrollTrigger: { trigger: '.privacy__lock', start: 'top 70%' } },
  );

  // CTA glow breathes with scroll.
  gsap.fromTo('.cta__glow', { scale: 0.7, opacity: 0.4 }, { scale: 1.1, opacity: 1, ease: 'none', scrollTrigger: { trigger: '.cta', start: 'top bottom', end: 'bottom bottom', scrub: true } });

  // Fonts/images can change layout heights — refresh once everything has loaded.
  addEventListener('load', () => ScrollTrigger.refresh());
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}

main();
