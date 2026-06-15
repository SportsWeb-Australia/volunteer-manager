# build-roster (Edge Function)

AI-assisted, **fair** draft roster. It proposes — it never assigns. Output lands as a
`volunteer_ai_suggestions` row (`status='needs_review'`) and the manager approves in the UI.

## Why deterministic, not "ask the LLM who to roster"
Compliance and fairness must be *correct and explainable*, not guessed. The matching is
deterministic (availability, preferred roles, fairness/burnout, max-shift caps, and a hard
compliance flag). The LLM, if a key is present, only rephrases the human summary — it never
decides picks. So a volunteer missing a WWCC can't be quietly slotted into a restricted role.

## Request
```jsonc
POST /functions/v1/build-roster
{
  "club_id": "<uuid>",
  "roster_id": "<uuid>",            // optional; omit to fill all open shifts
  "options": {
    "avoid_recent_weeks": 4,        // penalise anyone rostered within this window
    "include_team_ids": ["<uuid>"], // bias toward these teams' volunteers
    "prioritise_new": true,         // boost first-timers
    "enforce_checks": false         // false = flag missing checks; true = exclude them
  }
}
```

## Response
```jsonc
{
  "suggestion_id": "<uuid>",
  "proposal": {
    "summary": "Drafted 6 assignments (1 needs a check before confirming).",
    "confidence": 0.82,
    "warnings": 1,
    "assignments": [
      { "shift_title": "BBQ", "role": "BBQ Helper", "volunteer_name": "Mark Davies",
        "confidence": 0.94, "needs_override": false,
        "reason": "Mark Davies — preferred role; hasn't helped in 5 weeks." },
      { "shift_title": "Goal umpire", "role": "Goal Umpire", "volunteer_name": "Liam O'Brien",
        "confidence": 0.45, "needs_override": true, "missing_checks": ["WWCC"],
        "reason": "⚠ Liam O'Brien — WWCC not valid. Needs admin override before confirming." }
    ]
  }
}
```

The client renders this in the "Build my roster" panel; **Approve** then writes
`volunteer_shift_assignments` (a tiny `approve-roster` function or a direct insert),
skipping or override-gating any `needs_override` pick.

## Guards
- **Entitlement:** server-side `vm_feature(club, 'ai_roster_builder')` — 403 if not in plan.
- **Compliance:** missing required checks are flagged (or excluded with `enforce_checks`).
- **Fairness:** recent/over-used volunteers are penalised; new + long-absent are boosted; max-shift caps respected.

## Deploy (click-by-click — for when you're ready)
1. Install the Supabase CLI and link the project:
   `supabase link --project-ref vzicgkqzkupyjzshiekk`
2. From the repo root: `supabase functions deploy build-roster`
3. (Optional) add the summary-polish key:
   `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`
   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.
4. Test from the dashboard (Edge Functions → build-roster → Invoke) with a real `club_id`.

## Depends on the schema alignment
Reads `people` as the person directory (club_users is staff only) and the
`volunteer_*` tables. Run the consolidated `sportsweb_volunteer_manager.sql` first.
