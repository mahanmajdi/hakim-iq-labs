/**
 * Facial geometry engine.
 *
 * 1. Convert MediaPipe's normalised landmarks to pixel-space 3D points.
 * 2. Build a face-aligned frame (left–right axis, up–down axis, depth axis)
 *    from bilateral landmark pairs, and express every point in it. This
 *    "frontalises" the face: head roll/turn/nod are removed before measuring.
 * 3. Measure proportions as scale-free ratios and angles.
 * 4. Score each against its ideal range (see ideals.js).
 *
 * Only the resulting numbers are ever stored — never the photo or landmarks.
 */
import { LM, MIDLINE, MIRROR_PAIRS, AXIS_PAIRS, ALAR_PAIRS } from './landmarks.js';
import { METRICS, METRIC_KEYS, IDEAL_SCORE, scoreMetric, overallScore } from './ideals.js';

/* ---------- vector helpers ---------- */
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => scale(a, 1 / (Math.hypot(...a) || 1));
const mean = (pts) => scale(pts.reduce(add, [0, 0, 0]), 1 / pts.length);
const DEG = 180 / Math.PI;

/** Angle (degrees) at vertex b formed by points a–b–c, in the frontal (x, y) plane. */
function angleAt2D(a, b, c) {
  const u = norm([a[0] - b[0], a[1] - b[1], 0]);
  const v = norm([c[0] - b[0], c[1] - b[1], 0]);
  return Math.acos(Math.min(1, Math.max(-1, dot(u, v)))) * DEG;
}

/** MediaPipe landmarks → pixel-space [x, y, z] (z uses x's scale, per MediaPipe docs). */
export function toPixels(landmarks, width, height) {
  return landmarks.map((p) => [p.x * width, p.y * height, p.z * width]);
}

/**
 * Face-aligned frame. x → subject's left, y → down (towards chin), z → away from camera.
 * Returns local coordinates for every landmark plus head-pose angles.
 */
export function frontalize(P) {
  let ax = [0, 0, 0];
  for (const [r, l] of AXIS_PAIRS) ax = add(ax, norm(sub(P[l], P[r])));
  ax = norm(ax);

  const top = mean([P[10], P[151], P[9]]);
  const bottom = mean([P[152], P[175], P[199]]);
  let ay = norm(sub(bottom, top));
  const az = norm(cross(ax, ay));
  ay = norm(cross(az, ax));

  const origin = mean([P[LM.rEyeInner], P[LM.lEyeInner]]);
  const local = P.map((p) => {
    const d = sub(p, origin);
    return [dot(d, ax), dot(d, ay), dot(d, az)];
  });

  const pose = {
    yaw: Math.asin(Math.max(-1, Math.min(1, ax[2]))) * DEG,
    pitch: Math.asin(Math.max(-1, Math.min(1, ay[2]))) * DEG,
    roll: Math.atan2(ax[1], ax[0]) * DEG,
  };
  return { local, pose, axes: { ax, ay, az, origin } };
}

/** Least-squares fit of the midline x = a·y + b in the local frame. */
function fitMidline(L) {
  const pts = MIDLINE.map((i) => L[i]);
  const n = pts.length;
  const my = pts.reduce((s, p) => s + p[1], 0) / n;
  const mx = pts.reduce((s, p) => s + p[0], 0) / n;
  let num = 0;
  let den = 0;
  for (const p of pts) {
    num += (p[1] - my) * (p[0] - mx);
    den += (p[1] - my) ** 2;
  }
  const a = den ? num / den : 0;
  return { a, b: mx - a * my };
}

/** Reflect a 2D point across the line x = a·y + b. */
function reflect([x, y], { a, b }) {
  // Line in form x - a·y - b = 0 → normal (1, -a)
  const d = (x - a * y - b) / (1 + a * a);
  return [x - 2 * d, y + 2 * d * a];
}

const d2 = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);

/**
 * Raw measurements from local (frontalised) points.
 * Also returns auxiliary ratios used for face shape and look-alike matching.
 */
