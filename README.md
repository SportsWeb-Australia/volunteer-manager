# SportsWeb One — Volunteer Manager

A core SportsWeb One module: recruit, roster, support and recognise local sports-club
volunteers with minimal admin. AI prepares; humans approve.

Stack: **Vite + React + TypeScript + Supabase**, deployed on Vercel via the
`SportsWeb-Australia` GitHub org — same workflow as the rest of SportsWeb One.

## What's wired in this scaffold

- **Design system** — Big Shoulders / Outfit / Geist Mono, SportsWeb red on warm
  paper, card + traffic-light UI, the "review chip" signature. (`src/lib/theme.ts`, `src/index.css`)
- **Supabase data layer** — Dashboard, People, Roles, Rosters, Compliance,
  Communications, Reports and Billing read live from the Phase A schema.
- **Entitlements** — `useEntitlement()` calls the `vm_effective_features()` SQL gate;
  `<Gate feature="...">` shows the feature or an upgrade prompt. This is how
  "free at a SportsWeb One tier" and "standalone" behave identically in the UI.
- **Dual experience** — the sidebar "Viewing as" switch flips to the airy
  volunteer/parent self-service view.

Screens marked "Ports from the prototype" reuse the same components — the rich
interactions already exist in the standalone prototype and drop in here.

## Local run

```bash
npm install
cp .env.example .env        # fill in your Supabase URL + anon key
npm run dev                 # http://localhost:5173
```

The app expects a signed-in Supabase session and a `team_members` row linking the
user to a club. In production the host SportsWeb One shell supplies the session.

## Prerequisites (already done in Phase A)

Run these in the Supabase SQL Editor, in order:
1. `volunteer_manager_schema.sql`
2. `volunteer_manager_entitlements.sql`

Then grant your club an entitlement (service-role / SQL editor):

```sql
insert into public.volunteer_entitlements (club_id, plan_id, source, biller, status)
select '<CLUB_UUID>', id, 'manual', 'manual', 'active'
from public.volunteer_plans where key = 'vm_club';
```

## Deploy (when ready — I'll walk this click-by-click)

1. Push this folder to a new repo under the `SportsWeb-Australia` org.
2. Vercel → New Project → import the repo → Framework: **Vite**.
3. Environment Variables → add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Deploy. `vercel.json` already handles SPA routing.

## Edge Functions (in supabase/functions/)

| Function | Does | Secrets |
|---|---|---|
| `build-roster` | AI fair draft roster, proposes only | optional `ANTHROPIC_API_KEY` |
| `approve-roster` | Commits an approved draft into assignments | — |
| `dispatch-message` | Sends approved messages (SMS/email/push) | Twilio / ZeptoMail / WebPushr |
| `message-webhook` | Provider delivery events → recipient status | `VM_WEBHOOK_SECRET` |
| `billing-sync` | Activates/cancels module + sets plan tier | `VM_WEBHOOK_SECRET` |
| `public-signup` | Unauthenticated QR/link signup → applications | — |
| `shift-checkin` | NFC tap / QR scan → marks the shift attended | — |

### Shift check-in (NFC / QR)
Turned on per club in **Settings → Shift check-in** (Off / QR / NFC / Both).
- A **club** QR/NFC (`/checkin?c=<token>`) is reusable — pin or stick it at the ground; it checks the volunteer into their shift for today.
- A **per-shift** QR (`/checkin?s=<token>`) prints on the run sheet (button on each shift card).
- NFC works by writing the same URL to a tag (any "NFC Tools" app) — no app for the volunteer, they just tap.

## Going live (when you're ready to test — I'll walk it click-by-click)

1. **DB**: run `sportsweb_volunteer_manager.sql`, then `sportsweb_volunteer_manager_addendum.sql` (adds the delivery index + check-in columns). Optional: `sportsweb_volunteer_manager_seed.sql` for sample data. Enable the module + set a plan (done).
2. **Deploy functions**:
   `supabase functions deploy build-roster approve-roster dispatch-message`
   `supabase functions deploy public-signup shift-checkin message-webhook --no-verify-jwt`
   `supabase functions deploy billing-sync` *(call it server-to-server with the secret)*
3. **Secrets** (only the channels you use):
   `supabase secrets set VM_WEBHOOK_SECRET=… TWILIO_ACCOUNT_SID=… TWILIO_AUTH_TOKEN=… TWILIO_FROM=… ZEPTOMAIL_TOKEN=… ZEPTOMAIL_FROM=… WEBPUSHR_KEY=… WEBPUSHR_AUTH_TOKEN=…`
4. **App**: deploy this repo to Vercel (Framework: Vite) with `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.
5. **Provider callbacks**: point Twilio status callback + ZeptoMail webhook at
   `https://<project>.functions.supabase.co/message-webhook?key=<VM_WEBHOOK_SECRET>`.

## What's live vs fast-follow
- **Live flows**: dashboard, people, roles, compliance, opportunities + public signup,
  AI roster (build → approve), communications (approve → send), reports, billing/plans.
- **Fast-follow (still prototype stubs)**: Game Day templates, Recognition, Surveys,
  Onboarding, Settings — the components exist in the standalone prototype and port in.
- **Needs seed data to look alive**: add a few `people` + `volunteers` + `volunteer_shifts`
  rows for your test club, or they'll show empty states (which is correct behaviour).

