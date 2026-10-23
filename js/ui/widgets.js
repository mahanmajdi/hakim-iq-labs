/** Small reusable widgets: accordion and segmented control. */

/** Accordion: toggles aria-expanded; CSS animates the panel height. */
export function initAccordion(root) {
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('.acc-item__btn');
    if (!btn) return;
    btn.setAttribute('aria-expanded', String(btn.getAttribute('aria-expanded') !== 'true'));
  });
}

/**
 * Segmented control with a sliding thumb.
 * @param {HTMLElement} root  .segmented element containing buttons
 * @param {(btn: HTMLButtonElement) => void} onChange
 */
export function initSegmented(root, onChange) {
  const thumb = root.querySelector('.segmented__thumb');
  const buttons = [...root.querySelectorAll('button')];
  const selected = () => buttons.find((b) => b.getAttribute('aria-selected') === 'true') || buttons[0];
  const place = (btn) => {
    if (!thumb || !btn) return;
    thumb.style.width = `${btn.offsetWidth}px`;
    thumb.style.transform = `translateX(${btn.offsetLeft}px)`;
  };
  buttons.forEach((b) =>
    b.addEventListener('click', () => {
      if (b === selected() && b.dataset.init) return;
      b.dataset.init = '1';
      buttons.forEach((x) => {
        x.setAttribute('aria-selected', String(x === b));
        x.tabIndex = x === b ? 0 : -1;
      });
      place(b);
      onChange?.(b);
    }),
  );
  root.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const i = buttons.indexOf(selected());
    const next = buttons[(i + (e.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length];
    next.focus();
    next.click();
  });
  buttons.forEach((x) => (x.tabIndex = x === selected() ? 0 : -1));
  requestAnimationFrame(() => place(selected()));
  new ResizeObserver(() => place(selected())).observe(root);
  document.fonts?.ready.then(() => place(selected()));
}
