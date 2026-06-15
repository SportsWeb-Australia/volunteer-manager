// supabase/functions/approve-roster/index.ts
// SportsWeb One — Volunteer Manager · commit an AI roster draft (Phase C)
// ---------------------------------------------------------------------
// The human-commits step that pairs with build-roster. Takes an AI suggestion
// (status='needs_review'), creates the actual volunteer_shift_assignments, and
// marks the suggestion 'actioned'. Picks flagged needs_override (missing a
// required check) are SKIPPED unless an authorised staffer passes
// include_overrides=true — that's the compliance gate holding.
//
// Deploy:  supabase functions deploy approve-roster

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

interface Pick { shift_id: string; volunteer_id: string; reason?: string; confidence?: number; needs_override?: boolean; assignment_type?: string; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "POST only" });

  try {
    const { suggestion_id, include_overrides = false } = await req.json() as { suggestion_id: string; include_overrides?: boolean };
    if (!suggestion_id) return json(400, { error: "suggestion_id is required" });

    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: sugg, error: sErr } = await db.from("volunteer_ai_suggestions")
      .select("id,club_id,payload,status").eq("id", suggestion_id).single();
    if (sErr || !sugg) return json(404, { error: "suggestion not found" });
    const club = sugg.club_id as string;

    // caller must be club staff
    const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: au } = await db.auth.getUser(jwt);
    if (!au?.user) return json(401, { error: "not signed in" });
    const { data: staff } = await db.from("club_users").select("id").eq("club_id", club).eq("user_id", au.user.id).maybeSingle();
    if (!staff) return json(403, { error: "not a staff member of this club" });

    const picks: Pick[] = ((sugg.payload as any)?.assignments ?? []);
    let created = 0; const skipped: string[] = []; const affected = new Set<string>();

    for (const p of picks) {
      if (p.needs_override && !include_overrides) { skipped.push(`${p.volunteer_id} (needs compliance override)`); continue; }
      const { error } = await db.from("volunteer_shift_assignments").insert({
        club_id: club, shift_id: p.shift_id, volunteer_id: p.volunteer_id,
        assignment_type: p.needs_override ? "proposed" : (p.assignment_type ?? "assigned"),
        ai_reason: p.reason, ai_confidence: p.confidence,
        override_check: Boolean(p.needs_override && include_overrides),
        override_by: p.needs_override && include_overrides ? au.user.id : null,
        status: "invited",
      });
      if (!error) { created++; affected.add(p.shift_id); }
      else if (!error.message.includes("duplicate")) skipped.push(`${p.volunteer_id} (${error.message})`);
    }

    // recompute shift fill status
    for (const shiftId of affected) {
      const { data: shift } = await db.from("volunteer_shifts").select("volunteers_needed").eq("id", shiftId).single();
      const { count } = await db.from("volunteer_shift_assignments")
        .select("*", { count: "exact", head: true }).eq("shift_id", shiftId).not("status", "in", "(declined,cancelled)");
      const need = shift?.volunteers_needed ?? 1;
      await db.from("volunteer_shifts").update({ status: (count ?? 0) >= need ? "filled" : "open" }).eq("id", shiftId);
    }

    await db.from("volunteer_ai_suggestions").update({
      status: "actioned", reviewed_by: au.user.id, reviewed_at: new Date().toISOString(),
    }).eq("id", suggestion_id);

    return json(200, { ok: true, created, skipped, shifts_updated: affected.size });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : String(e) });
  }
});
