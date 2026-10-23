/**
 * Hakim IQ Labs — runtime configuration
 * ------------------------------------------------------------------
 * 1. Create a free Supabase project (README → "Supabase setup").
 * 2. Paste the Project URL and the *anon / publishable* key below.
 *    These are meant to be public: row-level security policies in
 *    supabase/schema.sql decide what each signed-in user can touch.
 *    Never paste the service_role / secret key here.
 *
 * Leave both empty to run in local "demo mode": no accounts, and
 * history is kept only in this browser's localStorage. Handy for
 * trying the site before you set Supabase up.
 */
export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';

/** Minimum age (years) to use the analysis. */
export const MIN_AGE = 13;

/**
 * MediaPipe Face Landmarker model + WASM runtime.
 * The model file is downloaded once and cached by the browser; photos
 * are processed locally and never sent anywhere. To self-host, download
 * the .task file into /assets/models/ and point MODEL_URL at it.
 */
export const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
export const MEDIAPIPE_WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
