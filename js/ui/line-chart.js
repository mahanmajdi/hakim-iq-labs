/**
 * Minimal, accessible SVG line chart for score history.
 * Single series → one hue, 2px line, ~10% area wash, solid hairline grid,
 * end-value label, crosshair + tooltip on hover AND keyboard (← →).
 * The page always renders a table twin, so the tooltip never gates a value.
 */
import { formatDate } from '../core/utils.js';

const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
};

/**
 * @param {HTMLElement} host
 * @param {{ label: string, points: Array<{ date: string, value: number }>, band?: [number, number], bandLabel?: string }} data
 */
export function renderLineChart(host, data) {
  host.classList.add('chart');
  const draw = () => {
    host.replaceChildren();
    const { points } = data;
    if (!points.length) return;
    const W = Math.max(280, host.clientWidth);
    const H = W < 520 ? 220 : 260;
    const m = { l: 34, r: 52, t: 16, b: 30 };
    const iw = W - m.l - m.r;
    const ih = H - m.t - m.b;

    const vals = points.map((p) => p.value);
    const lo = Math.max(0, Math.floor(Math.min(...vals, data.band?.[0] ?? 10) - 1));
    const hi = 10;
    const times = points.map((p) => new Date(p.date).getTime());
    const t0 = Math.min(...times);
    const t1 = Math.max(...times);
    const x = (i) => m.l + (points.length === 1 ? iw / 2 : ((times[i] - t0) / (t1 - t0 || 1)) * iw);
    const y = (v) => m.t + ih - ((v - lo) / (hi - lo)) * ih;

    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `${data.label} over time. Latest ${vals.at(-1).toFixed(1)} out of 10.`, tabindex: '0' });

    // Reference band (e.g. the ideal scoring range)
    if (data.band) {
      const [b0, b1] = data.band;
      svg.append(el('rect', { class: 'chart__band', x: m.l, y: y(Math.min(b1, hi)), width: iw, height: y(Math.max(b0, lo)) - y(Math.min(b1, hi)) }));
      const t = el('text', { class: 'chart__band-label', x: m.l + 8, y: y(Math.min(b1, hi)) + 14 });
      t.textContent = data.bandLabel || 'Ideal range';
      svg.append(t);
    }

    // Grid + y ticks
    const grid = el('g', { class: 'chart__grid' });
    const axis = el('g', { class: 'chart__axis' });
    const step = hi - lo > 6 ? 2 : 1;
    for (let v = lo; v <= hi; v += step) {
      grid.append(el('line', { x1: m.l, x2: m.l + iw, y1: y(v), y2: y(v) }));
      const t = el('text', { x: m.l - 10, y: y(v) + 4, 'text-anchor': 'end' });
      t.textContent = v;
      axis.append(t);
    }
    // x labels: first, middle, last (deduplicated)
    const idx = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])];
    for (const i of idx) {
      const t = el('text', { x: x(i), y: H - 8, 'text-anchor': points.length === 1 ? 'middle' : i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle' });
      t.textContent = formatDate(points[i].date, { month: 'short', day: 'numeric' });
      axis.append(t);
    }
    svg.append(grid, axis);

    // Area + line
    const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join('');
    if (points.length > 1) {
      svg.append(el('path', { class: 'chart__area', d: `${d}L${x(points.length - 1)} ${m.t + ih}L${x(0)} ${m.t + ih}Z` }));
      svg.append(el('path', { class: 'chart__line', d }));
    }
    const showAll = points.length <= 14;
    points.forEach((p, i) => {
      if (showAll || i === points.length - 1) svg.append(el('circle', { class: 'chart__dot', cx: x(i), cy: y(p.value), r: 4.5 }));
    });
    const end = el('text', { class: 'chart__end-label', x: x(points.length - 1) + 10, y: y(vals.at(-1)) + 4 });
    end.textContent = vals.at(-1).toFixed(1);
    svg.append(end);

    // Crosshair + tooltip
    const cross = el('line', { class: 'chart__cross', y1: m.t, y2: m.t + ih, visibility: 'hidden' });
    const hit = el('rect', { class: 'chart__hit', x: m.l - 10, y: 0, width: iw + 20, height: H });
    svg.append(cross, hit);
    host.append(svg);

    const tip = document.createElement('div');
    tip.className = 'chart-tip';
    tip.hidden = true;
    host.append(tip);

    let active = -1;
    const show = (i) => {
      active = i;
      const p = points[i];
      cross.setAttribute('x1', x(i));
      cross.setAttribute('x2', x(i));
      cross.setAttribute('visibility', 'visible');
      tip.replaceChildren();
      const val = document.createElement('div');
      val.className = 'chart-tip__val';
      val.append(document.createElement('i'), document.createTextNode(`${p.value.toFixed(1)} / 10`));
      const date = document.createElement('div');
      date.className = 'chart-tip__date';
      date.textContent = `${data.label} · ${formatDate(p.date, { month: 'short', day: 'numeric', year: 'numeric' })}`;
      tip.append(val, date);
      tip.hidden = false;
      const scale = host.clientWidth / W;
      tip.style.left = `${Math.min(Math.max(x(i) * scale, 80), host.clientWidth - 80)}px`;
      tip.style.top = `${y(p.value) * scale}px`;
    };
    const hide = () => {
      active = -1;
      cross.setAttribute('visibility', 'hidden');
      tip.hidden = true;
    };
    const nearest = (clientX) => {
      const r = svg.getBoundingClientRect();
      const px = ((clientX - r.left) / r.width) * W;
      let best = 0;
      points.forEach((_, i) => {
        if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
      });
      return best;
    };
    hit.addEventListener('pointermove', (e) => show(nearest(e.clientX)));
    hit.addEventListener('pointerleave', hide);
    svg.addEventListener('focus', () => show(points.length - 1));
    svg.addEventListener('blur', hide);
    svg.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') show(Math.max(0, (active < 0 ? points.length : active) - 1));
      else if (e.key === 'ArrowRight') show(Math.min(points.length - 1, active + 1));
      else return;
      e.preventDefault();
    });
  };
  let lastW = host.clientWidth;
  draw();
  const ro = new ResizeObserver(() => {
    if (host.clientWidth === lastW) return; // only width changes need a redraw
    lastW = host.clientWidth;
    draw();
  });
  ro.observe(host);
  return { destroy: () => ro.disconnect() };
}
