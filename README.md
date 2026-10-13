# Passport Planner — hosted version

## Setup (one time)

1. **Supabase**
   - Create a project. In **SQL Editor**, paste `supabase/schema.sql` and run it.
   - In **Authentication → URL Configuration**, set the Site URL to your Vercel address (and add `http://localhost:3000` for local testing).
   - **Sign-in emails send a code, not a link.** On iPhone a home-screen app doesn't share sign-in with Safari, and email links always open Safari, so the app asks for the code instead. Set up **Authentication → Emails → SMTP Settings** (we use a Gmail app password: `smtp.gmail.com`, port 587; the built-in sender allows ~2 emails/hour and templates can't be edited without custom SMTP). Then, in **Templates**, set both **Magic Link** and **Confirm signup** (used the first time an address signs in) to:
     ```html
     <p>Your sign-in code:</p>
     <h2>{{ .Token }}</h2>
     <p>Type it into the app. It expires in 1 hour.</p>
     ```
   - From **Project Settings → API**, copy the Project URL and the `anon` public key into `public/js/config.js`. Also note the `service_role` key (secret) for step 3.
2. **Push notification keys** (for reminders): run `npx web-push generate-vapid-keys` once. Put the public key in `public/js/config.js` and both keys in Vercel (step 3).
3. **Vercel** → import this GitHub repo → Settings → Environment Variables:
   - `ANTHROPIC_API_KEY` — from the Anthropic Console (set a monthly spending limit there)
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (e.g. `mailto:you@example.com`)
   - `CRON_SECRET` — any long random string
   Then redeploy.
4. **Docs for Claude Code:** in the project brief on Claude.ai, export the **Design spec** tab as Markdown and save it as `docs/design-spec.md` (optionally the other tabs too).

## Install on iPhone
Open the site in **Safari** → Share → **Add to Home Screen**. Open it from the icon, sign in with the emailed code, then Itinerary → settings → **Turn on reminders**.

## Bring your data from the Claude version
In the Claude version: Itinerary → settings (gear) → **Export my data** → copy the text. Then open the hosted app at `/#import`, paste, and tap Import.

## Notes
- Without Supabase config the app still runs, saving only on the device.
- `/api/*` functions run on Vercel. To test them locally, use `npx vercel dev`.
