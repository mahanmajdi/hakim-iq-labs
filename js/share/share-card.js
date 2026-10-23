/**
 * Shareable results card (1080 × 1350 PNG), drawn locally on a canvas.
 * The user's photo is only included if they opt in.
 */
import { METRICS, METRIC_KEYS, FACE_SHAPES, tierLabel } from '../analysis/ideals.js';
import { rankFeatures } from '../analysis/metrics.js';

const W = 1080;
const H = 1350;
const DISPLAY = '"Inter Tight", "Inter", system-ui, sans-serif';
const BODY = '"Inter", system-ui, sans-serif';

function brandGradient(g, x0, y0, x1, y1) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  gr.addColorStop(0, '#67e8f9');
  gr.addColorStop(0.5, '#818cf8');
  gr.addColorStop(1, '#e879f9');
  return gr;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function drawLogo(g, x, y, size) {
  g.save();
  g.translate(x, y);
  g.scale(size / 32, size / 32);
  const grad = brandGradient(g, 4, 3, 28, 29);
  g.strokeStyle = grad;
  g.lineWidth = 1.7;
  g.stroke(new Path2D('M16 3.2c6 0 9.8 4.5 9.8 10.3 0 6.8-4.5 13.2-9.8 15.3-5.3-2.1-9.8-8.5-9.8-15.3C6.2 7.7 10 3.2 16 3.2z'));
  g.globalAlpha = 0.55;
  g.lineWidth = 1.2;
  g.stroke(new Path2D('M9.6 13.6h12.8'));
  g.globalAlpha = 1;
  g.fillStyle = '#67e8f9';
  g.beginPath();
  g.arc(12.2, 13.6, 1.7, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#a5b4fc';
  g.beginPath();
  g.arc(19.8, 13.6, 1.7, 0, Math.PI * 2);
  g.fill();
  g.lineCap = 'round';
  g.lineWidth = 1.7;
  g.stroke(new Path2D('M12.8 20.6h6.4'));
  g.restore();
}

function glow(g, x, y, r, color) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, color);
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
}

