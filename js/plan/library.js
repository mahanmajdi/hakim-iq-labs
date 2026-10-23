/**
 * Glow-up content library.
 *
 * Rules for everything in here:
 *  - Safe, realistic, evidence-aligned habits only.
 *  - No surgery or injectables, no extreme dieting, no "bone-changing"
 *    pseudoscience (e.g. mewing for structure, jaw exercisers).
 *  - Under-18s never get calorie-deficit advice.
 *
 * Text placeholders filled by the generator: {shape}, {hairTip}, {beardTip},
 * {glassesTip}, {necklineTip}, {browTip}.
 */

export const LEVERS = {
  skin: { label: 'Skin' },
  sleep: { label: 'Sleep' },
  hydration: { label: 'Hydration' },
  body: { label: 'Body composition' },
  posture: { label: 'Posture' },
  hair: { label: 'Hair' },
  beard: { label: 'Facial hair' },
  brows: { label: 'Brows' },
  lips: { label: 'Lips & smile' },
  style: { label: 'Style' },
  symmetry: { label: 'Balance' },
  photo: { label: 'Photo & check-ins' },
};

/** Task templates. `adult` = 18+ only; `teen` = 13–17 only. */
export const TASKS = {
  // Skin
  'skin.basics': { lever: 'skin', title: 'Start a simple 3-step routine', detail: 'Gentle cleanser and moisturiser morning and night, plus broad-spectrum SPF 30+ every morning — even when it is cloudy.' },
  'skin.spf': { lever: 'skin', title: 'Make SPF automatic', detail: 'Keep sunscreen next to your toothbrush and reapply after 2+ hours outdoors. UV is the biggest driver of uneven tone and early lines.' },
  'skin.pillow': { lever: 'skin', title: 'Fresh pillowcase twice a week', detail: 'Less oil and bacteria against your face overnight — a cheap, easy win for breakouts.' },
  'skin.exfoliate': { lever: 'skin', title: 'Add gentle exfoliation 1–2× a week', detail: 'A mild chemical exfoliant (lactic, mandelic or salicylic acid) beats harsh scrubs. Stop if your skin stings or flakes.' },
  'skin.retinoid': { lever: 'skin', title: 'Introduce a retinoid slowly', detail: 'Over-the-counter adapalene or retinol 2–3 nights a week, pea-sized amount, moisturiser after, SPF every morning. Skip during pregnancy; ask a pharmacist if unsure.' },
  'skin.stepup': { lever: 'skin', title: 'Step up your retinoid — only if skin is calm', detail: 'Move to nightly use if there has been no irritation for a month. If there has, stay where you are; consistency matters more than strength.' },
  'skin.derm': { lever: 'skin', title: 'Persistent acne? Book a dermatologist', detail: 'Prescription treatments work far better than stacking products. A GP can refer you if needed.' },
  'skin.seasonal': { lever: 'skin', title: 'Adjust your routine for the season', detail: 'Richer moisturiser in cold, dry months; lighter gel textures in heat. SPF stays year-round.' },
  'skin.review': { lever: 'skin', title: 'Review your routine', detail: 'Keep what works, drop what irritates. Fewer, well-chosen products beat a crowded shelf.' },

  // Sleep
  'sleep.schedule': { lever: 'sleep', title: 'Fix a consistent sleep window', detail: 'Aim for 7–9 hours (8–10 if you are a teen) with the same wake-up time most days. Sleep is the cheapest skin and puffiness treatment there is.' },
  'sleep.wind': { lever: 'sleep', title: 'Screen-free last 30 minutes', detail: 'Dim lights and put the phone away before bed — you fall asleep faster and wake less puffy.' },
  'sleep.position': { lever: 'sleep', title: 'Try back-sleeping or alternate sides', detail: 'Pressing the same cheek into the pillow every night can add one-sided morning puffiness and creasing.' },
  'sleep.track': { lever: 'sleep', title: 'Track consistency, not perfection', detail: 'Note bed and wake times for two weeks. Target: same wake time 6 days out of 7.' },
  'sleep.audit': { lever: 'sleep', title: 'Audit your sleep environment', detail: 'Dark (blackout or eye mask), cool (around 18 °C / 65 °F) and quiet. Small changes, big difference.' },

  // Hydration
  'hydration.target': { lever: 'hydration', title: 'Hit a daily water target', detail: 'Roughly 30–35 ml per kg of body weight from all drinks and food, more when you sweat. Pale-yellow urine is a good check.' },
  'hydration.sodium': { lever: 'hydration', title: 'Watch late salt and alcohol', detail: 'Both cause next-morning facial puffiness that blurs definition around the eyes and jaw.' },
  'hydration.habit': { lever: 'hydration', title: 'Anchor water to routines', detail: 'A glass on waking, with every meal and after training — no app needed.' },

  // Body composition
  'body.baseline': { lever: 'body', adult: true, title: 'Take an honest baseline', detail: 'Weekly average weight and waist measurement, plus photos in the same light. Daily numbers fluctuate — use the weekly average.' },
  'body.deficit': { lever: 'body', adult: true, title: 'If you carry extra body fat: a gentle deficit', detail: 'Lose about 0.5% of body weight per week by eating ~300–500 kcal/day less, mostly whole foods and plenty of protein. No crash diets or meal skipping. Skip this if you are already lean, pregnant, or have a history of disordered eating.' },
  'body.strength': { lever: 'body', adult: true, title: 'Strength train 2–3× a week', detail: 'Simple full-body sessions (squat, push, pull, hinge). Builds muscle, improves posture and makes fat loss stick.' },
  'body.steps': { lever: 'body', title: 'Walk 7,000–10,000 steps a day', detail: 'The easiest way to raise daily activity — and it helps sleep, mood and puffiness too.' },
  'body.protein': { lever: 'body', adult: true, title: 'Build meals around protein and plants', detail: 'A palm or two of protein and half a plate of vegetables per meal keeps you full on fewer calories.' },
  'body.review': { lever: 'body', adult: true, title: 'Monthly body check-in', detail: 'If your weekly average has not moved in 3 weeks, adjust by 100–200 kcal/day — never more. If energy, sleep or mood drop, eat more.' },
  'body.maintain': { lever: 'body', adult: true, title: 'Switch to maintenance', detail: 'Once you are happy, eat at maintenance and keep training. Sustainable beats fast.' },
  'body.recomp': { lever: 'body', adult: true, title: 'Recomposition phase', detail: 'Eat at maintenance with high protein and progressive strength training: slowly trade fat for muscle.' },
  'body.teen': { lever: 'body', teen: true, title: 'Move daily and eat regular meals', detail: 'Your body is still growing: focus on sport or activity you enjoy, three balanced meals and good sleep. No calorie counting or dieting.' },
  'body.teenSport': { lever: 'body', teen: true, title: 'Pick an activity you enjoy', detail: 'Team sport, dance, climbing, cycling — 60 minutes of movement most days builds posture and confidence.' },

  // Posture
  'posture.check': { lever: 'posture', title: 'Check your neck posture', detail: 'Ears over shoulders, chest open. Forward-head posture softens the jaw–neck angle in photos and in person.' },
  'posture.drills': { lever: 'posture', title: 'Daily chin tucks and wall angels', detail: '2 × 10 chin tucks and 10 wall angels a day. Small, boring and effective for posture (it does not change bone).' },
  'posture.desk': { lever: 'posture', title: 'Raise your screens', detail: 'Top of the monitor at eye level; hold your phone up instead of dropping your head.' },
  'posture.strength': { lever: 'posture', title: 'Strengthen your upper back', detail: 'Rows, face-pulls or band pull-aparts twice a week support an upright neck and shoulders.' },
  'posture.habit': { lever: 'posture', title: 'Make good posture the default', detail: 'Keep drills 3× a week and set a hourly "ears over shoulders" reminder for a month.' },

  // Hair
  'hair.research': { lever: 'hair', title: 'Save 3 reference haircuts', detail: 'Find people with a {shape} face shape and similar hair texture, and save photos to show your barber or stylist.' },
  'hair.cut': { lever: 'hair', title: 'Get a cut that suits your {shape} face', detail: '{hairTip}' },
  'hair.care': { lever: 'hair', title: 'Hair and scalp basics', detail: 'Wash 2–4× a week to suit your hair type, condition the lengths, and use heat protection when styling.' },
  'hair.maintain': { lever: 'hair', title: 'Book maintenance trims', detail: 'Every 4–6 weeks for short styles, 8–12 weeks for longer ones — shape fades faster than you think.' },
  'hair.iterate': { lever: 'hair', title: 'Experiment with one variable', detail: 'Change one thing at a time — length on top, fringe, or parting side — and compare photos in the same light.' },
  'hair.health': { lever: 'hair', title: 'Hair health check', detail: 'Noticing thinning? An early chat with a dermatologist gives you the most (evidence-based) options.' },

  // Facial hair
  'beard.trim': { lever: 'beard', title: 'Set a clean facial-hair baseline', detail: 'Trim to an even length and tidy the neckline to about one finger above the Adam’s apple. Clean-shaven? Keep the shave close and irritation-free.' },
  'beard.grow': { lever: 'beard', title: 'Try a 4-week growth test', detail: 'Let it grow untouched for 4 weeks before judging density, then choose: stubble, short boxed beard, or clean-shaven.' },
  'beard.shape': { lever: 'beard', title: 'Shape facial hair for a {shape} face', detail: '{beardTip}' },
  'beard.maintain': { lever: 'beard', title: 'Weekly line-up', detail: 'Re-define the cheek and neck lines every week — sharp lines read as a sharper jaw.' },

  // Brows
  'brows.cleanup': { lever: 'brows', title: 'Tidy, don’t reshape', detail: 'Remove only obvious strays between and under the brows. Keep natural thickness — over-plucking is hard to undo.' },
  'brows.shape': { lever: 'brows', title: 'Define your brow shape', detail: '{browTip}' },
  'brows.maintain': { lever: 'brows', title: 'Maintain every 2–3 weeks', detail: 'A quick tidy keeps the shape without thinning the brows over time.' },
  'brows.pro': { lever: 'brows', title: 'Optional: one professional shaping', detail: 'A threading or waxing professional can set a shape that you then maintain at home.' },

  // Lips & smile
  'lips.care': { lever: 'lips', title: 'SPF lip balm, daily', detail: 'Lips burn and dry easily. A balm with SPF keeps them smooth and well-defined.' },
  'lips.habit': { lever: 'lips', title: 'Stop licking and biting your lips', detail: 'Saliva dries lips out further — keep a balm handy instead.' },
  'lips.exfoliate': { lever: 'lips', title: 'Gentle weekly lip exfoliation', detail: 'A soft toothbrush or a little sugar with balm, once a week. Skip if lips are cracked.' },
  'lips.smile': { lever: 'lips', title: 'Dental care check', detail: 'Floss daily and book a dental check-up. Ask your dentist before any whitening.' },

  // Style
  'style.fit': { lever: 'style', title: 'Audit fit, not brands', detail: 'Shoulder seams at your shoulders, sleeves ending at the wrist bone, trousers without pooling. Tailoring a single item counts.' },
  'style.neckline': { lever: 'style', title: 'Necklines for a {shape} face', detail: '{necklineTip}' },
  'style.glasses': { lever: 'style', title: 'Frames for a {shape} face', detail: '{glassesTip}' },
  'style.colors': { lever: 'style', title: 'Find your best colours', detail: 'Hold warm, cool and neutral tops near your face in daylight. Keep the ones that make your skin look even and eyes bright.' },
  'style.capsule': { lever: 'style', title: 'Build a 10-piece capsule', detail: 'Ten versatile pieces in your best colours that all work together. Fewer decisions, better outfits.' },
  'style.refine': { lever: 'style', title: 'Refine a signature look', detail: 'Pick 2–3 elements that are recognisably you (a colour, a silhouette, an accessory) and repeat them.' },

  // Balance / symmetry
  'symmetry.grooming': { lever: 'symmetry', title: 'Even out grooming lines', detail: 'Match brow tails, sideburn length and beard cheek lines on both sides — small mismatches read as asymmetry.' },
  'symmetry.part': { lever: 'symmetry', title: 'Use your parting to balance', detail: 'Try parting on each side and compare photos; one side usually balances uneven features better.' },
  'symmetry.chew': { lever: 'symmetry', title: 'Notice one-sided habits', detail: 'Leaning on one hand, chewing on one side or sleeping on one cheek — spread them out where comfortable.' },

  // Photo & check-ins
  'photo.light': { lever: 'photo', title: 'Learn your lighting', detail: 'Face a window, not an overhead lamp. Soft, even front light is the single biggest photo upgrade.' },
  'photo.angle': { lever: 'photo', title: 'Find your angle', detail: 'Camera at eye level or slightly above, 1–1.5 m away using zoom — close wide-angle selfies enlarge the nose.' },
  'photo.reanalyze': { lever: 'photo', title: 'Re-analyse in the same conditions', detail: 'Same light, distance, expression and time of day, so the comparison in your dashboard is fair.' },
  'photo.compare': { lever: 'photo', title: 'Compare against your first analysis', detail: 'Open the dashboard and look at the trend, not one data point. Celebrate the habits, not just the numbers.' },
};

