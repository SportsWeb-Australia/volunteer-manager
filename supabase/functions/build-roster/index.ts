// supabase/functions/build-roster/index.ts
// SportsWeb One — Volunteer Manager · AI roster builder (Phase C)
// ---------------------------------------------------------------------
// Generates a FAIR draft roster from who's available, with a plain-English
// reason for every pick. It does NOT assign anyone: it writes a
// volunteer_ai_suggestions row (status='needs_review') and returns the
// proposal. The manager approves in the UI, which then creates assignments.
//
// Guardrails honoured:
//   - Entitlement checked server-side (ai_roster_builder must be in the plan).
//   - Compliance gate: a pick missing a required check is FLAGGED and capped
//     low — never silently confirmed into a restricted role.
//   - Deterministic, explainable scoring (no hallucinated compliance). An
//     optional LLM call only rephrases the human summary, never the matching.
//
// SCHEMA NOTE: aligned to the real SportsWeb One core. The person directory
// is `people` (club_users is staff/admins only). Volunteer name is resolved
// from `people`. No seasons/fixtures dependency.
//
// Deploy:  supabase functions deploy build-roster
// Secrets: SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY are auto-injected.
//          ANTHROPIC_API_KEY is optional (summary polish only).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

interface Options {
  avoid_recent_weeks?: number;   // penalise anyone rostered within this window (default 4)
  include_team_ids?: string[];   // bias toward volunteers tied to these teams
  prioritise_new?: boolean;      // boost first-timers
  enforce_checks?: boolean;      // hard-block picks missing required checks (default false = flag only)
}

