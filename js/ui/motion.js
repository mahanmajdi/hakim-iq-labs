/**
 * Motion system: Lenis smooth scrolling + GSAP/ScrollTrigger, scroll reveals,
 * magnetic buttons, cursor spotlights, tilt cards and animated counters.
 *
 * Everything degrades gracefully: with "reduce motion" enabled (or if the
 * CDN is unreachable) content is shown statically and nothing is pinned.
 */
import { CDN } from '../core/cdn.js';

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = () => matchMedia('(hover: hover) and (pointer: fine)').matches;

/**
 * @param {{ smooth?: boolean }} opts  smooth = enable Lenis smooth scrolling
 * @returns {Promise<{ gsap: any, ScrollTrigger: any, lenis: any, reduced: boolean }>}
 */
export async function initMotion({ smooth = true } = {}) {
  initReveals();
  initMagnetic();
  initSpotlight();
  initTilt();

  if (reducedMotion()) return { gsap: null, ScrollTrigger: null, lenis: null, reduced: true };

  try {
    const [{ gsap }, { ScrollTrigger }, lenisMod] = await Promise.all([
      import(CDN.gsap),
      import(CDN.scrollTrigger),
      smooth ? import(CDN.lenis) : Promise.resolve(null),
    ]);
    gsap.registerPlugin(ScrollTrigger);

    let lenis = null;
    if (lenisMod) {
      const Lenis = lenisMod.default ?? lenisMod.Lenis;
      lenis = new Lenis({
        duration: 1.15,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
      });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
      bindAnchorLinks(lenis);
    }
    return { gsap, ScrollTrigger, lenis, reduced: false };
  } catch (err) {
    console.warn('[motion] animation libraries unavailable, continuing without them', err);
    return { gsap: null, ScrollTrigger: null, lenis: null, reduced: true };
  }
}

/** Smooth-scroll in-page anchor links through Lenis. */
function bindAnchorLinks(lenis) {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    const target = id.length > 1 && document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { offset: -72 });
    history.pushState(null, '', id);
  });
}

/** Fade/slide elements in as they enter the viewport. */
export function initReveals(root = document) {
  const els = root.querySelectorAll('[data-reveal]:not(.is-in)');
  if (!('IntersectionObserver' in window) || reducedMotion()) {
    els.forEach((el) => el.classList.add('is-in'));
    return;
  }
  // Stagger children of [data-reveal-stagger]
  root.querySelectorAll('[data-reveal-stagger]').forEach((parent) => {
    [...parent.querySelectorAll('[data-reveal]')].forEach((el, i) => el.style.setProperty('--delay', `${i * 0.08}s`));
  });
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );
  els.forEach((el) => io.observe(el));
}

/** Buttons drift slightly toward the cursor. */
function initMagnetic() {
  if (!finePointer() || reducedMotion()) return;
  document.addEventListener('pointermove', (e) => {
    const el = e.target.closest?.('[data-magnetic]');
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) * 0.22;
    const y = (e.clientY - (r.top + r.height / 2)) * 0.3;
    el.style.transform = `translate(${x}px, ${y}px)`;
  });
  document.addEventListener(
    'pointerout',
    (e) => {
      const el = e.target.closest?.('[data-magnetic]');
      if (el && !el.contains(e.relatedTarget)) el.style.transform = '';
    },
    true,
  );
}

/** Radial highlight that follows the cursor inside glass cards. */
function initSpotlight() {
  if (!finePointer()) return;
  document.addEventListener('pointermove', (e) => {
    const el = e.target.closest?.('[data-spotlight]');
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  });
}

/** Subtle 3D tilt for [data-tilt] cards. */
function initTilt() {
  if (!finePointer() || reducedMotion()) return;
  document.addEventListener('pointermove', (e) => {
    const el = e.target.closest?.('[data-tilt]');
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${px * 6}deg) rotateX(${-py * 6}deg) translateZ(0)`;
  });
  document.addEventListener(
    'pointerout',
    (e) => {
      const el = e.target.closest?.('[data-tilt]');
      if (el && !el.contains(e.relatedTarget)) el.style.transform = '';
    },
    true,
  );
}

/** Animated number counter (ease-out quart). */
export function countUp(el, to, { duration = 1600, decimals = 1, prefix = '', suffix = '', from = 0 } = {}) {
  const fmt = (v) => `${prefix}${v.toFixed(decimals)}${suffix}`;
  if (reducedMotion()) {
    el.textContent = fmt(to);
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      el.textContent = fmt(from + (to - from) * eased);
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

/** Run `cb` once when `el` first becomes visible. */
export function onVisible(el, cb, threshold = 0.35) {
  if (!('IntersectionObserver' in window)) return cb();
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        cb();
      }
    },
    { threshold },
  );
  io.observe(el);
}