/**
 * @param {object} args
 * @param {object} args.analysis      { overall, scores, values, shape }
 * @param {{name:string, similarity:number}|null} [args.lookalike]
 * @param {HTMLCanvasElement|null} [args.photo]  overlay snapshot (opt-in)
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function renderShareCard({ analysis, lookalike = null, photo = null, date = new Date() }) {
  try {
    await Promise.all([document.fonts.load(`700 120px ${DISPLAY}`), document.fonts.load(`500 28px ${BODY}`)]);
  } catch {
    /* fall back to system fonts */
  }

  const c = Object.assign(document.createElement('canvas'), { width: W, height: H });
  const g = c.getContext('2d');

  // Background
  g.fillStyle = '#06060a';
  g.fillRect(0, 0, W, H);
  glow(g, 920, 140, 720, 'rgba(129,140,248,0.32)');
  glow(g, 80, 1240, 720, 'rgba(103,232,249,0.16)');
  glow(g, 1040, 1320, 520, 'rgba(232,121,249,0.14)');

  // Header
  drawLogo(g, 80, 74, 60);
  g.fillStyle = '#f5f5f7';
  g.font = `600 34px ${DISPLAY}`;
  g.textBaseline = 'middle';
  g.fillText('Hakim IQ Labs', 156, 104);
  g.fillStyle = '#8b8d9b';
  g.font = `500 26px ${BODY}`;
  g.textAlign = 'right';
  g.fillText(new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date), W - 80, 104);
  g.textAlign = 'left';

  // Photo (optional) + score ring
  let ring;
  if (photo) {
    const px = 80;
    const py = 190;
    const pw = 440;
    const ph = 550;
    g.save();
    roundRect(g, px, py, pw, ph, 36);
    g.clip();
    const s = Math.max(pw / photo.width, ph / photo.height);
    g.drawImage(photo, px + (pw - photo.width * s) / 2, py + (ph - photo.height * s) / 2, photo.width * s, photo.height * s);
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,0.14)';
    g.lineWidth = 2;
    roundRect(g, px, py, pw, ph, 36);
    g.stroke();
    ring = { x: 790, y: 440, r: 168, size: 132, track: 22 };
  } else {
    ring = { x: W / 2, y: 470, r: 230, size: 176, track: 26 };
  }

  g.lineCap = 'round';
  g.lineWidth = ring.track;
  g.strokeStyle = 'rgba(255,255,255,0.08)';
  g.beginPath();
  g.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = brandGradient(g, ring.x - ring.r, ring.y - ring.r, ring.x + ring.r, ring.y + ring.r);
  g.beginPath();
  g.arc(ring.x, ring.y, ring.r, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * analysis.overall) / 10);
  g.stroke();

  g.textAlign = 'center';
  g.fillStyle = '#ffffff';
  g.font = `700 ${ring.size}px ${DISPLAY}`;
  g.fillText(analysis.overall.toFixed(1), ring.x, ring.y - 6);
  g.fillStyle = '#8b8d9b';
  g.font = `500 28px ${BODY}`;
  g.fillText('out of 10', ring.x, ring.y + ring.size * 0.5);

  const labelY = ring.y + ring.r + 70;
  g.fillStyle = '#f5f5f7';
  g.font = `700 40px ${DISPLAY}`;
  g.fillText(tierLabel(analysis.overall), ring.x, labelY);
  const shapeName = FACE_SHAPES[analysis.shape?.key || analysis.face_shape]?.name;
  if (shapeName) {
    g.fillStyle = '#a9abb8';
    g.font = `500 26px ${BODY}`;
    g.fillText(`${shapeName} face shape`, ring.x, labelY + 46);
  }
  g.textAlign = 'left';

  // Strengths line
  const { strengths } = rankFeatures(analysis.scores);
  const sy = 830;
  g.fillStyle = '#67e8f9';
  g.font = `500 22px "JetBrains Mono", monospace`;
  g.fillText('STRENGTHS', 80, sy);
  g.fillStyle = '#f5f5f7';
  g.font = `600 30px ${BODY}`;
  g.fillText(strengths.slice(0, 3).map((s) => s.def.short).join('  ·  '), 80, sy + 44);

  // Feature bars — single series, one hue; value at the tip.
  const colW = (W - 160 - 60) / 2;
  METRIC_KEYS.forEach((key, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 80 + col * (colW + 60);
    const y = 930 + row * 66;
    const score = analysis.scores[key];
    g.fillStyle = '#c9cad3';
    g.font = `500 24px ${BODY}`;
    g.fillText(METRICS[key].short, x, y);
    g.textAlign = 'right';
    g.fillStyle = '#ffffff';
    g.font = `600 24px ${BODY}`;
    g.fillText(score.toFixed(1), x + colW, y);
    g.textAlign = 'left';
    g.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(g, x, y + 20, colW, 8, 4);
    g.fill();
    g.fillStyle = '#818cf8';
    roundRect(g, x, y + 20, Math.max(8, (colW * score) / 10), 8, 4);
    g.fill();
  });

  if (lookalike) {
    g.fillStyle = '#c9cad3';
    g.font = `500 24px ${BODY}`;
    g.fillText(`Look-alike (for fun, by proportions): ${lookalike.name} · ${lookalike.similarity}%`, 80, 1212);
  }

  // Footer
  g.strokeStyle = 'rgba(255,255,255,0.1)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(80, 1250);
  g.lineTo(W - 80, 1250);
  g.stroke();
  g.fillStyle = '#8b8d9b';
  g.font = `500 22px ${BODY}`;
  g.fillText('Proportions, not worth.', 80, 1292);
  g.textAlign = 'right';
  g.fillText('Analysed on-device · photo never uploaded', W - 80, 1292);
  g.textAlign = 'left';

  return c;
}
