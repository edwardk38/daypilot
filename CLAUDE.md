# CLAUDE.md — Passport Planner

Read this first, every session. It is the source of truth for how this project works.

## What this is
An ADHD-friendly planner (portfolio project by Ed, a Vanderbilt student with ADHD). Work is broken into small, startable steps; finishing steps earns **miles**; miles buy flights between real countries; each arrival gives a passport stamp and a country guide. Phone-first PWA, installed to the iPhone home screen.

It was designed and prototyped in Claude.ai (versions v0.1–v0.6 as a Claude artifact). This repo is the hosted version.

## Ground rules
1. **The design is decided.** Don't redesign screens or change behavior on your own. Decisions are summarized below and in full in `docs/design-spec.md` (exported from the project's spec). If something is unclear or seems wrong, ask Ed.
2. **Match the mockups.** Visual changes must match the approved mockups (see `docs/design-spec.md` and screenshots Ed provides). Before calling any visual work done, screenshot the changed screens at **390 × 844** and compare. Fix differences first.
3. **Design tokens live in one place:** `public/css/app.css` `:root` (colors, light and dark). Don't hard-code new colors.
4. **Never silent.** Anything the AI proposes (names, plans, routines, schedules) appears as editable fields or a card the user confirms.
5. **Privacy.** The Claude API key lives only in Vercel env vars, used only by `/api/ai`. Never log user data or prompts. Each user's data is protected by Supabase row-level security.
6. **Tone of the in-app AI:** direct, specific, intelligent. No praise, no exclamation marks, no filler, no restating. Under ~60 words unless asked for detail. Plain text; lists as lines starting with "- ". One question at a time. Never invent facts about the user. (See `STYLE` in `public/js/app.js`.)
7. **Language rules in the UI:** "Later," not "Overdue." No red for missed things. Missing a plan never costs miles.

## Architecture
- `public/` — static PWA served by Vercel.
  - `index.html`, `manifest.webmanifest`, `sw.js` (offline, push), `icons/`
  - `css/app.css` — all styles and tokens.
  - `js/config.js` — Supabase URL + anon key + VAPID public key (public values).
  - `js/platform.js` — **adapter**. The app was written against the Claude-artifact API `claude.use("db" | "user" | "sample")`. This file implements the same API on our stack: `db` → Supabase `app_state` (one JSON doc per user), `user` → Supabase Auth (magic link), `sample` → `/api/ai`. Also: sign-in screen, `#import` data import, `enableReminders()`.
  - App scripts (classic scripts, global scope, load order matters): `map-data.js`, `places.js`, `app.js` (state, Now, Dump, Horizon, Plan it wizard, item pages, AI calls), `journey.js` (map, passport, arrivals), `itinerary.js` (day/week/month, drag-and-drop, Fill my day), `focus-and-events.js` (timer, click handling).
- `api/` — Vercel serverless functions (Node, ESM).
  - `ai.js` — verifies the Supabase user, calls the Claude API. Tiers: `quick` → `claude-haiku-4-5-20251001`, `default` → `claude-sonnet-5-5`. `json:true` returns parsed JSON.
  - `push-subscribe.js` — stores a device's push subscription.
  - `send-reminders.js` — sends pushes for things starting in the next 5 minutes. Needs a scheduler (see Roadmap).
- `supabase/schema.sql` — tables + RLS. Run once.

**State shape** (`S`, saved as one JSON doc): `{v:2, items[], energy, miles, earned, location, visited[], stamps[], hoursMin, day{date:{steps,habits,min,mi}}, plan{date:[{ref,start,dur,proposed}]}, autoPlan, focusWin, restDays[], sleep{}, focus, tz}`. Item types: `ticket` (unplanned dump), `task`, `assignment`, `goal`, `habit`, `event`, `idea`. A refactor into modules is welcome later, but keep behavior identical and do it as its own change.

