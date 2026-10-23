/**
 * Hero 3D face
 * ------------------------------------------------------------------
 * A procedurally sculpted face "mask" (original geometry — no scanned or
 * third-party mesh) rendered as a glowing wireframe + point cloud with a
 * fake key/rim light so the features read clearly.
 *
 *  • Mouse     → the face turns toward the cursor (damped).
 *  • Scroll    → setScroll(p) dissolves the mesh into a particle
 *                constellation while the face turns away.
 *  • Idle      → a scanning band sweeps the surface; landmark nodes pulse.
 *  • Intro     → particles assemble into the face on load.
 *
 * Rendering pauses when the hero is off-screen or the tab is hidden.
 */
import { CDN } from '../core/cdn.js';
import { reducedMotion } from '../ui/motion.js';

const COLS = 78; // samples across the face
const ROWS = 92; // samples forehead → chin
const THETA_MAX = 1.5; // ±86° around the head
const LAT_MIN = -1.13; // chin
const LAT_MAX = 1.02; // upper forehead

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */
const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const gauss = (x, y, cx, cy, sx, sy) => Math.exp(-0.5 * (((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2));
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const normalize = (a) => {
  const l = Math.hypot(...a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** Seeded PRNG so the mesh looks identical on every load. */
function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Forward displacement that sculpts facial features onto the head. */
function faceRelief(x, y) {
  const ax = Math.abs(x);
  let d = 0;
  d += 0.06 * gauss(ax, y, 0.2, 0.25, 0.19, 0.05); // brow ridge
  d -= 0.14 * gauss(ax, y, 0.25, 0.08, 0.13, 0.085); // eye sockets
  d += 0.075 * gauss(ax, y, 0.25, 0.07, 0.08, 0.045); // eyelids / globes
  // nose: ridge growing from the bridge (y=.18) to the tip (y=-.28)
  const t = Math.min(1, Math.max(0, (0.18 - y) / 0.46));
  const sigma = 0.03 + 0.055 * t;
  let nose = (0.03 + 0.24 * t ** 1.7) * Math.exp(-(x * x) / (2 * sigma * sigma));
  if (y < -0.28) nose *= Math.exp(-(((y + 0.28) / 0.04) ** 2));
  if (y > 0.18) nose *= Math.exp(-(((y - 0.18) / 0.08) ** 2));
  d += nose;
  d += 0.06 * gauss(ax, y, 0.085, -0.28, 0.04, 0.035); // nostril wings
  d += 0.075 * gauss(ax, y, 0.42, -0.05, 0.12, 0.11); // cheekbones
  d -= 0.03 * gauss(ax, y, 0.3, -0.32, 0.08, 0.1); // nasolabial hollow
  d += 0.035 * gauss(x, y, 0, -0.39, 0.1, 0.045); // philtrum
  d += 0.065 * gauss(x, y, 0, -0.46, 0.15, 0.028); // upper lip
  d -= 0.045 * gauss(x, y, 0, -0.505, 0.17, 0.011); // lip line
  d += 0.06 * gauss(x, y, 0, -0.55, 0.13, 0.032); // lower lip
  d -= 0.035 * gauss(x, y, 0, -0.63, 0.12, 0.028); // chin crease
  d += 0.085 * gauss(x, y, 0, -0.78, 0.14, 0.08); // chin
  d -= 0.04 * gauss(ax, y, 0.56, 0.32, 0.08, 0.12); // temples
  return d;
}

/** Point on the face surface for grid coords u∈[-1,1] and latitude (radians). */
function facePoint(u, lat) {
  const theta = u * THETA_MAX;
  const cl = Math.cos(lat);
  let x = Math.sin(theta) * cl * 0.8;
  const y = Math.sin(lat) * 1.05;
  const z = Math.cos(theta) * cl * 0.62; // flatter than a sphere, like a real face
  x *= 1 - 0.34 * Math.pow(smoothstep(-0.05, -1.0, y), 1.25); // jaw taper
  x *= 1 - 0.06 * smoothstep(0.45, 1.0, y); // slightly narrower forehead top
  const front = smoothstep(0.15, 0.8, Math.cos(theta));
  const relief = faceRelief(x, y) * front;
  return { p: [x, y, z + relief], relief };
}

function buildGeometry(THREE) {
  const rand = mulberry32(11);
  const W = COLS + 1;
  const V = [];
  for (let j = 0; j <= ROWS; j++) {
    for (let i = 0; i <= COLS; i++) {
      // jitter interior vertices for an organic, hand-meshed feel
      const ju = i > 0 && i < COLS ? (rand() - 0.5) * 0.45 : 0;
      const jv = j > 0 && j < ROWS ? (rand() - 0.5) * 0.45 : 0;
      const u = ((i + ju) / COLS) * 2 - 1;
      const lat = LAT_MIN + ((j + jv) / ROWS) * (LAT_MAX - LAT_MIN);
      const { p, relief } = facePoint(u, lat);
      // soft fade toward the edges of the mask
      const edge = smoothstep(0, 7, Math.min(i, COLS - i)) * smoothstep(0, 5, Math.min(j, ROWS - j));
      const r = 1.8 + rand() * 2.6;
      const len = Math.hypot(...p) || 1;
      V.push({
        p,
        relief,
        edge,
        rnd: rand(),
        scatter: [(p[0] / len) * r + (rand() - 0.5) * 1.4, (p[1] / len) * r + (rand() - 0.5) * 1.4, (p[2] / len) * r + (rand() - 0.5) * 1.4],
        n: [0, 0, 1],
      });
    }
  }
  // Per-vertex normals from grid neighbours (used for lighting).
  for (let j = 0; j <= ROWS; j++) {
    for (let i = 0; i <= COLS; i++) {
      const at = (ii, jj) => V[Math.min(ROWS, Math.max(0, jj)) * W + Math.min(COLS, Math.max(0, ii))].p;
      const du = sub(at(i + 1, j), at(i - 1, j));
      const dv = sub(at(i, j + 1), at(i, j - 1));
      let n = normalize(cross(du, dv));
      const p = V[j * W + i].p;
      if (n[0] * p[0] + n[1] * p[1] + n[2] * p[2] < 0) n = n.map((c) => -c);
      V[j * W + i].n = n;
    }
  }

  const geom = (verts) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts.flatMap((v) => v.p), 3));
    g.setAttribute('aScatter', new THREE.Float32BufferAttribute(verts.flatMap((v) => v.scatter), 3));
    g.setAttribute('aNormal', new THREE.Float32BufferAttribute(verts.flatMap((v) => v.n), 3));
    g.setAttribute('aRand', new THREE.Float32BufferAttribute(verts.map((v) => v.rnd), 1));
    g.setAttribute('aEdge', new THREE.Float32BufferAttribute(verts.map((v) => v.edge), 1));
    g.setAttribute('aRelief', new THREE.Float32BufferAttribute(verts.map((v) => Math.abs(v.relief)), 1));
    return g;
  };

  // Triangulated wireframe: horizontal, vertical and alternating diagonals.
  const idx = (i, j) => j * W + i;
  const edges = [];
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      edges.push(V[idx(i, j)], V[idx(i + 1, j)]);
      edges.push(V[idx(i, j)], V[idx(i, j + 1)]);
      if ((i + j) % 2) edges.push(V[idx(i, j)], V[idx(i + 1, j + 1)]);
      else edges.push(V[idx(i + 1, j)], V[idx(i, j + 1)]);
    }
  }

  // Landmark nodes: nearest vertex to each anatomical target.
  const targets = [
    [0, 0.6], [0, 0.3], [0, 0.14], [0, -0.28], [0, -0.46], [0, -0.55], [0, -0.92], // midline
    [-0.14, 0.07], [0.14, 0.07], [-0.37, 0.08], [0.37, 0.08], // eye corners
    [-0.12, 0.25], [0.12, 0.25], [-0.28, 0.29], [0.28, 0.29], [-0.43, 0.24], [0.43, 0.24], // brows
    [-0.095, -0.28], [0.095, -0.28], // nose wings
    [-0.17, -0.5], [0.17, -0.5], // mouth corners
    [-0.68, 0.06], [0.68, 0.06], [-0.52, -0.52], [0.52, -0.52], [-0.24, -0.84], [0.24, -0.84], // contour
    [-0.5, 0.52], [0.5, 0.52], [-0.42, -0.06], [0.42, -0.06], // temples & cheekbones
  ];
  const nodes = targets.map(([tx, ty]) => {
    let best = V[0];
    let bestD = Infinity;
    for (const v of V) {
      if (v.edge < 0.5) continue;
      const d = (v.p[0] - tx) ** 2 + (v.p[1] - ty) ** 2;
      if (d < bestD) {
        bestD = d;
        best = v;
      }
    }
    return best;
  });

  // Measurement lines between landmarks (eye axis, midline, widths, jawline, brows)
  const pairs = [
    [9, 7], [7, 8], [8, 10],
    [2, 3], [3, 4], [4, 5], [5, 6],
    [17, 18], [19, 20],
    [21, 23], [23, 25], [25, 6], [22, 24], [24, 26], [26, 6],
    [11, 13], [13, 15], [12, 14], [14, 16],
    [29, 30],
  ];
  const measure = pairs.flatMap(([a, b]) => [nodes[a], nodes[b]]);

  return { points: geom(V), lines: geom(edges), nodes: geom(nodes), measure: geom(measure) };
}

