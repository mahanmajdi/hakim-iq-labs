/**
 * Line-art face diagrams that explain each measurement.
 * Used on the landing page cards and in the results "what this measures" panels.
 */

let n = 0;

const FACE = `
  <path class="dg-face" d="M100 18C146 18 172 52 172 102c0 38-12 68-32 90-14 16-28 28-40 30-12-2-26-14-40-30-20-22-32-52-32-90 0-50 26-84 72-84z"/>
  <path class="dg-soft" d="M52 88q14-8 32-2M116 86q18-6 32 2"/>
  <path class="dg-soft" d="M56 104q14-9 28 0-14 7-28 0zM116 104q14-9 28 0-14 7-28 0z"/>
  <circle class="dg-fill" cx="70" cy="104" r="3.4"/><circle class="dg-fill" cx="130" cy="104" r="3.4"/>
  <path class="dg-soft" d="M100 100v38M90 142q-4 6 4 7M110 142q4 6-4 7M94 148q6 3 12 0"/>
  <path class="dg-soft" d="M80 170q10-6 20-3 10-3 20 3M80 170q20 5 40 0M82 171q18 13 36 0"/>`;

const dot = (x, y) => `<circle class="dg-dot" cx="${x}" cy="${y}" r="3"/>`;
const line = (x1, y1, x2, y2, cls = 'dg-line') => `<path class="${cls}" d="M${x1} ${y1}L${x2} ${y2}"/>`;

const OVERLAYS = {
  symmetry: () => `
    ${line(100, 8, 100, 232, 'dg-line dg-dash')}
    ${line(56, 104, 144, 104, 'dg-line dg-faint')}${line(80, 170, 120, 170, 'dg-line dg-faint')}${line(48, 178, 152, 178, 'dg-line dg-faint')}
    ${dot(56, 104)}${dot(144, 104)}${dot(84, 104)}${dot(116, 104)}${dot(80, 170)}${dot(120, 170)}${dot(48, 178)}${dot(152, 178)}`,
  thirds: () => `
    ${line(20, 30, 180, 30, 'dg-line dg-dash dg-faint')}${line(20, 86, 180, 86, 'dg-line dg-dash')}${line(20, 148, 180, 148, 'dg-line dg-dash')}${line(20, 222, 180, 222, 'dg-line dg-dash')}
    <path class="dg-line" d="M188 88v58M184 88h8M184 146h8M188 150v70M184 150h8M184 220h8"/>
    <text class="dg-text" x="192" y="121">II</text><text class="dg-text" x="192" y="189">III</text>`,
  jaw: () => `
    <path class="dg-line" d="M48 178L100 222L152 178"/>
    <path class="dg-arc" d="M84 208.5a21 21 0 0 0 32 0"/>
    <path class="dg-line dg-dash dg-faint" d="M30 116L48 178M170 116L152 178"/>
    ${dot(48, 178)}${dot(100, 222)}${dot(152, 178)}`,
  canthal: () => `
    ${line(40, 104, 160, 104, 'dg-line dg-dash dg-faint')}
    ${line(88, 106, 50, 99)}${line(112, 106, 150, 99)}
    <path class="dg-arc" d="M62 104a12 12 0 0 1 1-4.5M138 104a12 12 0 0 0-1-4.5"/>
    ${dot(84, 104)}${dot(56, 101)}${dot(116, 104)}${dot(144, 101)}`,
  eyeSpacing: () => `
    <path class="dg-line" d="M56 90v6M84 90v6M116 90v6M144 90v6M56 93h28M116 93h28"/>
    <path class="dg-line dg-hot" d="M84 93h32"/>
    ${dot(56, 104)}${dot(84, 104)}${dot(116, 104)}${dot(144, 104)}`,
  noseMouth: () => `
    <path class="dg-line" d="M90 136v16M110 136v16M90 144h20"/>
    <path class="dg-line dg-hot" d="M80 162v16M120 162v16M80 170h40"/>
    ${dot(90, 144)}${dot(110, 144)}${dot(80, 170)}${dot(120, 170)}`,
  lips: () => `
    <path class="dg-line" d="M130 164h8M130 170.5h8M134 164v6.5"/>
    <path class="dg-line dg-hot" d="M130 171.5h8M130 183h8M134 171.5v11.5"/>
    ${dot(100, 164)}${dot(100, 170)}${dot(100, 183)}`,
  fwhr: () => `
    <rect class="dg-line dg-dash" x="28" y="86" width="144" height="80" rx="4"/>
    <path class="dg-line dg-hot" d="M28 112h144"/>
    ${dot(28, 112)}${dot(172, 112)}${dot(100, 86)}${dot(100, 166)}`,
  shape: () => `
    <path class="dg-line dg-dash dg-faint" d="M100 24c40 0 64 30 64 78 0 64-34 114-64 114S36 166 36 102c0-48 24-78 64-78z"/>
    <path class="dg-line" d="M100 18C146 18 172 52 172 102c0 38-12 68-32 90-14 16-28 28-40 30-12-2-26-14-40-30-20-22-32-52-32-90 0-50 26-84 72-84z"/>
    ${dot(48, 60)}${dot(152, 60)}${dot(28, 110)}${dot(172, 110)}${dot(48, 178)}${dot(152, 178)}${dot(100, 222)}`,
};

/** @param {keyof OVERLAYS} key */
export function faceDiagram(key, { className = 'diagram' } = {}) {
  const id = `dg${++n}`;
  const overlay = OVERLAYS[key] ? OVERLAYS[key]() : '';
  return `<svg class="${className}" viewBox="0 0 200 240" fill="none" aria-hidden="true" style="--dg-grad:url(#${id})">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="200" y2="240" gradientUnits="userSpaceOnUse">
      <stop stop-color="#67e8f9"/><stop offset=".5" stop-color="#818cf8"/><stop offset="1" stop-color="#e879f9"/>
    </linearGradient></defs>
    ${FACE}
    <g class="dg-overlay">${overlay}</g>
  </svg>`;
}