export function measure(L) {
  const p = (i) => L[i];
  const faceWidth = d2(p(LM.rCheek), p(LM.lCheek));

  // --- Symmetry
  const mid = fitMidline(L);
  let off = 0;
  for (const [r, l] of MIRROR_PAIRS) off += d2(reflect(p(l), mid), p(r));
  const asym = off / MIRROR_PAIRS.length / faceWidth;
  const symmetry = Math.max(0, Math.min(100, 100 - 2 * asym * 100));

  // --- Vertical landmarks
  const browY = (p(LM.glabella)[1] + (p(LM.rBrowInner)[1] + p(LM.lBrowInner)[1]) / 2) / 2;
  const subnasaleY = p(LM.subnasale)[1];
  const mentonY = p(LM.menton)[1];
  const middle = subnasaleY - browY;
  const lower = mentonY - subnasaleY;
  const thirds = lower / middle;

  // --- Jawline angle: where the left and right jawlines meet at the chin
  // (gonion → menton → gonion). The mesh's jaw-corner angle itself barely
  // varies between people (it is heavily regularised), so this frontal angle
  // is the jaw measurement that actually reflects the individual face.
  const jaw = angleAt2D(p(LM.rGonion), p(LM.menton), p(LM.lGonion));

  // --- Canthal tilt (positive = outer corner higher; y points down)
  const tilt = (inner, outer) => Math.atan2(p(inner)[1] - p(outer)[1], Math.abs(p(outer)[0] - p(inner)[0])) * DEG;
  const canthalR = tilt(LM.rEyeInner, LM.rEyeOuter);
  const canthalL = tilt(LM.lEyeInner, LM.lEyeOuter);
  const canthal = (canthalR + canthalL) / 2;

  // --- Eye spacing (rule of fifths): canthus-to-canthus vs. one eye width
  const eyeWR = d2(p(LM.rEyeOuter), p(LM.rCanthus));
  const eyeWL = d2(p(LM.lEyeOuter), p(LM.lCanthus));
  const eyeW = (eyeWR + eyeWL) / 2;
  const intercanthal = d2(p(LM.rCanthus), p(LM.lCanthus));
  const eyeSpacing = intercanthal / eyeW;

  // --- Nose : mouth
  const noseWidth = ALAR_PAIRS.reduce((s, [r, l]) => s + d2(p(r), p(l)), 0) / ALAR_PAIRS.length;
  const mouthWidth = d2(p(LM.rMouth), p(LM.lMouth));
  const noseMouth = mouthWidth / noseWidth;

  // --- Lips (lower ÷ upper height)
  const upperLip = p(LM.upperLipBottom)[1] - p(LM.upperLipTop)[1];
  const lowerLip = p(LM.lowerLipBottom)[1] - p(LM.lowerLipTop)[1];
  const lips = lowerLip / Math.max(upperLip, 1e-6);

  // --- FWHR
  const upperFace = p(LM.upperLipTop)[1] - browY;
  const fwhr = faceWidth / upperFace;

  // --- Face-shape ratios
  const faceLength = mentonY - p(LM.foreheadTop)[1];
  const jawWidth = d2(p(LM.rGonion), p(LM.lGonion));
  const foreheadWidth = d2(p(LM.rTemple), p(LM.lTemple));
  const chinWidth = d2(p(148), p(377));

  return {
    values: { symmetry, thirds, jaw, canthal, eyeSpacing, noseMouth, lips, fwhr },
    detail: {
      canthalR,
      canthalL,
      asym,
      faceWidth,
      faceLength,
      jawWidth,
      foreheadWidth,
      chinWidth,
      middle,
      lower,
    },
    ratios: {
      lw: faceLength / faceWidth,
      jawRatio: jawWidth / faceWidth,
      foreheadRatio: foreheadWidth / faceWidth,
      chinRatio: chinWidth / jawWidth,
      eyeW: eyeW / faceWidth,
      noseW: noseWidth / faceWidth,
      mouthW: mouthWidth / faceWidth,
      midFace: middle / faceWidth,
    },
  };
}

