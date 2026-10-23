/**
 * Landmark overlay renderer: photo + triangulated mesh + landmark points +
 * contours + per-measurement guide lines, with a scanning-laser reveal.
 * Everything is drawn locally on a <canvas>.
 */
import { CONTOURS, LM, ALAR_PAIRS } from './landmarks.js';

/* ---------- Delaunay triangulation (Bowyer–Watson) for the mesh look ---------- */
function circum(pts, a, b, c) {
  const [ax, ay] = pts[a];
  const [bx, by] = pts[b];
  const [cx, cy] = pts[c];
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(d) < 1e-9) return null;
  const a2 = ax * ax + ay * ay;
  const b2 = bx * bx + by * by;
  const c2 = cx * cx + cy * cy;
  const ux = (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / d;
  const uy = (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / d;
  return { a, b, c, x: ux, y: uy, r2: (ax - ux) ** 2 + (ay - uy) ** 2 };
}

function delaunayEdges(points, maxLen) {
  const n = points.length;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of points) {
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  const dm = Math.max(maxX - minX, maxY - minY) || 1;
  const mx = (minX + maxX) / 2;
  const my = (minY + maxY) / 2;
  const pts = points.concat([[mx - 20 * dm, my - dm], [mx, my + 20 * dm], [mx + 20 * dm, my - dm]]);
  let tris = [circum(pts, n, n + 1, n + 2)];
  for (let i = 0; i < n; i++) {
    const [px, py] = pts[i];
    const keep = [];
    const edges = new Map();
    for (const t of tris) {
      if ((px - t.x) ** 2 + (py - t.y) ** 2 <= t.r2) {
        for (const [u, v] of [[t.a, t.b], [t.b, t.c], [t.c, t.a]]) {
          const key = u < v ? `${u},${v}` : `${v},${u}`;
          edges.set(key, edges.has(key) ? null : [u, v]);
        }
      } else keep.push(t);
    }
    tris = keep;
    for (const e of edges.values()) {
      if (!e) continue;
      const t = circum(pts, e[0], e[1], i);
      if (t) tris.push(t);
    }
  }
  const out = new Map();
  for (const t of tris) {
    if (t.a >= n || t.b >= n || t.c >= n) continue;
    for (const [u, v] of [[t.a, t.b], [t.b, t.c], [t.c, t.a]]) {
      const key = u < v ? `${u},${v}` : `${v},${u}`;
      if (out.has(key)) continue;
      const len = Math.hypot(points[u][0] - points[v][0], points[u][1] - points[v][1]);
      if (len <= maxLen) out.set(key, [u, v]);
    }
  }
  return [...out.values()];
}

/* ---------- Guide geometry (image pixel space) ---------- */
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const addv = (a, b, s = 1) => [a[0] + b[0] * s, a[1] + b[1] * s];

function buildGuides(P) {
  const ex = [P[LM.lEyeOuter][0] - P[LM.rEyeOuter][0], P[LM.lEyeOuter][1] - P[LM.rEyeOuter][1]];
  const el = Math.hypot(...ex) || 1;
  const u = [ex[0] / el, ex[1] / el]; // left–right in the image
  const v = [-u[1], u[0]]; // pointing down the face
  const faceW = Math.hypot(P[LM.lCheek][0] - P[LM.rCheek][0], P[LM.lCheek][1] - P[LM.rCheek][1]);
  const half = faceW * 0.56;
  const across = (pt) => [addv(pt, u, -half), addv(pt, u, half)];
  const brow = mid(P[LM.glabella], mid(P[LM.rBrowInner], P[LM.lBrowInner]));
  const eyeW = Math.hypot(P[LM.rEyeOuter][0] - P[LM.rEyeInner][0], P[LM.rEyeOuter][1] - P[LM.rEyeInner][1]);
  const lift = (pt) => addv(pt, v, -eyeW * 0.55);

  const avgPt = (idx) => [idx.reduce((s, i) => s + P[i][0], 0) / idx.length, idx.reduce((s, i) => s + P[i][1], 0) / idx.length];
  const alarR = avgPt(ALAR_PAIRS.map(([r]) => r));
  const alarL = avgPt(ALAR_PAIRS.map(([, l]) => l));
  const extend = (a, b, k) => [b, addv(b, [b[0] - a[0], b[1] - a[1]], k)];

  return {
    symmetry: [
      { pts: [addv(P[LM.foreheadTop], v, -faceW * 0.12), addv(P[LM.menton], v, faceW * 0.06)], dash: true },
      { pts: [P[LM.rEyeOuter], P[LM.lEyeOuter]], faint: true },
      { pts: [P[LM.rMouth], P[LM.lMouth]], faint: true },
      { pts: [P[LM.rGonion], P[LM.lGonion]], faint: true },
    ],
    thirds: [
      { pts: across(brow), dash: true, label: 'Brow line' },
      { pts: across(P[LM.subnasale]), dash: true, label: 'Nose base' },
      { pts: across(P[LM.menton]), dash: true, label: 'Chin' },
    ],
    jaw: [
      { pts: [P[LM.rGonion], P[LM.menton], P[LM.lGonion]], ticks: true },
      { pts: [P[LM.rCheek], P[LM.rGonion]], faint: true, dash: true },
      { pts: [P[LM.lCheek], P[LM.lGonion]], faint: true, dash: true },
    ],
    canthal: [
      { pts: [P[LM.rEyeInner], ...extend(P[LM.rEyeInner], P[LM.rEyeOuter], 0.45).slice(1)] },
      { pts: [P[LM.lEyeInner], ...extend(P[LM.lEyeInner], P[LM.lEyeOuter], 0.45).slice(1)] },
      { pts: [addv(P[LM.rEyeOuter], u, -eyeW * 0.5), addv(P[LM.lEyeOuter], u, eyeW * 0.5)], faint: true, dash: true },
    ],
    eyeSpacing: [
      { pts: [lift(P[LM.rEyeOuter]), lift(P[LM.rCanthus])], ticks: true },
      { pts: [lift(P[LM.rCanthus]), lift(P[LM.lCanthus])], ticks: true, hot: true },
      { pts: [lift(P[LM.lCanthus]), lift(P[LM.lEyeOuter])], ticks: true },
    ],
    noseMouth: [
      { pts: [alarR, alarL], ticks: true },
      { pts: [P[LM.rMouth], P[LM.lMouth]], ticks: true, hot: true },
    ],
    lips: [
      { pts: [P[LM.upperLipTop], P[LM.upperLipBottom]], ticks: true },
      { pts: [P[LM.lowerLipTop], P[LM.lowerLipBottom]], ticks: true, hot: true },
    ],
    fwhr: [
      { pts: [P[LM.rCheek], P[LM.lCheek]], ticks: true, hot: true },
      { pts: [brow, P[LM.upperLipTop]], ticks: true },
    ],
  };
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ image: CanvasImageSource, width: number, height: number, pixels: number[][] }} src
 */
