/**
 * Shared page chrome: navigation, mobile sheet, footer, toasts and modals.
 * Every page calls renderShell() once; the nav reflects the auth state.
 */
import { getUser, signOut, isConfigured } from '../core/auth.js';
import { $, escapeHtml, html } from '../core/utils.js';
import { icons, logoMark } from './icons.js';

const LINKS = [
  { href: 'index.html#how', label: 'How it works' },
  { href: 'index.html#features', label: 'Measurements' },
  { href: 'index.html#glow-up', label: 'Glow-up' },
  { href: 'privacy.html', label: 'Privacy' },
  { href: 'index.html#faq', label: 'FAQ' },
];

/**
 * @param {object} opts
 * @param {boolean} [opts.solid]  start with an opaque nav (app pages)
 * @param {string}  [opts.page]   current page id for aria-current
 */
export async function renderShell({ solid = false, page = '' } = {}) {
  const onLanding = document.body.classList.contains('page-landing');
  const href = (h) => (onLanding && h.startsWith('index.html#') ? h.slice(10) : h);

  const header = $('#site-nav');
  header.innerHTML = `
    <nav class="nav ${solid ? 'is-solid' : ''}" aria-label="Primary">
      <div class="container container--wide nav__inner">
        <a class="brand" href="index.html" aria-label="Hakim IQ Labs home">${logoMark()}<span>Hakim IQ <span class="brand__lab">Labs</span></span></a>
        <div class="nav__links">
          ${LINKS.map((l) => `<a href="${href(l.href)}" ${page && l.href === page ? 'aria-current="page"' : ''}>${l.label}</a>`).join('')}
        </div>
        <div class="nav__actions" data-auth-slot>
          <a class="btn btn--primary btn--sm" href="analyze.html" data-magnetic>Analyze free</a>
        </div>
        <button class="nav__burger" aria-label="Open menu" aria-expanded="false" aria-controls="nav-sheet"><span></span></button>
      </div>
    </nav>
    <div class="nav-sheet" id="nav-sheet">
      ${LINKS.map((l) => `<a href="${href(l.href)}">${l.label}</a>`).join('')}
      <div data-auth-sheet></div>
    </div>`;

  // Solid background once the page scrolls.
  const nav = $('.nav', header);
  const onScroll = () => nav.classList.toggle('is-scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile sheet
  const burger = $('.nav__burger', header);
  const sheet = $('#nav-sheet');
  const setOpen = (open) => {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    sheet.classList.toggle('is-open', open);
  };
  burger.addEventListener('click', () => setOpen(burger.getAttribute('aria-expanded') !== 'true'));
  sheet.addEventListener('click', (e) => e.target.closest('a') && setOpen(false));
  addEventListener('keydown', (e) => e.key === 'Escape' && setOpen(false));

  renderFooter();

  // Auth-aware actions
  const user = await getUser().catch(() => null);
  const slot = $('[data-auth-slot]', header);
  const sheetSlot = $('[data-auth-sheet]', sheet);
  if (user && !user.demo) {
    const initial = escapeHtml((user.name || user.email || '?').trim()[0].toUpperCase());
    slot.innerHTML = `
      <a class="btn btn--ghost btn--sm hide-mobile" href="dashboard.html">Dashboard</a>
      <a class="btn btn--primary btn--sm" href="analyze.html" data-magnetic>Analyze</a>
      <button class="avatar" aria-label="Account menu" aria-haspopup="true" aria-expanded="false">${initial}</button>`;
    sheetSlot.innerHTML = `<a href="dashboard.html">Dashboard</a><a href="plan.html">My glow-up plan</a>
      <button class="btn btn--glass btn--block" data-signout>${icons.logout}Sign out</button>`;
    attachAccountMenu($('.avatar', slot), user);
  } else if (user?.demo) {
    slot.innerHTML = `
      <a class="btn btn--ghost btn--sm hide-mobile" href="dashboard.html">Dashboard</a>
      <a class="btn btn--primary btn--sm" href="analyze.html" data-magnetic>Analyze free</a>`;
    sheetSlot.innerHTML = `<a href="dashboard.html">Dashboard</a><a href="plan.html">My glow-up plan</a>`;
  } else {
    slot.insertAdjacentHTML('afterbegin', `<a class="btn btn--ghost btn--sm hide-mobile" href="auth.html">Sign in</a>`);
    sheetSlot.innerHTML = `<a class="btn btn--primary btn--block" href="auth.html?mode=signup">Create free account</a>`;
  }
  sheetSlot.querySelector('[data-signout]')?.addEventListener('click', signOut);

  if (!isConfigured && document.body.dataset.app !== undefined) {
    $('#main')?.prepend(
      html(`<div class="container container--wide"><p class="demo-banner" role="status"><strong>Demo mode</strong> — Supabase isn't configured yet, so there are no accounts and your history stays in this browser only. See the README to switch accounts on.</p></div>`),
    );
  }
  return user;
}

function attachAccountMenu(btn, user) {
  const menu = html(`
    <div class="account-menu glass" role="menu" hidden>
      <div class="account-menu__who"><strong>${escapeHtml(user.name)}</strong><span>${escapeHtml(user.email || '')}</span></div>
      <a role="menuitem" href="dashboard.html">${icons.chart}Dashboard</a>
      <a role="menuitem" href="plan.html">${icons.calendar}Glow-up plan</a>
      <a role="menuitem" href="privacy.html">${icons.shield}Privacy</a>
      <button role="menuitem" data-signout>${icons.logout}Sign out</button>
    </div>`);
  document.body.append(menu);
  const place = () => {
    const r = btn.getBoundingClientRect();
    menu.style.top = `${r.bottom + 10}px`;
    menu.style.right = `${Math.max(12, innerWidth - r.right)}px`;
  };
  const toggle = (open) => {
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    if (open) place();
  };
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle(menu.hidden);
  });
  document.addEventListener('click', (e) => !menu.contains(e.target) && toggle(false));
  addEventListener('keydown', (e) => e.key === 'Escape' && toggle(false));
  menu.querySelector('[data-signout]').addEventListener('click', signOut);
}

