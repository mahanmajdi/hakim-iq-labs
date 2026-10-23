/**
 * Photo-quality checks: head pose, lighting, evenness, sharpness, face size
 * and expression. Used both for live webcam guides and the final report —
 * because photo quality genuinely changes the measurements.
 */

const STATUS_PENALTY = { good: 0, warn: 12, bad: 28 };

/** Grayscale luminance samples of the face's bounding box (downscaled). */
function sampleFace(source, pixels, srcW, srcH) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of pixels) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  minX = Math.max(0, minX);
  minY = Math.max(0, minY);
  maxX = Math.min(srcW, maxX);
  maxY = Math.min(srcH, maxY);
  const bw = maxX - minX;
  const bh = maxY - minY;
  const W = 160;
  const H = Math.max(1, Math.round((W * bh) / Math.max(bw, 1)));
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source, minX, minY, bw, bh, 0, 0, W, H);
  const { data } = ctx.getImageData(0, 0, W, H);
  const gray = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) gray[i] = 0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2];
  return { gray, W, H, faceWidthPx: bw };
}

function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  return Object.assign(document.createElement('canvas'), { width: w, height: h });
}

function lightingStats({ gray, W, H }) {
  // central ellipse only (skip background corners)
  let sum = 0, n = 0, left = 0, nl = 0, right = 0, nr = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = (x - W / 2) / (W / 2);
      const dy = (y - H / 2) / (H / 2);
      if (dx * dx + dy * dy > 0.8) continue;
      const v = gray[y * W + x];
      sum += v;
      n++;
      if (dx < -0.15) { left += v; nl++; }
      else if (dx > 0.15) { right += v; nr++; }
    }
  }
  const brightness = sum / Math.max(n, 1);
  const l = left / Math.max(nl, 1);
  const r = right / Math.max(nr, 1);
  const unevenness = Math.abs(l - r) / Math.max(brightness, 1);
  return { brightness, unevenness };
}

/** Variance of the Laplacian — a standard focus/blur measure. */
function sharpness({ gray, W, H }) {
  let sum = 0, sumSq = 0, n = 0;
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      const lap = gray[i - W] + gray[i + W] + gray[i - 1] + gray[i + 1] - 4 * gray[i];
      sum += lap;
      sumSq += lap * lap;
      n++;
    }
  }
  const m = sum / n;
  return sumSq / n - m * m;
}

/**
 * @param {object} args
 * @param {CanvasImageSource} args.source   image/canvas/video frame
 * @param {number[][]} args.pixels          landmark pixel coords
 * @param {number} args.width, args.height  source dimensions
 * @param {{yaw:number,pitch:number,roll:number}} args.pose
 * @param {Record<string, number>} args.blendshapes
 * @param {boolean} [args.live]             lighter checks for webcam frames
 */
export function assessQuality({ source, pixels, width, height, pose, blendshapes = {}, faceCount = 1, live = false }) {
  const checks = [];
  const add = (key, label, status, tip) => checks.push({ key, label, status, tip });

  // Pose
  const turn = Math.abs(pose.yaw);
  const nod = Math.abs(pose.pitch);
  const tilt = Math.abs(pose.roll);
  const poseStatus = turn > 15 || nod > 20 ? 'bad' : turn > 7 || nod > 11 || tilt > 12 ? 'warn' : 'good';
  add(
    'angle',
    'Straight-on angle',
    poseStatus,
    poseStatus === 'good'
      ? `Head is square to the camera (turn ${turn.toFixed(0)}°, nod ${nod.toFixed(0)}°).`
      : turn >= nod
        ? `Your head is turned about ${turn.toFixed(0)}°. Face the lens directly.`
        : `Your head is tilted ${pose.pitch > 0 ? 'down' : 'up'} about ${nod.toFixed(0)}°. Keep your chin level with the lens.`,
  );

  // Lighting & evenness & sharpness (pixel sampling)
  const sample = sampleFace(source, pixels, width, height);
  const { brightness, unevenness } = lightingStats(sample);
  const lightStatus = brightness < 55 || brightness > 225 ? 'bad' : brightness < 85 || brightness > 205 ? 'warn' : 'good';
  add(
    'light',
    'Lighting',
    lightStatus,
    lightStatus === 'good'
      ? 'Exposure looks good.'
      : brightness < 85
        ? 'Your face is underexposed — face a window or a soft light source.'
        : 'Your face is overexposed — step back from direct light.',
  );
  const evenStatus = unevenness > 0.35 ? 'bad' : unevenness > 0.18 ? 'warn' : 'good';
  add(
    'even',
    'Even light',
    evenStatus,
    evenStatus === 'good' ? 'Light falls evenly on both sides.' : 'One side of your face is in shadow — turn toward the light so it hits you from the front.',
  );

  if (!live) {
    const sharp = sharpness(sample);
    const sharpStatus = sharp < 18 ? 'bad' : sharp < 45 ? 'warn' : 'good';
    add('sharp', 'Sharpness', sharpStatus, sharpStatus === 'good' ? 'Photo is in focus.' : 'The photo looks soft or blurry — hold still and tap to focus.');
  }

  // Face size
  const faceFrac = sample.faceWidthPx / width;
  const sizeStatus = sample.faceWidthPx < 140 ? 'bad' : sample.faceWidthPx < 240 || faceFrac < 0.18 ? 'warn' : 'good';
  add(
    'size',
    'Face size',
    sizeStatus,
    sizeStatus === 'good' ? 'Your face fills enough of the frame.' : 'Move closer (or use a higher-resolution photo) so your face fills more of the frame.',
  );

  // Expression (MediaPipe blendshapes)
  const smile = Math.max(blendshapes.mouthSmileLeft || 0, blendshapes.mouthSmileRight || 0);
  const open = blendshapes.jawOpen || 0;
  const blink = Math.max(blendshapes.eyeBlinkLeft || 0, blendshapes.eyeBlinkRight || 0);
  const brows = blendshapes.browInnerUp || 0;
  let exprStatus = 'good';
  let exprTip = 'Relaxed, neutral expression.';
  if (blink > 0.55) {
    exprStatus = 'bad';
    exprTip = 'Your eyes look closed — keep them open and relaxed.';
  } else if (smile > 0.45 || open > 0.22) {
    exprStatus = smile > 0.7 || open > 0.4 ? 'bad' : 'warn';
    exprTip = 'Relax your mouth into a neutral expression — smiling changes lip and jaw measurements.';
  } else if (brows > 0.5) {
    exprStatus = 'warn';
    exprTip = 'Relax your brows — raised brows change eye-area measurements.';
  }
  add('expression', 'Neutral expression', exprStatus, exprTip);

  if (faceCount > 1) add('faces', 'One face', 'warn', 'More than one face found — we analysed the largest one.');

  const score = Math.max(0, 100 - checks.reduce((s, c) => s + STATUS_PENALTY[c.status], 0));
  return { score, checks, brightness: Math.round(brightness), ok: checks.every((c) => c.status !== 'bad') };
}