/** Which levers each measurement benefits from (most useful first). */
export const METRIC_LEVERS = {
  symmetry: ['symmetry', 'sleep', 'posture', 'photo'],
  thirds: ['hair', 'beard', 'photo'],
  jaw: ['body', 'posture', 'beard', 'hair'],
  canthal: ['brows', 'sleep', 'skin', 'style'],
  eyeSpacing: ['brows', 'style', 'hair'],
  noseMouth: ['lips', 'beard', 'style'],
  lips: ['lips', 'hydration', 'skin'],
  fwhr: ['body', 'hair', 'beard'],
};

/** Face-shape specific styling, written to work for any gender. */
export const SHAPE_TIPS = {
  oval: {
    hair: 'Most styles suit you. Keep some volume on top and avoid hiding the forehead completely so your balanced proportions show.',
    beard: 'Heavy stubble or a short, neat beard keeps your natural outline.',
    glasses: 'Wide, slightly geometric frames — a touch wider than your face.',
    neckline: 'Almost anything works; V-necks and open collars add a gentle vertical line.',
  },
  round: {
    hair: 'Add height on top and keep the sides closer to lengthen the face. Side parts and asymmetric fringes help.',
    beard: 'Keep the cheeks shorter and let length build at the chin to elongate the face.',
    glasses: 'Angular or rectangular frames add definition.',
    neckline: 'V-necks and open collars create vertical lines.',
  },
  square: {
    hair: 'Soft texture, some length on top and tapered sides soften strong angles; side-swept styles work well.',
    beard: 'A short beard rounded at the chin, or clean stubble — avoid very boxy edges.',
    glasses: 'Round or oval frames balance an angular jaw.',
    neckline: 'Scoop or V-necks and softer, rounded collars.',
  },
  oblong: {
    hair: 'Avoid lots of height. Add width at the sides and consider a fringe to shorten the face visually.',
    beard: 'Fuller sides and a shorter chin add width (think short boxed beard).',
    glasses: 'Deeper frames with detailed temples add width.',
    neckline: 'Crew necks, turtlenecks and layered collars shorten the vertical line.',
  },
  heart: {
    hair: 'Volume around the chin or a textured fringe balances a wider forehead; avoid lots of height on top.',
    beard: 'A fuller beard at the chin and jaw adds width to the lower face.',
    glasses: 'Bottom-heavy or rimless frames; avoid heavy brow lines.',
    neckline: 'Scoop necks and wider collars balance the jaw.',
  },
  diamond: {
    hair: 'Fullness at the forehead and chin (fringe, textured top, chin-length volume) balances wide cheekbones.',
    beard: 'Fuller at the chin to broaden the lower face; keep the cheeks clean.',
    glasses: 'Oval or browline frames soften the cheekbones.',
    neckline: 'Boat necks or crew necks add width at the shoulders.',
  },
};