function renderFooter() {
  const footer = $('#site-footer');
  if (!footer) return;
  const year = new Date().getFullYear();
  footer.innerHTML = `
    <div class="footer">
      <div class="container container--wide">
        <div class="footer__grid">
          <div class="footer__about">
            <a class="brand" href="index.html">${logoMark()}<span>Hakim IQ <span class="brand__lab">Labs</span></span></a>
            <p>Free, privacy-first face analysis. Your photo is processed on your device and never uploaded.</p>
          </div>
          <div>
            <h4>Product</h4>
            <ul>
              <li><a href="analyze.html">Analyze</a></li>
              <li><a href="plan.html">Glow-up plan</a></li>
              <li><a href="dashboard.html">Dashboard</a></li>
            </ul>
          </div>
          <div>
            <h4>Learn</h4>
            <ul>
              <li><a href="index.html#how">How it works</a></li>
              <li><a href="index.html#features">What we measure</a></li>
              <li><a href="index.html#faq">FAQ</a></li>
            </ul>
          </div>
          <div>
            <h4>Trust</h4>
            <ul>
              <li><a href="privacy.html">Privacy</a></li>
              <li><a href="privacy.html#age">Age requirement (13+)</a></li>
              <li><a href="privacy.html#delete">Delete your data</a></li>
            </ul>
          </div>
        </div>
        <div class="footer__bottom">
          <span>© ${year} Hakim IQ Labs. Scores describe proportions, not worth.</span>
          <span>Made with MediaPipe, Three.js, GSAP &amp; Supabase · 100% free</span>
        </div>
      </div>
    </div>`;
}

