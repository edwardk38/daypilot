# CLAUDE.md — Daypilot

Read this first, every session. It is the source of truth for how this project works.

## What this is
An ADHD-friendly planner (portfolio project by Ed, a Vanderbilt student with ADHD). Work is broken into small, startable steps. Progress feedback is calm and honest: a completion moment after each focus session, a single start streak, and habit numbers that forgive real life. Phone-first PWA, installed to the iPhone home screen.

It was designed and prototyped in Claude.ai (versions v0.1–v0.6 as a Claude artifact). This repo is the hosted version.

## Pivot (Oct 19, 2026)
The travel theme (miles, flights, the map, passport and stamps, country pages, the Journey tab) was removed because it didn't motivate in practice. **Don't reintroduce points, currencies or collectibles without asking Ed.** Old saved data may still contain `miles`, `earned`, `location`, `visited` and `stamps`; the app ignores them and must never crash or show an error because of them.

## Ground rules
1. **The design is decided.** Don't redesign screens or change behavior on your own. Decisions are summarized below and in full in `docs/design-spec.md` (exported from the project's spec). If something is unclear or seems wrong, ask Ed.
2. **Match the mockups.** Visual changes must match the approved mockups (see `docs/design-spec.md` and screenshots Ed provides). Before calling any visual work done, screenshot the changed screens at **390 × 844** and compare. Fix differences first.
3. **Design tokens live in one place:** `public/css/app.css` `:root` (colors, light and dark). Don't hard-code new colors.
4. **Never silent.** Anything the AI proposes (names, plans, routines, schedules) appears as editable fields or a card the user confirms. The same goes for app suggestions (e.g. moving a habit off a weekday).
5. **Privacy.** The Claude API key lives only in Vercel env vars, used only by `/api/ai`. Never log user data or prompts. Each user's data is protected by Supabase row-level security.
6. **Tone of the in-app AI:** direct, specific, intelligent. No praise, no exclamation marks, no filler, no restating. Under ~60 words unless asked for detail. Plain text; lists as lines starting with "- ". One question at a time. Never invent facts about the user. (See `STYLE` in `public/js/app.js`.)
7. **Language rules in the UI:** "Later," not "Overdue." No red for missed things. No guilt copy. Missing a plan never costs anything. Dumped items are "items" or "things" to the user, never "tickets".