/* ------------------------------------------------------------------ */
/* Shaders                                                             */
/* ------------------------------------------------------------------ */
const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uMorph;
  uniform float uScan;
  uniform float uSize;
  uniform float uPixelRatio;
  attribute vec3 aScatter;
  attribute vec3 aNormal;
  attribute float aRand;
  attribute float aEdge;
  attribute float aRelief;
  varying float vAlpha;
  varying float vScan;
  varying float vY;
  varying float vM;
  varying float vFeat;
  void main() {
    float m = clamp(uMorph * 1.3 - aRand * 0.3, 0.0, 1.0);
    m = m * m * (3.0 - 2.0 * m);
    vec3 p = mix(position, aScatter, m);
    p += aNormal * sin(uTime * 1.3 + aRand * 6.2831) * 0.004;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);

    vec3 n = normalize(normalMatrix * aNormal);
    float facing = smoothstep(-0.05, 0.45, n.z);
    float key = max(dot(n, normalize(vec3(-0.55, 0.55, 0.65))), 0.0);
    float rim = pow(1.0 - max(n.z, 0.0), 2.2);
    float light = 0.12 + 0.95 * key * key + 0.7 * rim;
    vAlpha = mix(facing * light * aEdge, 0.8, m);
    vFeat = smoothstep(0.02, 0.16, aRelief) * aEdge;

    vScan = exp(-pow((position.y - uScan) * 7.0, 2.0)) * (1.0 - m) * aEdge;
    vY = position.y;
    vM = m;
    gl_Position = projectionMatrix * mv;
    #ifdef IS_POINTS
      gl_PointSize = uSize * uPixelRatio * (1.0 + vScan * 1.6 + vFeat * 0.6) * (4.0 / -mv.z);
    #endif
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 uColA;
  uniform vec3 uColB;
  uniform vec3 uColC;
  uniform float uOpacity;
  varying float vAlpha;
  varying float vScan;
  varying float vY;
  varying float vM;
  varying float vFeat;
  void main() {
    float t = smoothstep(0.95, -0.95, vY);
    vec3 col = mix(uColA, uColB, smoothstep(0.0, 0.6, t));
    col = mix(col, uColC, smoothstep(0.5, 1.0, t) * 0.85);
    col += vScan * vec3(0.55, 0.85, 1.0) + vFeat * vec3(0.25, 0.3, 0.35);
    float a = vAlpha * uOpacity * (1.0 + vScan * 2.4 + vFeat * 1.6);
    #ifdef IS_POINTS
      float d = length(gl_PointCoord - 0.5);
      a *= smoothstep(0.5, 0.0, d);
    #else
      a *= 1.0 - smoothstep(0.0, 0.5, vM);
    #endif
    gl_FragColor = vec4(col, a);
  }
