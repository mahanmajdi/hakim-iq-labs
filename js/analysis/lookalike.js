/**
 * Celebrity look-alike (for fun).
 *
 * Compares the user's facial *proportions* — not identity, not appearance —
 * with a small database of proportion vectors measured from public photos
 * by the same engine (see tools/build-celebrity-db.html). Each feature is
 * standardised by its spread across the database so no single ratio dominates.
 */

/** [feature key, accessor(analysis), weight] */
export const LOOKALIKE_FEATURES = [
  ['thirds', (a) => a.values.thirds, 1],
  ['canthal', (a) => a.values.canthal, 1],
  ['eyeSpacing', (a) => a.values.eyeSpacing, 1],
  ['noseMouth', (a) => a.values.noseMouth, 1],
  ['lips', (a) => a.values.lips, 0.6],
  ['fwhr', (a) => a.values.fwhr, 1],
  ['jaw', (a) => a.values.jaw, 0.7],
  ['lw', (a) => a.ratios.lw, 1],
  ['jawRatio', (a) => a.ratios.jawRatio, 1],
  ['foreheadRatio', (a) => a.ratios.foreheadRatio, 0.7],
  ['eyeW', (a) => a.ratios.eyeW, 0.8],
  ['noseW', (a) => a.ratios.noseW, 0.8],
  ['mouthW', (a) => a.ratios.mouthW, 0.8],
  ['midFace', (a) => a.ratios.midFace, 0.8],
];

export function featureVector(analysis) {
  return Object.fromEntries(LOOKALIKE_FEATURES.map(([k, get]) => [k, Math.round(get(analysis) * 10000) / 10000]));
}

let dbPromise = null;

export function loadCelebrities() {
  dbPromise ??= fetch('data/celebrities.json')
    .then((r) => {
      if (!r.ok) throw new Error(`celebrities.json ${r.status}`);
      return r.json();
    })
    .then((data) => {
      const people = data.people || [];
      const stats = {};
      for (const [k] of LOOKALIKE_FEATURES) {
        const vals = people.map((p) => p.v[k]).filter(Number.isFinite);
        const m = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
        const sd = Math.sqrt(vals.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(vals.length - 1, 1)) || 1;
        stats[k] = { m, sd };
      }
      return { ...data, people, stats };
    });
  return dbPromise;
}

/**
 * @param {object} analysis   result of analyzeLandmarks()
 * @param {{ gender?: 'all'|'f'|'m', top?: number }} opts
 * @returns {Promise<Array<{ name: string, g: string, similarity: number, closest: string[] }>>}
 */
export async function findLookalikes(analysis, { gender = 'all', top = 3 } = {}) {
  const db = await loadCelebrities();
  const me = featureVector(analysis);
  const wSum = LOOKALIKE_FEATURES.reduce((s, [, , w]) => s + w, 0);
  const results = db.people
    .filter((p) => gender === 'all' || p.g === gender)
    .map((p) => {
      let d2 = 0;
      const perFeature = [];
      for (const [k, , w] of LOOKALIKE_FEATURES) {
        const z = (me[k] - p.v[k]) / db.stats[k].sd;
        d2 += w * z * z;
        perFeature.push([k, Math.abs(z)]);
      }
      d2 /= wSum;
      perFeature.sort((a, b) => a[1] - b[1]);
      return {
        name: p.name,
        g: p.g,
        // d² ≈ 2 for two random faces → ~50%; identical proportions → 100%.
        similarity: Math.round(100 * Math.exp(-d2 / 2.9)),
        closest: perFeature.slice(0, 3).map(([k]) => k),
      };
    });
  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, top);
}