/* ------------------------------------------------------------------ */
/* Toasts                                                              */
/* ------------------------------------------------------------------ */
let toastRoot;
export function toast(message, { type = 'info', action, duration = 4200 } = {}) {
  toastRoot ??= document.body.appendChild(html('<div class="toasts" role="status" aria-live="polite"></div>'));
  const el = html(`<div class="toast toast--${type}"><i class="toast__icon"></i><span class="toast__msg"></span></div>`);
  el.querySelector('.toast__msg').textContent = message;
  if (action) {
    const b = html(`<button class="btn btn--glass btn--sm"></button>`);
    b.textContent = action.label;
    b.addEventListener('click', () => {
      action.onClick();
      dismiss();
    });
    el.append(b);
  }
  toastRoot.append(el);
  const dismiss = () => {
    el.classList.add('is-leaving');
    setTimeout(() => el.remove(), 350);
  };
  setTimeout(dismiss, duration);
  return dismiss;
}

/* ------------------------------------------------------------------ */
/* Modal                                                               */
/* ------------------------------------------------------------------ */
/**
 * Open a modal. `body` may be an HTML string or a Node.
 * `actions`: [{ label, variant, value, onClick }] — resolves with the chosen value.
 */
export function openModal({ title, body = '', actions = [], wide = false, dismissible = true, onOpen } = {}) {
  return new Promise((resolve) => {
    const prevFocus = document.activeElement;
    const modal = html(`
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal__panel glass ${wide ? 'modal__panel--wide' : ''}">
          ${dismissible ? `<button class="modal__close" aria-label="Close">${icons.x}</button>` : ''}
          <h2 class="modal__title" id="modal-title"></h2>
          <div class="modal__body"></div>
          <div class="modal__actions"></div>
        </div>
      </div>`);
    modal.querySelector('.modal__title').textContent = title;
    const bodyEl = modal.querySelector('.modal__body');
    if (typeof body === 'string') bodyEl.innerHTML = body;
    else if (body) bodyEl.append(body);

    const close = (value) => {
      modal.classList.remove('is-open');
      document.removeEventListener('keydown', onKey);
      setTimeout(() => modal.remove(), 350);
      prevFocus?.focus?.();
      resolve(value);
    };
    const actionsEl = modal.querySelector('.modal__actions');
    for (const a of actions) {
      const b = html(`<button class="btn btn--${a.variant || 'glass'}"></button>`);
      b.textContent = a.label;
      b.addEventListener('click', async () => {
        if (a.onClick) {
          const keepOpen = (await a.onClick(modal)) === false;
          if (keepOpen) return;
        }
        close(a.value);
      });
      actionsEl.append(b);
    }
    if (!actions.length) actionsEl.remove();

    const onKey = (e) => {
      if (e.key === 'Escape' && dismissible) close(undefined);
      if (e.key === 'Tab') trapFocus(e, modal);
    };
    document.addEventListener('keydown', onKey);
    if (dismissible) {
      modal.querySelector('.modal__close').addEventListener('click', () => close(undefined));
      modal.addEventListener('click', (e) => e.target === modal && close(undefined));
    }
    document.body.append(modal);
    requestAnimationFrame(() => modal.classList.add('is-open'));
    onOpen?.(modal, close);
    (modal.querySelector('input, select, .modal__actions .btn--primary, .modal__actions .btn') || modal.querySelector('.modal__close'))?.focus();
  });
}

function trapFocus(e, root) {
  const f = [...root.querySelectorAll('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])')];
  if (!f.length) return;
  const first = f[0];
  const last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    last.focus();
    e.preventDefault();
  } else if (!e.shiftKey && document.activeElement === last) {
    first.focus();
    e.preventDefault();
  }
}

export function confirmDialog({ title, message, confirmLabel = 'Confirm', danger = false }) {
  return openModal({
    title,
    body: `<p>${escapeHtml(message)}</p>`,
    actions: [
      { label: 'Cancel', variant: 'ghost', value: false },
      { label: confirmLabel, variant: danger ? 'danger' : 'primary', value: true },
    ],
  });
}
