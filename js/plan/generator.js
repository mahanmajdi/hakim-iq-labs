/**
 * Builds a personalised glow-up plan from an analysis.
 *
 *  1. Focus = the weakest measurements (up to 3).
 *  2. Levers = the habits that can genuinely influence how those read,
 *     followed by universal basics (skin, sleep, hydration, posture…).
 *  3. Each period of the chosen timeline pulls tasks for those levers,
 *     filtered for age (no dieting advice under 18) and preferences.
 *
 * The finished plan stores its full text, so saved plans stay stable even if
 * this library is edited later.
 */
import { METRICS, METRIC_KEYS, FACE_SHAPES, IDEAL_SCORE, rangeSide } from '../analysis/ideals.js';
import { TASKS, TIMELINES, METRIC_LEVERS, BASE_LEVERS, SHAPE_TIPS, LEVERS } from './library.js';

const PER_PERIOD = { weeks: 7, months: 7, years: 6 };

function browTip(analysis) {
  const canthal = analysis.values?.canthal;
  const spacing = analysis.values?.eyeSpacing;
  if (spacing != null && rangeSide('eyeSpacing', spacing) === 'low')
    return 'Start your brows slightly wider apart: tidy the inner ends by a hair or two each side (1–2 mm at most) to open the centre of the face.';
  if (spacing != null && rangeSide('eyeSpacing', spacing) === 'high')
    return 'Start your brows slightly closer in — lightly fill sparse inner ends with a pencil or tinted gel instead of letting them taper early.';
  if (canthal != null && rangeSide('canthal', canthal) === 'low')
    return 'Keep the outer third lifted: tidy strays under the tail and brush the tail slightly upward with clear gel. Avoid over-plucking the arch.';
  return 'Follow your natural arch: start in line with the side of the nose, peak above the outer edge of the iris, end on a line from nostril to outer eye corner.';
}

function fill(text, ctx) {
  return text.replace(/\{(\w+)\}/g, (_, k) => ctx[k] ?? '');
}

/**
 * @param {object} args
 * @param {'weeks'|'months'|'years'} args.timeline
 * @param {{ id?: string, scores: object, values: object, face_shape?: string }} args.analysis
 * @param {{ facialHair?: boolean, ageBand?: string|null }} [args.prefs]
 */
export function generatePlan({ timeline, analysis, prefs = {} }) {
  const tl = TIMELINES[timeline];
  if (!tl) throw new Error(`Unknown timeline: ${timeline}`);
  const adult = prefs.ageBand === '18+';
  const facialHair = Boolean(prefs.facialHair);

  // 1. Focus areas
  const ranked = METRIC_KEYS.map((k) => ({ key: k, score: analysis.scores[k] ?? 10 })).sort((a, b) => a.score - b.score);
  let focus = ranked.filter((f) => f.score < IDEAL_SCORE).slice(0, 3);
  const polish = focus.length === 0;
  if (polish) focus = ranked.slice(0, 2);

  // 2. Levers in priority order
  const levers = [];
  const push = (l) => !levers.includes(l) && levers.push(l);
  focus.forEach((f) => METRIC_LEVERS[f.key].forEach(push));
  BASE_LEVERS.forEach(push);
  push('brows');
  push('lips');
  const allowed = new Set(levers.filter((l) => (l === 'beard' ? facialHair : true)));

  // 3. Template context
  const shapeKey = analysis.face_shape || analysis.shape?.key || 'oval';
  const tips = SHAPE_TIPS[shapeKey] || SHAPE_TIPS.oval;
  const ctx = {
    shape: (FACE_SHAPES[shapeKey]?.name || 'Oval').toLowerCase(),
    hairTip: tips.hair,
    beardTip: tips.beard,
    glassesTip: tips.glasses,
    necklineTip: tips.neckline,
    browTip: browTip(analysis),
  };

  const leverRank = (id) => {
    const l = TASKS[id].lever;
    const i = levers.indexOf(l);
    return i === -1 ? 99 : i;
  };

  const periods = tl.periods.map((ids, pi) => {
    const chosen = ids
      .filter((id) => TASKS[id])
      .filter((id) => allowed.has(TASKS[id].lever))
      .filter((id) => !(TASKS[id].adult && !adult) && !(TASKS[id].teen && adult))
      .map((id, order) => ({ id, order, rank: leverRank(id) }))
      // keep the script's order for the first few, but favour focus levers when trimming
      .sort((a, b) => a.rank - b.rank || a.order - b.order)
      .slice(0, PER_PERIOD[timeline])
      .sort((a, b) => a.order - b.order);
    return {
      label: tl.periodLabels?.[pi] || `${tl.unit} ${pi + 1}`,
      items: chosen.map(({ id }) => ({
        id: `${pi}:${id}`,
        task: id,
        lever: TASKS[id].lever,
        leverLabel: LEVERS[TASKS[id].lever].label,
        title: fill(TASKS[id].title, ctx),
        detail: fill(TASKS[id].detail, ctx),
      })),
    };
  });

  return {
    version: 1,
    timeline,
    label: tl.label,
    summary: tl.summary,
    expect: tl.expect,
    notChanging: tl.notChanging,
    createdFrom: analysis.id || null,
    shape: shapeKey,
    polish,
    focus: focus.map((f) => ({
      key: f.key,
      name: METRICS[f.key].name,
      score: f.score,
      changeable: METRICS[f.key].changeable,
    })),
    prefs: { facialHair, ageBand: prefs.ageBand || null },
    periods,
    total: periods.reduce((s, p) => s + p.items.length, 0),
  };
}
