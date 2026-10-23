# Hakim IQ Labs

A free, privacy-first AI face analysis site. Photos are analysed **in the browser** with MediaPipe Face Landmarker (478 landmarks) — they are never uploaded. Only scores and plan progress are saved to the user's account (Supabase), and users can export or delete everything at any time.

- Cinematic landing page: Three.js wireframe face (mouse-reactive, morphs on scroll), GSAP ScrollTrigger storytelling, Lenis smooth scrolling, reduced-motion support
- Upload or webcam capture with live guides (lighting, angle, framing, neutral expression)
- Nine proportions measured on a pose-corrected face, each shown next to its reference range, with the landmarks drawn on your photo
- Strengths first, then respectful "areas to improve", plus a photo-quality report
- Glow-up plan (3–4 weeks / 6 months / 1–2 years) — safe methods only, tick-off checklist saved to the account
- Celebrity look-alike (for fun, proportions only), shareable PNG results card, score-history dashboard
- Email + password sign-up with **email verification**, "Continue with Google", 13+ age gate, privacy page

No build step: plain HTML, CSS and ES modules, so it deploys to GitHub Pages as-is.

---

## 1. Run it locally (2 minutes)

You need [Node.js](https://nodejs.org) 18+ (only for the tiny local server — the site itself has no dependencies to install).

```bash
node dev-server.mjs
```

Open <http://localhost:5173>. With no Supabase keys the site runs in **demo mode**: everything works, there are no accounts, and history is stored only in that browser. (The webcam works on `localhost` and on any HTTPS site.)

---

## 2. Supabase setup — accounts + email verification (≈10 minutes, free)

### 2.1 Create the project
1. Go to <https://supabase.com>, sign in, **New project**. Pick a region close to your users and save the database password somewhere safe.

### 2.2 Create the tables
2. Open **SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.
   This creates the `analyses` and `plans` tables with row-level security (each user can only touch their own rows) and the `delete_my_account()` function used by "Delete my account".

### 2.3 Connect the site
3. In **Project Settings → API**, copy the **Project URL** and the **anon / publishable** key.
4. Paste them into [`js/config.js`](js/config.js):
   ```js
   export const SUPABASE_URL = 'https://YOUR-PROJECT-REF.supabase.co';
   export const SUPABASE_ANON_KEY = 'your-anon-or-publishable-key';
   ```
   These two values are designed to be public. **Never** put the `service_role` / secret key in the site.

### 2.4 Email + verification
5. **Authentication → Sign In / Providers → Email**: make sure Email is enabled and **Confirm email is ON** (it is by default). With this on, Supabase refuses to create a session until the address is verified, so unverified users can't save or read any data — verification is enforced on the server, not just in the UI. Set the minimum password length to **8**.
6. **Authentication → URL Configuration**:
   - **Site URL**: your live address, e.g. `https://YOUR-USERNAME.github.io/YOUR-REPO/`
   - **Redirect URLs** — add both:
     - `https://YOUR-USERNAME.github.io/YOUR-REPO/**`
     - `http://localhost:5173/**`
7. **Authentication → Emails → Templates** (optional but recommended): paste
   [`supabase/email-templates/confirm-signup.html`](supabase/email-templates/confirm-signup.html) into *Confirm signup* and
   [`supabase/email-templates/reset-password.html`](supabase/email-templates/reset-password.html) into *Reset password*.

### 2.5 Email delivery (important for real users)
Supabase's built-in email sender is for testing only: it is heavily rate-limited and may only deliver to your own team's addresses. For real sign-ups, connect a free SMTP provider in **Authentication → Emails → SMTP Settings**:

| Provider | Free tier | SMTP settings |
|---|---|---|
| [Brevo](https://www.brevo.com) | 300 emails/day, works with a single verified sender address (no domain needed) | host `smtp-relay.brevo.com`, port `587`, user = your Brevo SMTP login, password = SMTP key |
| [Resend](https://resend.com) | 3,000 emails/month (needs a domain you own) | host `smtp.resend.com`, port `465`, user `resend`, password = API key |

Set the sender email/name (e.g. "Hakim IQ Labs") to the verified address.

### 2.6 "Continue with Google"
1. In the [Google Cloud Console](https://console.cloud.google.com): create a project → **APIs & Services → OAuth consent screen** (External; app name, support email; scopes `openid`, `email`, `profile`) → publish it.
2. **Credentials → Create credentials → OAuth client ID → Web application**:
   - Authorized JavaScript origins: `https://YOUR-USERNAME.github.io` and `http://localhost:5173`
   - Authorized redirect URI: `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback` (shown on the Supabase Google provider page)
3. Copy the Client ID and Client Secret into **Supabase → Authentication → Sign In / Providers → Google** and enable it.

Google accounts arrive already verified, so they can use the analysis immediately.

### 2.7 Gmail-only sign-ups without a verification email (current live setup)
Until a custom SMTP sender is connected, Supabase's built-in sender only allows ~2 emails per hour, which blocks verification. The live site therefore runs with **Confirm email OFF** and only accepts correctly formed Gmail addresses:
- the sign-up form rejects anything that isn't `name@gmail.com` (6–30 letters/numbers, single dots, no `+` aliases), and
- [`supabase/gmail-only.sql`](supabase/gmail-only.sql) adds a database trigger that enforces the same rule server-side.

This checks the address format, not ownership. To go back to verified emails: connect SMTP (2.5), switch **Confirm email** back on, and optionally keep or drop the trigger (`drop trigger enforce_gmail_signup on auth.users;`).

### 2.8 Test it
Run locally, open **Sign in → Create a free account**, sign up, click the link in the email, and you'll land on `auth.html?verified=1` signed in. Run an analysis, then check the Dashboard.

---

## 3. Deploy to GitHub Pages (free)

```bash
git init
git add .
git commit -m "Hakim IQ Labs"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

Then on GitHub: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)` → Save**. After a minute the site is live at `https://YOUR-USERNAME.github.io/YOUR-REPO/` (HTTPS, so the webcam works). Make sure that exact address is in the Supabase **Site URL** and **Redirect URLs** (step 2.4).

All links are relative, so the site works under a repo sub-path or a custom domain. `.nojekyll` is included so GitHub serves every file untouched.

Before going public, replace the placeholder contact address in [`privacy.html`](privacy.html) (search for `TODO`).

---

## 4. How the analysis works

1. **Detect** — MediaPipe Face Landmarker returns 478 3D landmarks (468 mesh + 10 iris) and expression blendshapes, entirely on-device (WebAssembly + WebGL, GPU with CPU fallback).
2. **Frontalise** — a face-aligned frame is built from bilateral landmark pairs and the midline, and every point is re-expressed in it. Head roll, turn and nod are removed before measuring; the turn/nod angles feed the photo-quality check.
3. **Measure** — scale-free ratios and angles ([`js/analysis/metrics.js`](js/analysis/metrics.js)).
4. **Score** — each value against its reference range ([`js/analysis/ideals.js`](js/analysis/ideals.js)): inside the range scores 8.5–10; outside, the score eases down smoothly and never drops below 3. The overall score is a weighted average, and the formula is shown to users.

| Measurement | How it's computed | Reference range |
|---|---|---|
| Symmetry | 41 mirrored landmark pairs reflected across the fitted midline | 95–100 % |
| Facial thirds | middle (brows → nose base) : lower (nose base → chin) | 1 : 0.95–1.10 |
| Jawline angle | angle at the chin between the two jaw corners | 121°–127° ¹ |
| Canthal tilt | inner → outer eye-corner angle vs. the eye axis | +4° to +8° |
| Eye spacing | inner-canthus gap ÷ eye width (rule of fifths) | 0.90–1.10× |
| Nose : mouth | mouth width ÷ nose-wing width | 1.45–1.65 |
| Lip ratio | upper : lower lip height | 1 : 1.4–1.8 |
| FWHR | cheekbone width ÷ brow-to-upper-lip height | 1.75–2.05 |
| Face shape | length/width, jaw/width, forehead/width, chin angle | descriptive, never scored |

**Calibration notes (kept honest on purpose).** The engine was run on 54 real public portraits to check that each landmark choice reproduces known anthropometric norms:
- *Eye spacing* uses the outer-contour inner canthi (landmarks 243/463). On real faces these give eye width ≈ eye gap ≈ ⅕ of face width, matching the norm; the lid-margin corners (133/362) systematically inflated the ratio by ~20 %.
- *Nose width* is the mean of two nose-wing pairs (98/327, 48/278), which lands at ≈ 0.25 × face width like published norms; the mouth : nose ratio then averages 1.50.
- *Jaw*: MediaPipe's mesh barely varies at the jaw corner (SD ≈ 2° across people), so a "gonial angle" from a front photo would be mostly the model's prior, not your face. The site measures where the jawlines meet at the chin instead. ¹ No clinical norm exists for that frontal angle, so its reference band is the middle 60 % of the 54 measured faces — and the site says so to users.
- *Face shape* compares z-scored ratios (relative to the same 54 faces) with shape prototypes, because the mesh stops below the hairline.

Photo quality (pose, exposure, evenness, sharpness, face size, expression) is reported alongside every result because it genuinely changes the numbers.

---

## 5. Celebrity look-alike data

[`data/celebrities.json`](data/celebrities.json) holds 54 proportion vectors measured with the same engine from each person's Wikipedia lead photo. It contains **only ratios and names** — no images, no landmark coordinates — and is labelled "for fun, proportions only" in the UI.

To rebuild or extend it: run the local server, open <http://localhost:5173/tools/build-celebrity-db.html>, edit the name list (`Wikipedia title|f` or `|m`), click **Build database**, then **Download celebrities.json** into `data/`. Photos that are turned, tilted, open-mouthed or broadly smiling are skipped automatically.

---

## 6. Project structure

```
index.html          Landing page (3D hero, scroll story, FAQ)
analyze.html        Capture → scan → results
plan.html           Glow-up plan checklist
dashboard.html      Score history, plan progress, export/delete
auth.html           Sign in / sign up / verify / reset password
privacy.html        Privacy page          404.html  GitHub Pages 404
css/                base (tokens) · components · landing · app
js/config.js        Supabase keys + model URLs  ← the only file you must edit
js/core/            Supabase client, auth, data store, age gate, utils, CDN versions
js/ui/              Shell (nav/footer/modals/toasts), motion, icons, diagrams, chart
js/landing/         Three.js hero face
js/analysis/        Landmarker, metrics, ideal ranges, quality, overlay, look-alike
js/plan/            Glow-up content library + generator
js/share/           Share-card renderer
js/pages/           One controller per page
data/               celebrities.json
supabase/           schema.sql + email templates
tools/              Celebrity database builder (maintainer tool)
dev-server.mjs      Zero-dependency local server
```

Third-party libraries are loaded as pinned ES modules from jsDelivr (versions in [`js/core/cdn.js`](js/core/cdn.js)), and each page downloads only what it uses.

---

## 7. Customising

- **Brand colours & type**: CSS custom properties at the top of [`css/base.css`](css/base.css).
- **Ranges, weights & result copy**: [`js/analysis/ideals.js`](js/analysis/ideals.js).
- **Glow-up content**: [`js/plan/library.js`](js/plan/library.js). Keep it safe: no surgery, no extreme dieting, no pseudoscience; tasks marked `adult` are never shown to 13–17-year-olds.
- **Self-host the model** (optional, for full independence from Google's CDN): download the `.task` file from the URL in `js/config.js` into `assets/models/` and point `MODEL_URL` at it.

---

## 8. Privacy model (summary)

- Photos and webcam frames never leave the device; they live in page memory only.
- Stored per user: email, age group (not birthday), scores, measured ratios, face-shape label, photo-quality score, plan + ticked steps.
- Never stored: images, landmark coordinates, face embeddings.
- Users can export JSON, delete single analyses, delete all history, or delete their account (cascade delete) from the Dashboard.
- No ads, analytics or tracking cookies.

---

## 9. Credits & licences

- [MediaPipe Tasks Vision](https://github.com/google-ai-edge/mediapipe) — Apache 2.0
- [Three.js](https://threejs.org) — MIT
- [GSAP + ScrollTrigger](https://gsap.com) — free GSAP standard licence
- [Lenis](https://github.com/darkroomengineering/lenis) — MIT
- [Supabase JS](https://github.com/supabase/supabase-js) — MIT
- Inter, Inter Tight, JetBrains Mono — SIL Open Font License

All visuals (3D face, diagrams, logo) are original and generated in code.

**Disclaimer:** scores describe facial proportions in one photo and are not a measure of beauty or worth. Nothing here is medical advice.
