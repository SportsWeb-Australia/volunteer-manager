# VolunteerOne — Volunteer Manager (CLAUDE.md)

Context handoff for Claude Code. This module is a Vite/React/TS app + Supabase
(Postgres + Edge Functions) — a volunteer-management module inside SportsWeb One,
an operating system for Australian amateur sports clubs. Owner: Carson (Click
Sports Media / SportsWeb, Melbourne).

## Branding (NEW — applied)
The module is branded **VolunteerOne**, "Powered by SportsWeb One".
- Logo: recreated as a vector in `src/components/Logo.tsx` — `VMark` (silver→teal
  ribbon "V"), `VOneWord` ("Volunteer" ink + "One" teal), `VOneLogo` (lockup).
- Palette (in `src/lib/theme.ts` + `src/index.css`): **brand teal `#00BFA6`**,
  deep teal `#00917A`, brandSoft `#D4F3EE`, ink `#1F2328`, paper `#F2F4F6`,
  silver `#C0C6CC`. **Red `#E1342E` is reserved for danger/errors/high-risk only.**
- Primary buttons, active nav, spinner, AI/spark accents = teal. Sidebar stays
  dark navy. Fonts: Big Shoulders Display / Outfit / Geist Mono.

## Live state (as of this handoff)
- **Supabase project:** `sportsweb-one`, ref **`uzibfawcwoapfbigpzum`** (PRODUCTION).
- **Live app:** https://volunteer-manager-e8ti.vercel.app (GitHub → Vercel, repo
  `SportsWeb-Australia/volunteer-manager`, Vite). Env vars in Vercel:
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (legacy anon JWT).
- **DB:** schema + addendum + seed RUN. **PATCH 1 RUN** (grants/RLS to
  `authenticated`). **PATCH 2 RUN** (`supabase/patch-2-service-role-grants.sql` —
  grants `service_role` access so Edge Functions work; see gotchas).
  **PATCH 3** (`supabase/patch-3-sms-metering.sql`) — SMS metering + trial +
  sender identity + free push/email + `vm_sms_quota()` RPC. **RUN THIS.**
- **Edge Functions: ALL 7 DEPLOYED & WORKING** (build-roster, approve-roster,
  dispatch-message, billing-sync, public-signup, shift-checkin, message-webhook).
  public-signup / shift-checkin / message-webhook deployed `--no-verify-jwt`.
- **Provider secrets: NOT SET YET.** So message *sending* (Twilio SMS / Zoho
  ZeptoMail email / WebPushr push) and billing-sync are deployed but inert until
  secrets are set. Compliance reminders only *draft* a message for now.
- **Test club:** `d4232df2-faae-4557-87dd-8de56840587e`, on plan **`vm_full`**
  (ai_roster_builder + all flags ON). Login `carson@clicksportsmedia.com`.
- **Supabase CLI:** installed as a dev dependency — use **`npx supabase …`**.
  Linked to the project; logged in as `info@sportsweb.com.au`. Fetch keys with
  `npx supabase projects api-keys --project-ref uzibfawcwoapfbigpzum`.

## Architecture notes
- Member directory is core table `people`; volunteers hang off `people` (a
  volunteer = a `volunteers` row linked to a `people.id`).
- Staff/auth mapping is `club_users` (read by AppContext to resolve club).
- Module on/off uses the `modules` table (`module_name='volunteers'`, enabled).
- Entitlements are data-driven: `volunteer_settings.plan_key` → `volunteer_plans`
  catalog (`features = {"flags":{…},"limits":{…}}`). App reads via RPC
  `vm_effective_features` (`src/hooks/useEntitlement.ts` → `has()` / `limit()`),
  `<Gate feature="…">` wraps premium UI. Server-side, functions call
  `vm_feature()` / `vm_limit()`.
- RLS: every `volunteer_*` table + `people` is club-scoped via
  `vm_is_club_member(club_id)`. Edge Functions run as `service_role` (bypass RLS)
  but STILL need table GRANTs — that's PATCH 2.
- Shared form UI: `Modal`, `Field`, `FormError`, `fieldInput` in `components/ui.tsx`.

## Pricing / tiers
Catalog has BOTH old + new keys (live): `vm_free`($0), `vm_basic`($19),
`vm_full`($39), plus legacy `vm_club`($29) / `vm_association`($99). Standalone
sell uses Free / Basic / Full. `included_in_sportsweb_tiers` bundles a plan free
on a SW1 tier. Flag keys live in `volunteer_plans.features.flags`.

## What works now (built/wired this session)
- **People:** add / **edit** / remove a volunteer (creates `people` + `volunteers`).
- **Roles:** add / **edit** / archive; click a template card to seed a club role.
- **Volunteer Sign-ups** (renamed from "Opportunities" in UI — table is still
  `volunteer_opportunities`, route still `/opportunities`, public-signup API field
  still `opportunity`): create a sign-up with a public `/v/:token` link + QR.