/**
 * Period scripts per timeline. Each period lists task ids in priority order;
 * the generator keeps only tasks for levers relevant to the user.
 */
const MONTHS_6 = [
  ['skin.basics', 'sleep.schedule', 'hydration.target', 'body.baseline', 'body.teen', 'posture.check', 'brows.cleanup', 'hair.research', 'beard.grow', 'lips.care', 'symmetry.grooming', 'photo.light'],
  ['hair.cut', 'body.deficit', 'body.teenSport', 'body.strength', 'posture.drills', 'skin.exfoliate', 'sleep.wind', 'beard.shape', 'brows.shape', 'style.fit', 'symmetry.part', 'lips.habit'],
  ['skin.retinoid', 'body.review', 'posture.desk', 'style.neckline', 'hydration.sodium', 'sleep.position', 'lips.exfoliate', 'brows.maintain', 'symmetry.chew', 'photo.reanalyze'],
  ['hair.iterate', 'body.protein', 'body.steps', 'style.glasses', 'skin.derm', 'sleep.track', 'beard.maintain', 'lips.smile', 'photo.angle'],
  ['style.colors', 'body.review', 'posture.strength', 'hair.maintain', 'brows.pro', 'hydration.habit', 'skin.spf'],
  ['skin.review', 'body.maintain', 'style.capsule', 'posture.habit', 'sleep.audit', 'photo.reanalyze', 'photo.compare'],
];