const NAME_FIELDS = ["full_name", "name", "display_name", "first_name"];
const nameOf = (u: Record<string, unknown> | undefined) => {
  if (!u) return "Volunteer";
  for (const f of NAME_FIELDS) if (typeof u[f] === "string" && u[f]) return u[f] as string;
  return "Volunteer";
};
const weeksSince = (iso: string | null) =>
  iso ? Math.floor((Date.now() - new Date(iso).getTime()) / (7 * 864e5)) : 99;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "POST only" });

  try {
    const { club_id, roster_id, options = {} } = await req.json() as
      { club_id: string; roster_id?: string; options?: Options };
    if (!club_id) return json(400, { error: "club_id is required" });

    const opt: Required<Options> = {
      avoid_recent_weeks: options.avoid_recent_weeks ?? 4,
      include_team_ids: options.include_team_ids ?? [],
      prioritise_new: options.prioritise_new ?? true,
      enforce_checks: options.enforce_checks ?? false,
    };

    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // --- entitlement gate (server-side, not just UI) --------------------
    const { data: allowed, error: gateErr } = await db.rpc("vm_feature", {
      p_club: club_id, p_key: "ai_roster_builder",
    });
    if (gateErr) return json(500, { error: "entitlement check failed", detail: gateErr.message });
    if (!allowed) return json(403, { error: "ai_roster_builder is not in this club's plan" });

    // --- load shifts to fill -------------------------------------------
    let q = db.from("volunteer_shifts")
      .select("id,title,role_id,team_id,volunteers_needed,status,role:volunteer_roles(title,required_checks)")
      .eq("club_id", club_id);
    q = roster_id ? q.eq("roster_id", roster_id) : q.in("status", ["draft", "open"]);
    const { data: shifts, error: shiftErr } = await q;
    if (shiftErr) return json(500, { error: "could not load shifts", detail: shiftErr.message });
    if (!shifts?.length) return json(200, { proposal: { assignments: [], note: "No open shifts to fill." } });

    const shiftIds = shifts.map((s) => s.id);

    // --- current assignments (to know fill level + exclude) -------------
    const { data: existing } = await db.from("volunteer_shift_assignments")
      .select("shift_id,volunteer_id,status").in("shift_id", shiftIds);
    const filledBy = new Map<string, Set<string>>();
    for (const a of existing ?? []) {
      if (!filledBy.has(a.shift_id)) filledBy.set(a.shift_id, new Set());
      if (a.status !== "declined" && a.status !== "cancelled") filledBy.get(a.shift_id)!.add(a.volunteer_id);
    }

    // --- candidate volunteers + profiles --------------------------------
    const { data: vols } = await db.from("volunteers")
      .select("id,person_id,status,volunteer_profiles(preferred_roles,preferred_team_ids,max_shifts_week)")
      .eq("club_id", club_id).in("status", ["active", "approved"]);
    if (!vols?.length) return json(200, { proposal: { assignments: [], note: "No active volunteers to roster yet." } });

    // names from the People Hub (people); club_users is staff only
    const personIds = [...new Set(vols.map((v) => v.person_id).filter(Boolean))];
    const { data: users } = await db.from("people").select("id,full_name,first_name,last_name").in("id", personIds);
    const userById = new Map((users ?? []).map((u) => [u.id, u]));

    // compliance map per volunteer
    const { data: comp } = await db.from("volunteer_compliance_records")
      .select("volunteer_id,check_type,status").eq("club_id", club_id);
    const compBy = new Map<string, Map<string, string>>();
    for (const c of comp ?? []) {
      if (!compBy.has(c.volunteer_id)) compBy.set(c.volunteer_id, new Map());
      compBy.get(c.volunteer_id)!.set(c.check_type, c.status);
    }

    // recency / load
    const { data: hist } = await db.from("volunteer_shift_assignments")
      .select("volunteer_id,created_at").eq("club_id", club_id);
    const lastBy = new Map<string, string | null>();
    const recentCount = new Map<string, number>();
    const cutoff = Date.now() - opt.avoid_recent_weeks * 7 * 864e5;
    for (const h of hist ?? []) {
      const prev = lastBy.get(h.volunteer_id);
      if (!prev || (h.created_at && h.created_at > prev)) lastBy.set(h.volunteer_id, h.created_at);
      if (h.created_at && new Date(h.created_at).getTime() >= cutoff)
        recentCount.set(h.volunteer_id, (recentCount.get(h.volunteer_id) ?? 0) + 1);
    }

    // --- score & assign --------------------------------------------------
    const proposedCount = new Map<string, number>(); // within this run, for max-shift cap
    const assignments: Array<Record<string, unknown>> = [];

    for (const shift of shifts) {
      const need = (shift.volunteers_needed ?? 1) - (filledBy.get(shift.id)?.size ?? 0);
      if (need <= 0) continue;
      // @ts-expect-error embed shape
      const required: string[] = shift.role?.required_checks ?? [];
      const roleTitle: string = (shift as any).role?.title ?? shift.title;

      const scored = vols
        .filter((v) => !(filledBy.get(shift.id)?.has(v.id)))
        .map((v) => {
          // @ts-expect-error embed shape
          const prof = v.volunteer_profiles ?? {};
          const prefRoles: string[] = prof.preferred_roles ?? [];
          const prefTeams: string[] = prof.preferred_team_ids ?? [];
          const maxWeek: number | null = prof.max_shifts_week ?? null;
          const used = (recentCount.get(v.id) ?? 0) + (proposedCount.get(v.id) ?? 0);
          const last = weeksSince(lastBy.get(v.id) ?? null);
          const isNew = !lastBy.get(v.id);

          // compliance gate
          const cmap = compBy.get(v.id) ?? new Map();
          const missing = required.filter((c) => (cmap.get(c) ?? "missing") !== "valid");

          let score = 0.5;
          const reasons: string[] = [];
          if (prefRoles.some((r) => r.toLowerCase() === roleTitle.toLowerCase())) { score += 0.2; reasons.push("preferred role"); }
          if (opt.include_team_ids.length && prefTeams.some((t) => opt.include_team_ids.includes(t))) { score += 0.12; reasons.push("linked to this team"); }
          if (last >= opt.avoid_recent_weeks) { score += Math.min(0.2, last * 0.02); reasons.push(`hasn't helped in ${last} weeks`); }
          score -= Math.min(0.3, used * 0.12); // fairness: spread the load
          if (used >= 2) reasons.push("already busy this period");
          if (isNew && opt.prioritise_new) { score += 0.15; reasons.push("new volunteer — good to bring in"); }

          const overCap = maxWeek != null && used >= maxWeek;
          let warn = false;
          if (missing.length) { warn = true; score = Math.min(score, 0.45); reasons.push(`${missing.join(", ")} not valid`); }

          return { v, score: Math.max(0, Math.min(1, score)), reasons, missing, warn, overCap, last, isNew };
        })
        .filter((c) => !c.overCap && !(opt.enforce_checks && c.missing.length))
        .sort((a, b) => b.score - a.score);

      for (const pick of scored.slice(0, need)) {
        proposedCount.set(pick.v.id, (proposedCount.get(pick.v.id) ?? 0) + 1);
        const who = nameOf(userById.get(pick.v.person_id) as Record<string, unknown>);
        const reason = pick.warn
          ? `⚠ ${who} — ${pick.reasons.join("; ")}. Needs admin override before confirming.`
          : `${who} — ${pick.reasons.join("; ") || "available and a good fit"}.`;
        assignments.push({
          shift_id: shift.id, shift_title: shift.title, role: roleTitle,
          volunteer_id: pick.v.id, volunteer_name: who,
          confidence: Number(pick.score.toFixed(2)),
          assignment_type: pick.warn ? "proposed" : "assigned",
          needs_override: pick.warn, missing_checks: pick.missing,
          reason,
        });
      }
    }

    const avg = assignments.length
      ? assignments.reduce((s, a) => s + (a.confidence as number), 0) / assignments.length : 0;
    const warnings = assignments.filter((a) => a.needs_override).length;

    let summary = `Drafted ${assignments.length} assignment${assignments.length === 1 ? "" : "s"}` +
      (warnings ? ` (${warnings} need a check before confirming)` : "") + ".";

    // optional: humanise the summary with the LLM (never touches the matching)
    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (key && assignments.length) {
      try {
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001", max_tokens: 120,
            messages: [{ role: "user", content:
              `Write one warm, plain sentence for a volunteer coordinator summarising this draft roster. ` +
              `${assignments.length} picks, ${warnings} need a compliance check first. No emojis. Just the sentence.` }],
          }),
        });
        const d = await r.json();
        const t = d?.content?.[0]?.text?.trim();
        if (t) summary = t;
      } catch (_) { /* keep deterministic summary */ }
    }

    // write the suggestion for human review (the guardrail)
    const { data: suggestion, error: insErr } = await db.from("volunteer_ai_suggestions").insert({
      club_id, type: "roster", title: "Draft roster ready for review", summary,
      payload: { roster_id: roster_id ?? null, options: opt, assignments },
      confidence: Number(avg.toFixed(3)), status: "needs_review", created_by: null,
    }).select("id").single();
    if (insErr) return json(500, { error: "could not save suggestion", detail: insErr.message });

    return json(200, {
      suggestion_id: suggestion?.id,
      proposal: { summary, confidence: Number(avg.toFixed(2)), warnings, assignments },
    });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : String(e) });
  }
});
