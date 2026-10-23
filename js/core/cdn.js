/**
 * Pinned third-party ES modules — one place to bump versions.
 * Everything is loaded lazily with dynamic import(), so each page only
 * downloads what it actually uses (e.g. Three.js on the landing page,
 * MediaPipe on the analysis page).
 */
export const CDN = {
  three: 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js',
  gsap: 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/index.js',
  scrollTrigger: 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/ScrollTrigger.js',
  lenis: 'https://cdn.jsdelivr.net/npm/lenis@1.1.13/+esm',
  supabase: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm',
  tasksVision: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs',
};
