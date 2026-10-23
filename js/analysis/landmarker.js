/**
 * MediaPipe Face Landmarker wrapper.
 * Runs 100% in the browser (WebAssembly + WebGL). The image is passed to the
 * model in memory — nothing is uploaded.
 */
import { CDN } from '../core/cdn.js';
import { MODEL_URL, MEDIAPIPE_WASM } from '../config.js';

let landmarkerPromise = null;
let currentMode = 'IMAGE';

async function create(delegate) {
  const { FaceLandmarker, FilesetResolver } = await import(CDN.tasksVision);
  const fileset = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM);
  return FaceLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: 'IMAGE',
    numFaces: 2,
    minFaceDetectionConfidence: 0.5,
    minFacePresenceConfidence: 0.5,
    outputFaceBlendshapes: true,
  });
}

/** Lazily create (and cache) the landmarker. Falls back to CPU if GPU init fails. */
export function getLandmarker() {
  landmarkerPromise ??= create('GPU')
    .catch((err) => {
      console.warn('[landmarker] GPU delegate failed, using CPU', err);
      return create('CPU');
    })
    .catch((err) => {
      landmarkerPromise = null; // allow retry
      throw err;
    });
  return landmarkerPromise;
}

async function setMode(lm, mode) {
  if (currentMode === mode) return;
  await lm.setOptions({ runningMode: mode });
  currentMode = mode;
}

// One shared model serves both live video frames and still photos, so every
// call is serialised: a mode switch and its detection must never interleave
// with another call (e.g. a webcam frame still in flight when "Capture" runs).
let queue = Promise.resolve();
function exclusive(task) {
  const run = queue.then(task, task).catch(async (err) => {
    // A failed MediaPipe graph stays broken, so drop it; the next call rebuilds it.
    const broken = landmarkerPromise;
    landmarkerPromise = null;
    currentMode = 'IMAGE';
    broken?.then((lm) => lm.close()).catch(() => {});
    throw err;
  });
  queue = run.catch(() => {});
  return run;
}

/** Detect on a still image / canvas. */
export function detectImage(source) {
  return exclusive(async () => {
    const lm = await getLandmarker();
    await setMode(lm, 'IMAGE');
    return lm.detect(source);
  });
}

// VIDEO mode requires strictly increasing timestamps (MediaPipe rejects repeats).
let lastVideoTs = 0;

/** Detect on a playing <video> frame (live guides). */
export function detectVideo(video, timestamp) {
  return exclusive(async () => {
    const lm = await getLandmarker();
    await setMode(lm, 'VIDEO');
    lastVideoTs = Math.max(Math.round(timestamp), lastVideoTs + 1);
    return lm.detectForVideo(video, lastVideoTs);
  });
}

/** Pick the largest face when several are detected. */
export function largestFace(result) {
  const faces = result?.faceLandmarks || [];
  if (!faces.length) return null;
  let best = 0;
  let bestArea = -1;
  faces.forEach((lms, i) => {
    let minX = 1, maxX = 0, minY = 1, maxY = 0;
    for (const p of lms) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const area = (maxX - minX) * (maxY - minY);
    if (area > bestArea) {
      bestArea = area;
      best = i;
    }
  });
  const blend = {};
  for (const c of result.faceBlendshapes?.[best]?.categories || []) blend[c.categoryName] = c.score;
  return { landmarks: faces[best], blendshapes: blend, faceCount: faces.length };
}