- **Rosters & Shifts:** "New shift" form (each shift gets a `check_in_token` → QR).
  AI roster builder (Gate `ai_roster_builder`, unlocked on `vm_full`).
- **Game Day Jobs:** pick jobs + date → batch-creates open shifts.
- **Events:** list/create club events (shared `events` table — see caveat).
- **Onboarding & Training:** `volunteer_training_records` (Gate `onboarding`).
- **Recognition:** `volunteer_recognition` (Gate `recognition_automation`).
- **Surveys & Feedback:** `volunteer_feedback` + average rating (Gate `surveys`).
- **Compliance:** "Send expiry reminders" drafts a `volunteer_messages` row.
- **Reports:** CSV download + Export PDF (browser print).

## Comms / monetisation (centralised model — clubs never bring their own provider)
- **Phase A DONE (code):** email + push free in all tiers; **SMS metered** via
  `vm_sms_quota()` + enforced in dispatch-message; **trial** = `vm_full` +
  `trial_ends_at` + `trial_sms_allowance` (default 25), provisioned by billing-sync
  `source:"trial"`; **sender identity** = platform default `TWILIO_FROM` with an
  optional approved club `sms_sender_id` (status not_started|pending|approved|rejected,
  falls back to platform). Communications screen shows the SMS/trial quota.
- **Phase B (next):** SMS packs + overage (wire to billing-sync), club-branded
  sender approval flow/UI, formal provider-adapter interface + an AU adapter
  (ClickSend/MessageMedia/Kudosity). AU rule: alphanumeric senders need
  registration from **1 Jul 2026** — register the platform sender; club senders are
  a paid, approved add-on.
- **Phase C:** enforce transactional-vs-marketing (`volunteer_messages.category`),
  marketing consent capture + STOP/opt-out handling.

## BACKLOG / next steps
- **Set provider secrets** to make sending live: `TWILIO_ACCOUNT_SID/AUTH_TOKEN/FROM`
  (register `VOLUNTEER1`/`SPORTSWEB` as the platform sender), `ZEPTOMAIL_TOKEN/FROM`,
  `WEBPUSHR_KEY/AUTH_TOKEN`, and `VM_WEBHOOK_SECRET` (billing-sync + message-webhook).
  `supabase secrets set …`.
- **Events insert caveat:** `events` is shared with the club-website product and
  has its own RLS — creating an event from here may hit a permission error.
  Verify the `authenticated` insert policy on `events` for this club.
- The 5 former-stub screens are functional but **basic (list + create)** — add
  edit/delete + richer features as needed.
- Wire billing checkout (`billing-sync` is server-to-server, needs VM_WEBHOOK_SECRET).
- `volunteer-manager` repo has **no club-website business** — keep the Dookie /
  club sites in their OWN repos (a wrong "Upload files" once pushed the Dookie
  site here; recovered, backup on branch `dookie-site-backup`).

## Gotchas already hit (don't re-discover)
1. Real project ref is `uzibfawcwoapfbigpzum`.
2. Vercel env vars bake in at **build time** → redeploy without cache after editing.
   Names MUST start with `VITE_`.
3. **PATCH 1** granted privileges to `authenticated` only. **PATCH 2** was needed
   to GRANT `service_role` on `volunteer_*` + `people` + `modules` — without it
   every Edge Function 500s with "permission denied for table volunteer_*"
   (symptom: dead `/v/:token` signup links). Re-run `patch-2-service-role-grants.sql`
   if new tables are added.
4. `created_by` etc. are uuid — never pass string sentinels like `'ai'`
   (build-roster hit this; pass `null`).
5. **`npm run typecheck` (`tsc -b`) is broken** (tsconfig project-ref `noEmit`
   error). The real build is `npm run build` (vite/esbuild, no full typecheck) —
   that's what Vercel runs. Verify changes with `npm run build`.
6. `.gitignore` was missing originally (added) — never `git add` `node_modules/`
   or `dist/`.
7. Magic-link login needs the Vercel URL in Supabase Auth → URL Configuration.
8. Repo is sometimes maintained via GitHub web "Upload files" (commits read
   "Add files via upload") — be careful which repo you're uploading into.

## Repo layout
`src/lib` (supabase, theme, types, entitlements, api) · `src/context/AppContext.tsx`
· `src/hooks/useEntitlement.ts` · `src/components` (ui, Logo, Gate, Shell, Qr) ·
`src/screens/*` (Dashboard, People, Roles, Opportunities[=Volunteer Sign-ups],
Rosters, GameDay, Events, Compliance, Onboarding, Communications, Recognition,
Surveys, Reports, Billing, Settings, PublicSignup, CheckIn, Login, VolunteerView)
· `supabase/functions/*` (7 fns) · `supabase/patch-2-service-role-grants.sql` ·
`VolunteerManager.jsx` = original prototype.
