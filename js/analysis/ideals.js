/**
 * Measurement definitions: commonly cited ideal ranges, how each value is
 * computed, scoring, and the (respectful) copy shown in results.
 *
 * Scoring: inside the ideal range = 8.5–10. Outside, the score eases down
 * with distance (measured in "tolerance" units) and never drops below 3 —
 * a proportion is a description, not a verdict.
 */

const signedDeg = (v) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}°`;

export const METRICS = {
  symmetry: {
    name: 'Facial symmetry',
    short: 'Symmetry',
    ideal: [95, 100],
    higherIsBetter: true,
    tol: 5,
    domain: [80, 100],
    weight: 1.4,
    format: (v) => `${v.toFixed(1)}%`,
    idealLabel: '95 – 100%',
    what: 'How closely your left and right sides mirror each other across the facial midline, using 41 paired landmarks on the eyes, brows, nose, lips, cheeks and jaw contour.',
    how: 'Each left-side landmark is reflected across the fitted midline and compared with its right-side partner (after correcting head tilt and turn). Symmetry = 100 − 2 × the average offset, as a % of face width.',
    reference: 'High — not perfect — symmetry is one of the most consistently reported correlates of perceived attractiveness. Every real face has small asymmetries.',
    strength: 'Your left and right sides are closely balanced — the kind of harmony people register at a glance.',
    improve: {
      low: 'Small left–right differences are completely normal. Even grooming lines, a consistent sleep position and a straight-on photo all reduce how much they show.',
    },
    changeable: 'A little — puffiness, grooming and head position all affect this reading.',
    levers: ['symmetry', 'sleep', 'posture', 'photo'],
  },

  thirds: {
    name: 'Facial thirds',
    short: 'Thirds',
    ideal: [0.95, 1.1],
    tol: 0.12,
    domain: [0.75, 1.3],
    weight: 1,
    format: (v) => `1 : ${v.toFixed(2)}`,
    idealLabel: '1 : 0.95 – 1.10',
    what: 'The balance between your middle third (brows → base of the nose) and lower third (base of the nose → chin), shown as middle : lower.',
    how: 'Vertical distances measured in the pose-corrected face frame. The upper third is left out because hairlines vary and are often covered.',
    reference: 'Classical facial canons divide a balanced face into three equal vertical thirds; a lower third equal to or slightly longer than the middle is commonly cited as ideal.',
    strength: 'Your mid-face and lower face are in close balance — a hallmark of classically proportioned faces.',
    improve: {
      low: 'Your lower third is a little shorter than your middle third. A beard kept fuller at the chin, or hairstyles with less height, balance this visually.',
      high: 'Your lower third is a little longer than your middle third. Some volume on top and at the sides of your hair, or facial hair kept short at the chin, balances it visually.',
    },
    changeable: 'Not the measurement itself — hair and facial-hair styling change how it reads.',
    levers: ['hair', 'beard', 'photo'],
  },

  jaw: {
    name: 'Jawline angle',
    short: 'Jawline',
    ideal: [121, 127],
    tol: 4,
    domain: [108, 140],
    weight: 1,
    format: (v) => `${v.toFixed(1)}°`,
    idealLabel: '121° – 127°',
    what: 'The angle at which your left and right jawlines meet at the chin, seen from the front. Lower = a tapered, V-shaped jaw; higher = a broader, squarer lower face.',
    how: 'Angle at the chin (menton) between the lines to each jaw corner (gonion), in the pose-corrected frame.',
    reference: 'There is no clinical standard for this frontal angle (clinical gonial-angle norms need a side profile), so the reference range is the middle 60% of 54 well-known faces measured with this same engine. We say so rather than borrow a number that doesn’t apply.',
    strength: 'Your jawline converges to the chin in a balanced way — clear structure without looking heavy or pointed.',
    improve: {
      high: 'Your lower face reads broad. If you carry extra body fat, gradual fat loss and good neck posture sharpen the jawline; a beard kept shorter on the sides and a little longer at the chin also lengthens the look.',
      low: 'Your jawline tapers steeply to the chin — often read as delicate or elegant. If you want more lower-face presence, facial hair kept fuller along the jaw adds width.',
    },
    changeable: 'Moderately — body fat, posture and facial hair change the soft-tissue jawline (not the bone).',
    levers: ['body', 'posture', 'beard', 'hair'],
  },

  canthal: {
    name: 'Canthal tilt',
    short: 'Canthal tilt',
    ideal: [4, 8],
    tol: 4,
    domain: [-8, 14],
    weight: 1,
    format: signedDeg,
    idealLabel: '+4° to +8°',
    what: 'The tilt of each eye from its inner corner to its outer corner, relative to the line between your eyes.',
    how: 'Angle of the inner→outer eye-corner line for each eye in the pose-corrected frame, averaged. Positive means the outer corner sits higher.',
    reference: 'A slight positive tilt (outer corners a little higher than inner corners) of roughly +4° to +8° is commonly cited as ideal.',
    strength: 'Your eyes have a positive tilt — an alert, lifted look around the eye area.',
    improve: {
      low: 'A neutral or slightly downward tilt is very common. Brow grooming that keeps the tail lifted, good sleep to reduce puffiness, and upswept frames all change how the eye area reads.',
      high: 'Your eyes have a strong upward tilt — distinctive and striking. Balanced, natural brows keep the eye area harmonious.',
    },
    changeable: 'Not the bone structure — grooming, sleep and frames change how it reads.',
    levers: ['brows', 'sleep', 'skin', 'style'],
  },

  eyeSpacing: {
    name: 'Eye spacing',
    short: 'Eye spacing',
    ideal: [0.9, 1.1],
    tol: 0.15,
    domain: [0.6, 1.45],
    weight: 0.9,
    format: (v) => `${v.toFixed(2)}×`,
    idealLabel: '0.90 – 1.10× eye width',
    what: 'The gap between your inner eye corners compared with the width of one eye.',
    how: 'Inner-canthus distance ÷ average eye width (inner → outer corner), in the pose-corrected frame. On real faces these landmarks reproduce the anthropometric norm of eye width ≈ eye gap ≈ ⅕ of face width.',
    reference: 'The classical "rule of fifths": a face is about five eye-widths wide with roughly one eye-width between the eyes.',
    strength: 'Your eye spacing follows the classic one-eye-width rule — a well-balanced centre of the face.',
    improve: {
      low: 'Your eyes are set slightly close. Starting the brows a little wider and keeping the inner-corner area bright (good sleep, hydration) opens up the eye area.',
      high: 'Your eyes are set slightly wide — often read as youthful. Starting the brows a touch closer in, and frames with a defined bridge, balance the spacing.',
    },
    changeable: 'Not the measurement — brows, frames and hairstyle change how it reads.',
    levers: ['brows', 'style', 'hair'],
  },

  noseMouth: {
    name: 'Nose-to-mouth ratio',
    short: 'Nose : mouth',
    ideal: [1.45, 1.65],
    tol: 0.18,
    domain: [1.1, 2.05],
    weight: 0.8,
    format: (v) => `${v.toFixed(2)}`,
    idealLabel: '1.45 – 1.65',
    what: 'The width of your mouth divided by the width of your nose (across the nostril wings).',
    how: 'Mouth-corner distance ÷ alar (nose-wing) width — the mean of two nose-wing landmark pairs — in the pose-corrected frame.',
    reference: 'A mouth about 1.5–1.6× the width of the nose — close to the golden ratio (1.618) — is commonly cited as ideal.',
    strength: 'Your nose and mouth widths are in classic proportion — the centre of your face reads as balanced.',
    improve: {
      low: 'Your mouth is narrow relative to your nose. Lip care keeps the mouth area defined, and a short or no moustache avoids hiding mouth width.',
      high: 'Your mouth is wide relative to your nose — a wide smile is often seen as a strength. Neat facial hair frames it well.',
    },
    changeable: 'Not the measurement — lip care and facial hair change how the area reads.',
    levers: ['lips', 'beard', 'style'],
  },

  lips: {
    name: 'Lip ratio',
    short: 'Lips',
    ideal: [1.4, 1.8],
    tol: 0.35,
    domain: [0.7, 2.7],
    weight: 0.8,
    format: (v) => `1 : ${v.toFixed(2)}`,
    idealLabel: '1 : 1.4 – 1.8',
    what: 'Upper-lip height compared with lower-lip height (upper : lower), measured at the centre of the mouth.',
    how: 'Vertical height of the upper lip (top edge → lip line) vs. the lower lip (lip line → bottom edge). Needs a closed, relaxed mouth.',
    reference: 'Aesthetic guidelines commonly cite an upper-to-lower lip ratio of about 1 : 1.6.',
    strength: 'Your lips are in classic proportion — the lower lip a little fuller than the upper.',
    improve: {
      low: 'Your upper and lower lips are closer in height than the classic 1 : 1.6. Hydration, SPF lip balm and gentle exfoliation keep both lips smooth and well-defined.',
      high: 'Your lower lip is notably fuller than the upper — a common, attractive trait. Lip care keeps the outline defined.',
    },
    changeable: 'Only slightly — hydration and lip care affect definition, not structure.',
    levers: ['lips', 'hydration', 'skin'],
  },

  fwhr: {
    name: 'Width-to-height ratio',
    short: 'FWHR',
    ideal: [1.75, 2.05],
    tol: 0.2,
    domain: [1.35, 2.45],
    weight: 1,
    format: (v) => v.toFixed(2),
    idealLabel: '1.75 – 2.05',
    what: 'Facial width-to-height ratio (FWHR): face width at the cheekbones divided by upper-face height (brow line → upper lip).',
    how: 'Bizygomatic width (face contour at cheek level) ÷ vertical distance from the brow line to the top of the upper lip.',
    reference: 'FWHR values around 1.8–2.0 are commonly cited as balanced in facial-attractiveness research.',
    strength: 'Your face width and mid-face height are in balanced proportion.',
    improve: {
      low: 'Your face reads slightly long for its width. Hairstyles with side volume and a beard kept fuller on the sides add balancing width.',
      high: 'Your face reads wide for its height — often seen as strong. Height in your hairstyle balances it, and lower body fat (if you have some to lose) sharpens the cheekbones.',
    },
    changeable: 'Somewhat — body fat and puffiness affect face width; hair changes how it reads.',
    levers: ['body', 'hair', 'beard'],
  },
};

export const METRIC_KEYS = Object.keys(METRICS);

/** Face shapes are descriptive only — never scored. */
export const FACE_SHAPES = {
  oval: {
    name: 'Oval',
    blurb: 'Longer than wide, with a gently rounded jaw slightly narrower than the forehead. Very versatile with hairstyles and frames.',
  },
  round: {
    name: 'Round',
    blurb: 'Width and length are similar, with full cheeks and a soft jaw. Reads friendly and youthful.',
  },
  square: {
    name: 'Square',
    blurb: 'A strong, wide jaw close to the width of the forehead and cheekbones, with defined corners.',
  },
  oblong: {
    name: 'Oblong',
    blurb: 'Noticeably longer than wide, with fairly straight sides. Elegant and balanced by width in styling.',
  },
  heart: {
    name: 'Heart',
    blurb: 'Wider forehead and cheekbones tapering to a narrower jaw and chin.',
  },
  diamond: {
    name: 'Diamond',
    blurb: 'Cheekbones are the widest point, with a narrower forehead and jaw. Striking, angular cheek structure.',
  },
};

/** Scores at or above this are inside the ideal range. */
export const IDEAL_SCORE = 8.5;

/** Score a value against its definition (0–10). */
export function scoreMetric(key, v) {
  const def = METRICS[key];
  const [lo, hi] = def.ideal;
  if (v >= lo && v <= hi) {
    if (def.higherIsBetter) return IDEAL_SCORE + 1.5 * ((v - lo) / (hi - lo));
    const mid = (lo + hi) / 2;
    const half = (hi - lo) / 2;
    return 10 - 1.5 * ((v - mid) / half) ** 2;
  }
  const d = (v < lo ? lo - v : v - hi) / def.tol;
  return Math.max(3, IDEAL_SCORE * Math.exp(-0.5 * d * d));
}

/** Which side of the ideal range a value falls on. */
export function rangeSide(key, v) {
  const [lo, hi] = METRICS[key].ideal;
  if (v < lo) return 'low';
  if (v > hi) return 'high';
  return 'in';
}

/** Weighted overall score (0–10) from per-feature scores. */
export function overallScore(scores) {
  let sum = 0;
  let w = 0;
  for (const key of METRIC_KEYS) {
    if (scores[key] == null) continue;
    sum += scores[key] * METRICS[key].weight;
    w += METRICS[key].weight;
  }
  return w ? sum / w : 0;
}

export function tierLabel(score) {
  if (score >= IDEAL_SCORE) return 'Ideal range';
  if (score >= 7) return 'Near ideal';
  if (score >= 5.5) return 'Balanced';
  return 'Room to grow';
}