`;

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */
export async function createHeroFace(canvas) {
  const reduced = reducedMotion();
  let THREE;
  let renderer;
  try {
    THREE = await import(CDN.three);
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (err) {
    console.warn('[hero] WebGL unavailable, showing static fallback', err);
    canvas.classList.add('is-fallback');
    return { setScroll() {}, dispose() {} };
  }

  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(0, 0, 5.4);

  const group = new THREE.Group();
  scene.add(group);

  const geo = buildGeometry(THREE);
  const pr = Math.min(devicePixelRatio || 1, 2);
  const col = (hex) => new THREE.Color(hex);
  const makeMat = ({ points, size = 2, opacity = 1, a = '#67e8f9', b = '#818cf8', c = '#e879f9' }) =>
    new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      defines: points ? { IS_POINTS: '' } : {},
      uniforms: {
        uTime: { value: 0 },
        uMorph: { value: reduced ? 0 : 1 },
        uScan: { value: 2 },
        uSize: { value: size },
        uPixelRatio: { value: pr },
        uOpacity: { value: opacity },
        uColA: { value: col(a) },
        uColB: { value: col(b) },
        uColC: { value: col(c) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

  const mats = {
    lines: makeMat({ opacity: 0.2 }),
    points: makeMat({ points: true, size: 2.1, opacity: 0.8 }),
    nodes: makeMat({ points: true, size: 8, opacity: 1.3, a: '#e0f7ff', b: '#c7d2fe', c: '#f5d0fe' }),
    measure: makeMat({ opacity: 0.5, a: '#a5f3fc', b: '#c4b5fd', c: '#f0abfc' }),
  };
  group.add(new THREE.LineSegments(geo.lines, mats.lines));
  group.add(new THREE.Points(geo.points, mats.points));
  group.add(new THREE.LineSegments(geo.measure, mats.measure));
  group.add(new THREE.Points(geo.nodes, mats.nodes));
  const allMats = Object.values(mats);

  // ---- Interaction state (declared before the first resize/render)
  const pointer = { x: 0, y: 0 };
  const rot = { x: 0, y: 0 };
  let scroll = 0;
  let morph = reduced ? 0 : 1; // intro: particles assemble into the face

  // ---- Layout: face on the right on wide screens, centred above copy on phones
  let base = { x: 0, y: 0, s: 1 };
  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const aspect = w / h;
    if (aspect > 1.15) base = { x: Math.min(1.35, 0.6 * aspect), y: 0.02, s: 1.08 };
    else if (aspect < 0.75) base = { x: 0, y: 0.76, s: 0.6 }; // phones: face in the top third, above the copy
    else base = { x: 0, y: 0.55, s: Math.min(0.92, 0.62 + aspect * 0.35) };
    group.scale.setScalar(base.s);
    if (reduced) render(0);
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  if (!reduced) {
    addEventListener(
      'pointermove',
      (e) => {
        pointer.x = (e.clientX / innerWidth) * 2 - 1;
        pointer.y = (e.clientY / innerHeight) * 2 - 1;
      },
      { passive: true },
    );
  }

  function render(time) {
    const t = time / 1000;
    const targetMorph = smoothstep(0.12, 0.9, scroll);
    morph += (targetMorph - morph) * (reduced ? 1 : 0.04);

    const idle = reduced ? 0 : Math.sin(t * 0.35) * 0.32;
    rot.y += (pointer.x * 0.6 + idle - 0.18 + scroll * 1.1 - rot.y) * 0.05;
    rot.x += (pointer.y * 0.25 + 0.04 - scroll * 0.25 - rot.x) * 0.05;
    group.rotation.set(rot.x, reduced ? -0.4 : rot.y, 0);
    group.position.set(base.x, base.y + scroll * 0.35, 0);

    // scanning band: sweeps top → bottom every ~4.5 s
    const cycle = (t % 4.5) / 4.5;
    const scan = reduced ? 0.05 : 1.2 - cycle * 3.2;
    for (const m of allMats) {
      m.uniforms.uTime.value = t;
      m.uniforms.uMorph.value = morph;
      m.uniforms.uScan.value = scan;
    }
    mats.measure.uniforms.uOpacity.value = reduced ? 0.45 : 0.3 + 0.22 * Math.sin(t * 1.6);
    renderer.render(scene, camera);
  }

  // ---- Loop (only while visible)
  let raf = 0;
  let visible = true;
  const loop = (time) => {
    render(time);
    raf = requestAnimationFrame(loop);
  };
  const start = () => {
    if (!raf && visible && !document.hidden && !reduced) raf = requestAnimationFrame(loop);
  };
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    visible ? start() : stop();
  }).observe(canvas);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  if (reduced) render(0);
  else start();

  canvas.classList.add('is-ready');

  return {
    setScroll(p) {
      scroll = p;
    },
    dispose() {
      stop();
      renderer.dispose();
    },
  };
}