## Decisions (condensed)
- **Tabs:** Now · Itinerary · Dump · Horizon · Journey. Weeks start Sunday.
- **Dump captures, Clean-up thinks.** One dump = one ticket, exactly the user's words, no AI. Tickets land in Horizon → Shelf → Clean-up and never reach Now until planned.
- **Plan it** = a wizard, one decision per screen with progress dots: (1) type cards + AI one-line understanding with "Not quite"; (2) only the fields for that type; (3) optional help (tailored starters + chat; assignments: attach file or describe, AI asks before planning); (4) suggested editable name + summary + destination (+10 mi for planning). Tasks finish on step 2.
- **Horizon:** Tasks (Today / Coming up / Anytime; "No time needed" tasks stay checklist items), Assignments, Goals, Habits, Shelf (Clean-up, Someday ideas, Completed).
- **Someday ideas are workspaces:** spark, "Your take so far" (AI-maintained notes) + readiness list, Think it through (AI asks sharp questions, doesn't plan), Set aside thinking time, Turn it into… (carries notes over).
- **Every item page:** rename anytime, original dump text kept, Notes (AI-updated, editable), chat in a scrollable tile with Clear chat (clears the view only; memory kept).
- **Now:** animated header scene by energy (beach/park joggers/mountain hikers; reduced-motion respected), energy chip menu, location chip; ticket with trip progress; ready-to-fly banner; active ticket while a timer runs (timer keeps running in the background); "Your day" strip with grouped plans; "Also on deck" cards; done-for-today recap + optional list; morning sleep check-in (Rough → suggest Low energy, never forced); "Not feeling it" sheet (kind of low → vetted suggestions → 5-minute start).
- **Itinerary:** drag-to-plan day view (tray + timeline, press-and-hold chip options: Not today, No time needed, Leave out of auto-planning), Fill my day (proposal → Keep/Undo), week view (drop onto days), month view (deadline statuses), auto-planning setting (Off / Suggest each morning [default] / Automatic), focus window, rest days.
- **Miles:** steps scale with minutes (+30% if marked scary); habits by minimum; +20 weekly-target bonus; flights priced by real distance between capitals on a curve; return trips half price. Hours focused = actual timer time.
- **Country pages (to build):** arrival is a postcard (flip for a note), then a travel guide. **Content standard per country:** hero + 4–6 must-see places with photos + gallery ≥ 8 images; capital, population with year, languages, currency, area; known for; nature; history snapshot; culture (food, hello, festival, music/art); wildlife; ≥ 5 "Did you know?" facts. Photos credited and licensed (Wikimedia Commons / Unsplash / Pexels); numbers from World Bank/UN with year; every fact checked before release.

## Roadmap (do in order; one PR-sized change at a time)
1. **Deploy** (see README). Confirm sign-in, sync between two devices, AI features, install to iPhone home screen, offline load.
2. **Reminders.** Vercel's free plan only runs cron jobs daily, so trigger `/api/send-reminders` every 5 minutes with an external scheduler (Supabase `pg_cron` + `pg_net`, or cron-job.org) sending `Authorization: Bearer $CRON_SECRET`. Add duplicate protection (record sent `tag`s). Add the on-time bonus (≈1.5× miles for starting within 15 min of a self-chosen time) and the reminder actions Start / Swap / Push 30 min.
3. **Chunk 4 — assignment page + the brain** (spec: "Design pass: Assignment page" and "How the app thinks"): summary card with slack status, Plan · Notes · Chat tabs, plan as a route with expandable stops, edit mode, ask-for-a-change box; slack/urgency rules (On track / Tight / At risk), priority order on Now, calm escalation ladder, re-planning, remembered personal processes, vetted tip library with sources.
4. **Chunk 5 — country pages + content** for the 15 current countries, meeting the content standard. Photos can load from Wikimedia here (they couldn't in the artifact).
5. **Desktop layout** for wide screens (Itinerary week and assignment page side by side first).
6. Later list: see the spec.

## Working style with Ed
Ed is a designer, not an engineer. Explain changes in plain language, ask before anything that costs money or touches accounts, and show screenshots of visual changes. Keep commits small with clear messages; this history is part of his portfolio.