export const TIMELINES = {
  weeks: {
    label: '3–4 weeks',
    unit: 'Week',
    summary: 'A fast reset: habits and grooming that show up quickly.',
    expect: [
      'Fresher, more even-looking skin and less morning puffiness.',
      'Sharper grooming: a haircut, brows and facial hair that suit your face shape.',
      'Better photos thanks to lighting, angle and posture.',
    ],
    notChanging: 'Bone structure and most measured proportions. Expect your score to move only slightly — mostly through photo quality and reduced puffiness.',
    periods: [
      ['skin.basics', 'sleep.schedule', 'hydration.target', 'posture.check', 'brows.cleanup', 'beard.trim', 'lips.care', 'body.steps', 'body.teen', 'hair.research', 'photo.light'],
      ['hair.cut', 'sleep.wind', 'posture.drills', 'skin.pillow', 'beard.shape', 'brows.shape', 'hydration.sodium', 'symmetry.grooming', 'lips.habit', 'style.fit'],
      ['skin.exfoliate', 'sleep.position', 'posture.desk', 'style.glasses', 'style.neckline', 'lips.exfoliate', 'symmetry.part', 'photo.angle', 'body.teenSport'],
      ['skin.review', 'sleep.track', 'style.colors', 'brows.maintain', 'beard.maintain', 'hydration.habit', 'symmetry.chew', 'photo.reanalyze'],
    ],
  },
  months: {
    label: '6 months',
    unit: 'Month',
    summary: 'Real habit change: skin, body composition and a personal style that fits.',
    expect: [
      'If you carry extra body fat, steady loss can reveal more jaw and cheekbone definition.',
      'Clearer, smoother skin texture from consistent SPF and (optionally) a retinoid.',
      'Better posture and a refined haircut and style for your face shape.',
    ],
    notChanging: 'Bone-set proportions such as eye spacing, canthal tilt and thirds. Jaw and width readings can shift modestly as body fat and puffiness change.',
    periods: MONTHS_6,
  },
  years: {
    label: '1–2 years',
    unit: 'Month',
    summary: 'Compounding results: long-term skin health, stable body composition and a signature look.',
    expect: [
      'Long-term skin quality from daily SPF and a well-tolerated retinoid.',
      'A stable, healthy body composition you can maintain without effort.',
      'Posture, grooming and style that have become automatic — and photos that show it.',
    ],
    notChanging: 'Proportions set by bone structure stay largely the same — and that is fine. Harmony comes from how everything works together.',
    periods: [
      ...MONTHS_6,
      ['hair.maintain', 'skin.spf', 'body.recomp', 'body.teenSport', 'posture.habit', 'style.refine', 'sleep.track'],
      ['skin.stepup', 'brows.maintain', 'beard.maintain', 'hydration.habit', 'lips.care', 'symmetry.grooming'],
      ['skin.seasonal', 'body.review', 'hair.iterate', 'style.colors', 'photo.reanalyze'],
      ['sleep.audit', 'posture.strength', 'hair.health', 'style.capsule', 'lips.smile'],
      ['skin.review', 'body.maintain', 'brows.pro', 'style.fit', 'hydration.sodium'],
      ['skin.spf', 'posture.habit', 'hair.maintain', 'style.refine', 'photo.reanalyze', 'photo.compare'],
      ['skin.seasonal', 'body.maintain', 'body.teenSport', 'sleep.schedule', 'hair.iterate', 'symmetry.part'],
      ['skin.review', 'posture.strength', 'style.capsule', 'lips.exfoliate', 'photo.reanalyze'],
      ['skin.seasonal', 'hair.health', 'brows.maintain', 'style.refine', 'sleep.audit'],
      ['skin.review', 'body.review', 'style.colors', 'photo.reanalyze', 'photo.compare'],
    ],
    periodLabels: [
      'Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5', 'Month 6',
      'Month 7', 'Month 8', 'Month 9', 'Month 10', 'Month 11', 'Month 12',
      'Year 2 · Q1', 'Year 2 · Q2', 'Year 2 · Q3', 'Year 2 · Q4',
    ],
  },
};

/** Base levers everyone benefits from. */
export const BASE_LEVERS = ['skin', 'sleep', 'hydration', 'posture', 'photo', 'style'];
