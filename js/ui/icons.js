/** Inline SVG icon set (stroke icons, 24×24, currentColor). */

const s = (d, extra = '') =>
  `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;

export const icons = {
  arrow: s('<path d="M5 12h14M13 6l6 6-6 6"/>').replace('class="icon"', 'class="icon icon--arrow"'),
  back: s('<path d="M19 12H5M11 18l-6-6 6-6"/>'),
  lock: s('<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>'),
  shield: s('<path d="M12 3l7.5 3v5.6c0 4.6-3.2 8.3-7.5 9.4-4.3-1.1-7.5-4.8-7.5-9.4V6z"/><path d="M8.8 12.2l2.2 2.2 4.3-4.6"/>'),
  sparkle: s('<path d="M12 3.5l1.8 5.2 5.2 1.8-5.2 1.8L12 17.5l-1.8-5.2-5.2-1.8 5.2-1.8z"/><path d="M19 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>'),
  check: s('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  x: s('<path d="M6 6l12 12M18 6L6 18"/>'),
  camera: s('<path d="M3.5 8.5A2 2 0 0 1 5.5 6.5h2l1.5-2h6l1.5 2h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.6"/>'),
  upload: s('<path d="M12 15.5V4M7.5 8.5L12 4l4.5 4.5"/><path d="M4.5 14.5v3a2.5 2.5 0 0 0 2.5 2.5h10a2.5 2.5 0 0 0 2.5-2.5v-3"/>'),
  eye: s('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
  eyeOff: s('<path d="M3 3l18 18M10.6 5.6A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-3 3.8M6.6 6.6C3.9 8.4 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.3-1.1M9.9 9.9a3 3 0 0 0 4.2 4.2"/>'),
  trash: s('<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5"/>'),
  download: s('<path d="M12 4v11.5M7.5 11l4.5 4.5 4.5-4.5"/><path d="M4.5 18.5h15"/>'),
  share: s('<circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="M8.2 10.8l7.6-4.1M8.2 13.2l7.6 4.1"/>'),
  refresh: s('<path d="M20 11.5A8 8 0 0 0 5.6 7M4 12.5A8 8 0 0 0 18.4 17"/><path d="M5 3.5V7.5H9M19 20.5V16.5H15"/>'),
  sun: s('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/>'),
  target: s('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>'),
  smile: s('<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14.5h7M9 9.8h.01M15 9.8h.01"/>'),
  user: s('<circle cx="12" cy="8.5" r="4"/><path d="M4.5 20.5c.8-3.8 3.9-6 7.5-6s6.7 2.2 7.5 6"/>'),
  logout: s('<path d="M14.5 4.5h3a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-3M10 16.5L5.5 12 10 7.5M5.5 12h10"/>'),
  chart: s('<path d="M4 19.5h16"/><path d="M5.5 15.5l4.5-5 3.5 3 5-6.5"/>'),
  info: s('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8h.01"/>'),
  calendar: s('<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
  scan: s('<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><path d="M4 12h16"/>'),
  google:
    '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.68-.06-1.36-.18-2.02H12v3.83h5.4a4.62 4.62 0 0 1-2 3.03v2.5h3.24c1.9-1.75 2.96-4.33 2.96-7.34z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.43l-3.24-2.5c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.76-5.6-4.12H3.06v2.58A10 10 0 0 0 12 22z"/><path fill="#FBBC04" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.52H3.06a10 10 0 0 0 0 8.96z"/><path fill="#EA4335" d="M12 5.98c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.94 5.52L6.4 10.1C7.2 7.74 9.4 5.98 12 5.98z"/></svg>',
};

let logoCount = 0;

/** Brand mark: a face contour with a midline and eye axis — "geometry, measured". */
export function logoMark(cls = 'brand__mark') {
  const id = `hg${++logoCount}`;
  return `<svg class="${cls}" viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <defs><linearGradient id="${id}" x1="4" y1="3" x2="28" y2="29" gradientUnits="userSpaceOnUse">
      <stop stop-color="#67e8f9"/><stop offset=".5" stop-color="#818cf8"/><stop offset="1" stop-color="#e879f9"/>
    </linearGradient></defs>
    <path d="M16 3.2c6 0 9.8 4.5 9.8 10.3 0 6.8-4.5 13.2-9.8 15.3-5.3-2.1-9.8-8.5-9.8-15.3C6.2 7.7 10 3.2 16 3.2z" stroke="url(#${id})" stroke-width="1.7"/>
    <path d="M16 6.5v19" stroke="url(#${id})" stroke-width="1.1" stroke-dasharray="1.4 2.4" opacity=".7"/>
    <path d="M9.6 13.6h12.8" stroke="url(#${id})" stroke-width="1.2" opacity=".55"/>
    <circle cx="12.2" cy="13.6" r="1.7" fill="#67e8f9"/>
    <circle cx="19.8" cy="13.6" r="1.7" fill="#a5b4fc"/>
    <path d="M12.8 20.6h6.4" stroke="url(#${id})" stroke-width="1.7" stroke-linecap="round"/>
  </svg>`;
}