/**
 * Face shape. MediaPipe's mesh stops below the hairline (landmark 10), so raw
 * ratios differ from tape-measure definitions. Each ratio is therefore
 * expressed as a z-score against reference statistics measured with this
 * engine on 54 public faces, and compared with shape prototypes defined in
 * those z-units (e.g. "square" = shorter face, wide jaw, broad chin angle).
 */
const SHAPE_REF = {
  lw: { m: 1.183, sd: 0.051 }, // face length / cheek width
  jaw: { m: 0.805, sd: 0.023 }, // jaw width / cheek width
  fh: { m: 0.846, sd: 0.026 }, // forehead width / cheek width
  chin: { m: 123.8, sd: 3.7 }, // jawline angle at the chin (°)
};
const SHAPE_PROTOTYPES = {
  oval: { lw: 0.6, jaw: -0.4, fh: 0.2, chin: -0.3 },
  round: { lw: -1.0, jaw: 0.2, fh: 0, chin: 0.6 },
  square: { lw: -0.6, jaw: 1.2, fh: 0.6, chin: 1.0 },
  oblong: { lw: 1.5, jaw: 0, fh: 0, chin: 0 },
  heart: { lw: 0, jaw: -1.1, fh: 1.0, chin: -1.0 },
  diamond: { lw: 0.3, jaw: -0.8, fh: -1.2, chin: -0.5 },
};

export function classifyShape(ratios, jawAngle) {
  const z = {
    lw: (ratios.lw - SHAPE_REF.lw.m) / SHAPE_REF.lw.sd,
    jaw: (ratios.jawRatio - SHAPE_REF.jaw.m) / SHAPE_REF.jaw.sd,
    fh: (ratios.foreheadRatio - SHAPE_REF.fh.m) / SHAPE_REF.fh.sd,
    chin: (jawAngle - SHAPE_REF.chin.m) / SHAPE_REF.chin.sd,
  };
  const scores = Object.entries(SHAPE_PROTOTYPES).map(([key, proto]) => {
    const d = (z.lw - proto.lw) ** 2 + (z.jaw - proto.jaw) ** 2 + (z.fh - proto.fh) ** 2 + 0.6 * (z.chin - proto.chin) ** 2;
    return { key, d };
  });
  scores.sort((a, b) => a.d - b.d);
  const weights = scores.map((s) => Math.exp(-0.5 * s.d));
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  return {
    key: scores[0].key,
    runnerUp: scores[1].key,
    confidence: weights[0] / total,
  };
}

/**
 * Full pipeline for one detected face.
 * @param {Array<{x:number,y:number,z:number}>} landmarks  MediaPipe normalised landmarks
 * @param {number} width   source image width (px)
 * @param {number} height  source image height (px)
 */
export function analyzeLandmarks(landmarks, width, height) {
  const P = toPixels(landmarks, width, height);
  const { local, pose } = frontalize(P);
  const m = measure(local);

  const scores = {};
  for (const key of METRIC_KEYS) scores[key] = round(scoreMetric(key, m.values[key]), 1);
  const overall = round(overallScore(scores), 1);
  const shape = classifyShape(m.ratios, m.values.jaw);

  return {
    overall,
    scores,
    values: Object.fromEntries(Object.entries(m.values).map(([k, v]) => [k, round(v, 3)])),
    ratios: Object.fromEntries(Object.entries(m.ratios).map(([k, v]) => [k, round(v, 4)])),
    detail: m.detail,
    shape,
    pose,
    pixels: P,
  };
}

const round = (v, d) => Math.round(v * 10 ** d) / 10 ** d;

/** Strengths first, then areas to improve (lowest scores), each with copy. */
export function rankFeatures(scores) {
  const list = METRIC_KEYS.map((key) => ({ key, score: scores[key], def: METRICS[key] })).sort((a, b) => b.score - a.score);
  let strengths = list.filter((f) => f.score >= 7.5);
  if (strengths.length < 2) strengths = list.slice(0, 2); // everyone has relative strengths
  const strengthKeys = new Set(strengths.map((s) => s.key));
  const improve = list
    .filter((f) => !strengthKeys.has(f.key) && f.score < IDEAL_SCORE)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);
  return { strengths: strengths.slice(0, 4), improve, all: list };
}