## Architecture
- `public/` — static PWA served by Vercel.
  - `index.html`, `manifest.webmanifest`, `sw.js` (offline, push), `icons/`
  - `css/app.css` — all styles and tokens.
  - `js/config.js` — Supabase URL + anon key + VAPID public key (public values).
  - `js/platform.js` — **adapter**. The app was written against the Claude-artifact API `claude.use("db" | "user" | "sample")`. This file implements the same API on our stack: `db` → Supabase `app_state` (one JSON doc per user), `user` → Supabase Auth (6-digit email code; links don't work for iPhone home-screen apps), `sample` → `/api/ai`. Also: sign-in screen, `#import` data import, `enableReminders()`.
  - App scripts (classic scripts, global scope, load order matters): `app.js` (state, streak, habits, Now, Dump, Horizon, Plan it wizard, item pages, AI calls), `itinerary.js` (day/week/month, drag-and-drop, Fill my day), `focus-and-events.js` (timer, completion moment, click handling).
- `api/` — Vercel serverless functions (Node, ESM).
  - `ai.js` — verifies the Supabase user, calls the Claude API. Tiers: `quick` → `claude-haiku-4-5-20251001`, `default` → `claude-sonnet-5-5`. `json:true` returns parsed JSON.
  - `push-subscribe.js` — stores a device's push subscription.
  - `send-reminders.js` — sends pushes for things starting in the next 5 minutes (per habit slot; skips excused days). Needs a scheduler (see Roadmap).
- `supabase/schema.sql` — tables + RLS. Run once.

**State shape** (`S`, saved as one JSON doc): `{v:2, items[], energy, hoursMin, starts{date:1}, day{date:{steps,habits,min}}, plan{date:[{ref,start,dur,proposed}]}, autoPlan, focusWin, restDays[], sleep{}, focus, tz}`. Item types: `unplanned` (a dump not yet planned; was `ticket` before the pivot, converted on load), `task`, `assignment`, `goal`, `habit`, `event`, `idea`. Habit fields: `{freq: "days"|"count"|"slots", days[], perWeek, slots[{id,label,time,remind}], minSlots, time, minimum, log{date:true}, slotLog{date:[slotId]}, excuse{date:note}, skip{}, routine{}}`. Local storage key is `daypilot-v1`; the old `passport-planner-v02/v01` keys are still read. A refactor into modules is welcome later, but keep behavior identical and do it as its own change.

## Decisions (condensed)
- **Tabs:** Now · Itinerary · Dump · Horizon. Weeks start Sunday.
- **Dump captures, Clean-up thinks.** One dump = one item, exactly the user's words, no AI. Unplanned items land in Horizon → Shelf → Clean-up and never reach Now until planned.
- **Plan it** = a wizard, one decision per screen with progress dots: (1) type cards + AI one-line understanding with "Not quite"; (2) only the fields for that type; (3) optional help (tailored starters + chat; assignments: attach file or describe, AI asks before planning); (4) suggested editable name + summary + where it will live. Tasks finish on step 2.
- **Horizon:** Tasks (Today / Coming up / Anytime; "No time needed" tasks stay checklist items), Assignments, Goals, Habits, Shelf (Clean-up, Someday ideas, Completed).
- **Someday ideas are workspaces:** spark, "Your take so far" (AI-maintained notes) + readiness list, Think it through (AI asks sharp questions, doesn't plan), Set aside thinking time, Turn it into… (carries notes over).
- **Every item page:** rename anytime, original dump text kept, Notes (AI-updated, editable), chat in a scrollable tile with Clear chat (clears the view only; memory kept).
- **Now:** animated header scene by energy (beach/park joggers/mountain hikers; reduced-motion respected), plain header with the energy chip menu and the start streak counter; Up next card; active card while a timer runs (timer keeps running in the background); "Your day" strip with grouped plans; "Also on deck" cards; done-for-today recap (steps, habits, hours focused) + optional list; morning sleep check-in (Rough → suggest Low energy, never forced); "Not feeling it" sheet (kind of low → vetted suggestions → 5-minute start).
- **Completion moment:** whenever a focus session ends, one calm screen: the step checked off, shown on its route (Step 2 of 4 + route bar) if it belongs to an assignment or goal; time worked; the next step with **Keep going** (starts it) and **Done for now**. Stopped early: "You started. That counts." and Keep going offers the next *other* thing. Never framed as failure; no confetti.
- **Start streak:** the only headline streak. A day counts with one focus session of 2+ minutes (real seconds) **or** any check-off. Planned rest days don't break it (and don't add to it). One free miss per Sunday–Saturday week; a second miss that week ends it. Shown as a small counter in the Now header, not a banner. When it ends: "Start a new one today" + the best streak; no red, no reset animation, no guilt copy.
- **Habits:** frequency is *days a week* (any days; shows on Now until the week's number is reached), *specific days*, or *several times a day* (named slots tied to a routine or time, each with an optional reminder, checked off separately, shown as dots ●●○ on Now, Itinerary and the habit page; the day counts once the minimum number of slots is done, default all). Numbers: this week against the target, last 30 days, lifetime total, and a consistency level from the last 30 days (in the spec, not built yet). **No streaks on habits.**
- **Something came up:** on a habit's day, or the next morning, a one-line note excuses the day; excused days never count as misses in any habit number. If 3+ notes land on the same weekday in the last 6 weeks, suggest moving the habit off that day (the user confirms or keeps it).
- **Itinerary:** drag-to-plan day view (tray + timeline, press-and-hold chip options: Not today, No time needed, Leave out of auto-planning), Fill my day (proposal → Keep/Undo), week view (drop onto days), month view (deadline statuses), auto-planning setting (Off / Suggest each morning [default] / Automatic), focus window, rest days.
- **Week and Month views:** tapping a day opens an in-place overview panel (today preselected); Open day goes to Day view. Drag-and-drop unchanged.
- **Hours focused** = actual timer time.

## Roadmap (do in order; one PR-sized change at a time)
1. **Deploy** — done Oct 13, 2026 (see README).
2. **Reminders.** Vercel's free plan only runs cron jobs daily, so trigger `/api/send-reminders` every 5 minutes with an external scheduler (Supabase `pg_cron` + `pg_net`, or cron-job.org) sending `Authorization: Bearer $CRON_SECRET`. Add duplicate protection (record sent `tag`s). Add the reminder actions Start / Swap / Push 30 min.
3. **Chunk 4 — assignment page + the brain** (spec: "Design pass: Assignment page" and "How the app thinks"): summary card with slack status, Plan · Notes · Chat tabs, plan as a route with expandable stops, edit mode, ask-for-a-change box; slack/urgency rules (On track / Tight / At risk), priority order on Now, calm escalation ladder, re-planning, remembered personal processes, vetted tip library with sources.
4. **Desktop layout** for wide screens (Itinerary week and assignment page side by side first).
5. Later list: see the spec.

## Working style with Ed
Ed is a designer, not an engineer. Explain changes in plain language, ask before anything that costs money or touches accounts, and show screenshots of visual changes. Keep commits small with clear messages; this history is part of his portfolio.
