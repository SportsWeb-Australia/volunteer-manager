# SportsWeb One — Volunteer Manager (CLAUDE.md)

Context handoff for Claude Code. This module is a Vite/React/TS app + Supabase
(Postgres + Edge Functions) — a volunteer-management module inside SportsWeb One,
an operating system for Australian amateur sports clubs. Owner: Carson (Click
Sports Media / SportsWeb, Melbourne). Design language: card-based, traffic-light
UI, "AI prepares, human commits" (every AI action lands as a reviewable Draft →
Needs review → Approved chip). Fonts: Big Shoulders Display / Outfit / Geist Mono.
SportsWeb red #E1342E on paper #F4F1E8, deep navy #0B1424 panels.

## Live state (as of handoff)
- **Supabase project:** `sportsweb-one`, ref **`uzibfawcwoapfbigpzum`** (PRODUCTION).
  (An earlier note said `vzicgkqzkupyjzshiekk` — that was WRONG, ignore it.)
- **Live app:** https://volunteer-manager-e8ti.vercel.app (GitHub → Vercel, repo
  `SportsWeb-Australia/volunteer-manager`, Vite). Env vars set in Vercel:
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- **DB:** schema + addendum + seed all RUN. Then **PATCH 1** (grants/RLS/pricing)
  must be run — see below. Test club_id `d4232df2-faae-4557-87dd-8de56840587e`,
  staff auth user `8a5a9751-6f94-43d0-9d27-9ea1b…`, login `carson@clicksportsmedia.com`.
- **Edge Functions: NONE deployed yet.** 7 exist in `supabase/functions/`
  (build-roster, approve-roster, dispatch-message, billing-sync, public-signup,
  shift-checkin, message-webhook). Until deployed, AI roster / sending / public
  signup / check-in error out. Deploy with the Supabase CLI:
  `supabase link --project-ref uzibfawcwoapfbigpzum` then
  `supabase functions deploy <name>` (public-signup, shift-checkin,
  message-webhook need `--no-verify-jwt`).
- **Auth:** standalone magic-link login (`src/screens/Login.tsx`). There is no
  shared SportsWeb One shell/login yet — this app authenticates on its own.
  Supabase → Auth → URL Configuration must list the Vercel URL as Site URL +
  Redirect URL.

## Architecture notes
- Member directory is a NEW core table `people`; volunteers hang off `people`.
- Staff/auth mapping is the existing `club_users` (read by AppContext to resolve club).
- Module on/off uses the existing `modules` table (a `volunteers` row, enabled).
- Entitlements are data-driven: `volunteer_settings.plan_key` → `volunteer_plans`
  catalog. Each plan has `features = {"limits":{…},"flags":{…}}`. The app reads it
  via RPC `vm_effective_features` (see `src/hooks/useEntitlement.ts` → `has()` /
  `limit()`), and `<Gate feature="…">` wraps premium UI. Server-side, functions
  call `vm_feature()` / `vm_limit()`.
- RLS: every `volunteer_*` table + `people` is club-scoped via
  `vm_is_club_member(club_id)` (security-definer fn reading club_users).

## ⚠️ Run PATCH 1 first (`sportsweb_volunteer_manager_patch.sql`)
The original migration enabled RLS and wrote policies `to authenticated` but
**never GRANTed table privileges**, and **left `people` out of the RLS loop**.
Result: the logged-in app gets `permission denied for table volunteer_*` and reads
return empty. PATCH 1 (a) adds RLS to `people`, (b) GRANTs select/insert/update/
delete to `authenticated` on `people` + all `volunteer_*` tables, (c) grants execute
on functions, (d) sets default privileges for future tables, (e) flips
`publish_to_website` default to true, (f) rewrites the plan catalog to the new
pricing, (g) sets the test club to `vm_full`. **Most of the "doesn't work" backlog
below is fixed by running this patch — re-test after running it.**

## Pricing / tiers (DECIDED — encoded in PATCH 1)
Standalone: **Free $0**, **Basic $19/mo** (`vm_basic`), **Full $39/mo** (`vm_full`).
Annual = 10×. Bundled free on SportsWeb One: **Club Pro → Basic**, **Club Growth →
Full** (SW1 tier keys `sw1_club_pro` / `sw1_club_growth` are placeholders, confirm
real keys later). `vm_association` retained for later.

| Capability | Free | Basic $19 | Full $39 |
|---|:--:|:--:|:--:|
| Volunteers / roles / manual rosters / game day | ✓ (cap 40) | ✓ | ✓ |
| Email call-outs + AI comms drafts | ✓ | ✓ | ✓ |
| Publish opportunities to website | — | ✓ | ✓ |
| Shift check-in (QR/NFC) | ✓ | ✓ | ✓ |
| AI roster builder | — | — | ✓ |
| SMS (500/mo bundle) | — | — | ✓ |
| Push notifications | — | — | ✓ |
| Automated reminders | — | — | ✓ |
| Compliance tracking | — | — | ✓ |
| Onboarding & training | — | — | ✓ |
| Recognition / Surveys | — | — | ✓ |
| Advanced reports & exports | — | — | ✓ |