export function createOverlay(canvas, { image, width, height, pixels }) {
  const ctx = canvas.getContext('2d');
  const pts2 = pixels.map((p) => [p[0], p[1]]);
  const faceW = Math.hypot(pts2[LM.lCheek][0] - pts2[LM.rCheek][0], pts2[LM.lCheek][1] - pts2[LM.rCheek][1]);
  const meshEdges = delaunayEdges(pts2.slice(0, 468), faceW * 0.16);
  const guides = buildGuides(pts2);

  // Crop around the face (with headroom), matched to the canvas aspect.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of pts2) {
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  const fw = maxX - minX;
  const fh = maxY - minY;
  const crop = { x: minX - fw * 0.42, y: minY - fh * 0.42, w: fw * 1.84, h: fh * 1.66 };

  const state = { progress: 1, layers: { photo: true, mesh: true, points: true, guides: true }, highlight: null };
  let view = { s: 1, ox: 0, oy: 0, cw: 0, ch: 0 };

  function layout() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    // fit crop into canvas (cover), centred on the crop
    const s = Math.max(cw / crop.w, ch / crop.h);
    const cx = crop.x + crop.w / 2;
    const cy = crop.y + crop.h / 2;
    view = { s: s * dpr, ox: cw / 2 - cx * s, oy: ch / 2 - cy * s, dpr, cw, ch };
  }

  function draw() {
    const { s, ox, oy, dpr, cw, ch } = view;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#07080c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(s, 0, 0, s, ox * dpr, oy * dpr);
    const px = 1 / s; // one device pixel in image units × dpr

    const revealY = crop.y - 10 + (crop.h + 20) * state.progress;
    const visible = (p) => p[1] <= revealY;

    if (state.layers.photo) {
      ctx.globalAlpha = 1;
      ctx.drawImage(image, 0, 0, width, height);
      // gentle darkening so the overlay reads
      ctx.fillStyle = 'rgba(5,6,10,0.28)';
      ctx.fillRect(crop.x - width, crop.y - height, crop.w + 2 * width, crop.h + 2 * height);
    }

    const dim = state.highlight ? 0.35 : 1;

    if (state.layers.mesh) {
      ctx.lineWidth = 0.8 * dpr * px;
      ctx.strokeStyle = `rgba(129,140,248,${0.28 * dim})`;
      ctx.beginPath();
      for (const [a, b] of meshEdges) {
        if (!visible(pts2[a]) || !visible(pts2[b])) continue;
        ctx.moveTo(...pts2[a]);
        ctx.lineTo(...pts2[b]);
      }
      ctx.stroke();

      ctx.lineWidth = 1.4 * dpr * px;
      ctx.strokeStyle = `rgba(103,232,249,${0.55 * dim})`;
      for (const key of ['faceOval', 'rightEye', 'leftEye', 'rightBrow', 'leftBrow', 'lipsOuter', 'lipsInner']) {
        ctx.beginPath();
        let started = false;
        for (const i of CONTOURS[key]) {
          if (!visible(pts2[i])) { started = false; continue; }
          started ? ctx.lineTo(...pts2[i]) : ctx.moveTo(...pts2[i]);
          started = true;
        }
        ctx.stroke();
      }
    }

    if (state.layers.points) {
      const r = 1.5 * dpr * px;
      ctx.fillStyle = `rgba(207,250,254,${0.85 * dim})`;
      ctx.beginPath();
      for (let i = 0; i < pts2.length; i++) {
        const p = pts2[i];
        if (!visible(p)) continue;
        ctx.moveTo(p[0] + r, p[1]);
        ctx.arc(p[0], p[1], i >= 468 ? r * 1.6 : r, 0, Math.PI * 2);
      }
      ctx.fill();
    }

    if (state.layers.guides && state.progress >= 1) {
      for (const [key, list] of Object.entries(guides)) {
        const active = state.highlight === key;
        if (state.highlight && !active) continue;
        if (!state.highlight && !['thirds', 'canthal', 'jaw', 'noseMouth'].includes(key)) continue;
        for (const g of list) drawGuide(g, active, px * dpr);
      }
    }

    // Scanning laser
    if (state.progress > 0 && state.progress < 1) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const y = (revealY * s) / dpr + oy;
      const yy = y * dpr;
      const grad = ctx.createLinearGradient(0, yy - 60 * dpr, 0, yy + 4 * dpr);
      grad.addColorStop(0, 'rgba(103,232,249,0)');
      grad.addColorStop(1, 'rgba(103,232,249,0.22)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, yy - 60 * dpr, cw * dpr, 64 * dpr);
      ctx.shadowColor = 'rgba(103,232,249,0.95)';
      ctx.shadowBlur = 18 * dpr;
      ctx.fillStyle = '#e0fbff';
      ctx.fillRect(0, yy - 1 * dpr, cw * dpr, 2 * dpr);
      ctx.shadowBlur = 0;
    }
  }

  function drawGuide(g, active, unit) {
    const grad = ctx.createLinearGradient(g.pts[0][0], g.pts[0][1], g.pts.at(-1)[0], g.pts.at(-1)[1]);
    const a = g.faint ? 0.45 : 1;
    grad.addColorStop(0, `rgba(103,232,249,${a})`);
    grad.addColorStop(1, g.hot ? `rgba(232,121,249,${a})` : `rgba(165,180,252,${a})`);
    ctx.strokeStyle = grad;
    ctx.lineWidth = (active ? 2.6 : 1.8) * unit;
    ctx.setLineDash(g.dash ? [6 * unit, 5 * unit] : []);
    ctx.shadowColor = 'rgba(129,140,248,0.8)';
    ctx.shadowBlur = active ? 10 : 4;
    ctx.beginPath();
    g.pts.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p)));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
    if (g.ticks) {
      ctx.fillStyle = '#fff';
      for (const p of [g.pts[0], g.pts.at(-1)]) {
        ctx.beginPath();
        ctx.arc(p[0], p[1], 3 * unit, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  layout();
  draw();
  const ro = new ResizeObserver(() => {
    layout();
    draw();
  });
  ro.observe(canvas);

  return {
    setLayers(patch) {
      Object.assign(state.layers, patch);
      draw();
    },
    setHighlight(key) {
      state.highlight = key;
      draw();
    },
    /** Animate the scanning reveal from top to bottom. */
    reveal(duration = 1800, reduced = false) {
      if (reduced) {
        state.progress = 1;
        draw();
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        const start = performance.now();
        const step = (now) => {
          const t = Math.min(1, (now - start) / duration);
          state.progress = t < 1 ? 0.5 - Math.cos(t * Math.PI) / 2 : 1;
          draw();
          if (t < 1) requestAnimationFrame(step);
          else resolve();
        };
        requestAnimationFrame(step);
      });
    },
    /** Render the current overlay into another canvas (for the share card). */
    snapshot(w, h) {
      const c = Object.assign(document.createElement('canvas'), { width: w, height: h });
      const g = c.getContext('2d');
      g.drawImage(canvas, 0, 0, w, h);
      return c;
    },
    destroy() {
      ro.disconnect();
    },
  };
}