Flag keys live in `volunteer_plans.features.flags`: `website_publish, channel_email,
channel_sms, channel_push, ai_suggestions_basic, ai_comms_drafts, ai_roster_builder,
automated_reminders, advanced_reports, exports, compliance, onboarding,
recognition_automation, surveys, teams, seasons`. NB: `compliance` and `onboarding`
are NEW flags — the Compliance/Onboarding screens still need `<Gate>` wiring to honour them.

## BACKLOG (from Carson's first-run testing — triaged)

### P0 — fixed by PATCH 1 (verify after running)
- Volunteer People: nothing works → grant fix (reads + add/edit).
- Roles & Descriptions: "generate role" fails → grant fix (insert).
- Opportunities: "New opportunity" fails → grant fix (insert).
- Communications: `permission denied for table volunteer_messages` → grant fix.
  (NB: *creating/approving* a draft works after the patch; *sending* still needs
  the dispatch-message function deployed + providers — see P1.)
- Reports headline numbers show 0; Dashboard shows 0 → grant fix (reads).

### P1 — needs Edge Functions deployed (Stage 3) + providers
- AI roster builder shows but errors → deploy `build-roster`; it's Full-only and
  enabled now that the club is `vm_full`.
- Sending a message (after approve) → deploy `dispatch-message` + set provider
  secrets (Twilio SMS / Zoho ZeptoMail email / WebPushr push) + `message-webhook`.
- Public signup (`/v/:token`) → deploy `public-signup --no-verify-jwt`.
- Check-in (QR/NFC) → deploy `shift-checkin --no-verify-jwt`; toggle method in
  Settings → Shift check-in. **Carson still wants to test check-ins end-to-end.**
- Billing/checkout → `billing-sync` (server-to-server, `VM_WEBHOOK_SECRET`).

### P1 — code bugs (fix in repo via Claude Code)
- **Lost form state when tab loses focus / user returns.** Cause: `AppContext`
  `onAuthStateChange` calls `setReady(false)` on EVERY event; Supabase fires
  `TOKEN_REFRESHED`/`SIGNED_IN` on refocus → app remounts → entered data wiped.
  Fix: don't reset `ready` on token refresh; only handle real sign-in/out
  transitions (ignore `TOKEN_REFRESHED`, `USER_UPDATED`), or resolve club without
  flipping `ready` after first load.
- **Desktop layout: gap to the left of the sidebar.** Inspect `src/components/
  Shell.tsx` / root layout — likely a centered max-width wrapper or stray body
  margin; sidebar should sit flush-left, content area fluid.

### P2 — stub screens to build (port UX from `VolunteerManager.jsx` prototype)
- Game Day Jobs — empty. (core rostering flavour; Basic+)
- Events — empty.
- Onboarding & Training — empty → Full-only, add Gate.
- Recognition — empty → Full-only.
- Surveys & Feedback — empty → Full-only.
- Compliance — reads after patch, but make it operational + Full-only Gate.
- Reports — advanced section already gated to Full; build the actual advanced
  reports + exports for Full.

### P2 — design / branding
- **Club-branded theming**: render the module in the club's colours + logo. Source
  brand from the `clubs` row (add/confirm brand fields) and drive `theme.ts`
  tokens + the sidebar logo per club. High-value for selling.

### Confirmed good
- Login, club resolution, Settings (incl. Shift check-in selector), Volunteer
  self-service view (Image) all look right. Volunteer view needs real-time test
  once functions are live.

## Gotchas already hit (don't re-discover)
1. Wrong project ref `vzicgkqzkupyjzshiekk` → real is `uzibfawcwoapfbigpzum`.
2. Vercel env vars only bake in at **build time** → after editing, **redeploy
   without build cache**. Names MUST start with `VITE_`.
3. Supabase has new-style keys (`sb_publishable_…`); the app uses the legacy
   `anon` JWT (`eyJ…`). If legacy keys get disabled, switch the client to the
   publishable key.
4. Magic-link login needs the site URL in Supabase Auth → URL Configuration.
5. Migration was missing GRANTs + `people` RLS (PATCH 1).
6. `created_by` etc. are uuid — never pass string sentinels like `'ai'` in seeds.

## Repo layout
`src/lib` (supabase, theme, types, entitlements, api) · `src/context/AppContext.tsx`
· `src/hooks/useEntitlement.ts` · `src/components` (ui, Gate, Shell, Qr) ·
`src/screens/*` (real: Dashboard, People, Roles, Rosters, Communications,
Compliance, Reports, Billing, Opportunities, Settings, PublicSignup, CheckIn,
Login, VolunteerView; stubs via Stub.tsx) · `supabase/functions/*` (7 fns) ·
`VolunteerManager.jsx` = original prototype (port stub UX from here).
