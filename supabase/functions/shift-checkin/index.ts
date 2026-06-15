// supabase/functions/shift-checkin/index.ts
// SportsWeb One — Volunteer Manager · NFC / QR shift check-in (Phase C)
// ---------------------------------------------------------------------
// Powers a tap (NFC tag) or scan (QR) at the ground — no login. Both media
// resolve to the same URL; the only difference is the physical artifact the
// club deploys. A reusable club tag uses ?c=<club check_in_token>; a per-shift
// QR on the run sheet uses ?s=<shift check_in_token>.
//
// Identifies the volunteer by mobile, finds their assignment (the named shift,
// or their next shift today), and marks it checked_in. Gated by the club's
// check_in_method setting (off = disabled).
//
// Deploy:  supabase functions deploy shift-checkin --no-verify-jwt

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const digits = (s: string) => (s ?? "").replace(/\D/g, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "POST only" });

  try {
    const { club_token, shift_token, mobile } = await req.json() as
      { club_token?: string; shift_token?: string; mobile?: string };
    if (!club_token && !shift_token) return json(400, { error: "missing check-in code" });
    if (!mobile || digits(mobile).length < 8) return json(400, { error: "Please enter the mobile number you signed up with." });

    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // resolve club (and a specific shift, if a per-shift code was used)
    let clubId: string | null = null; let targetShift: any = null;
    if (shift_token) {
      const { data } = await db.from("volunteer_shifts").select("id,club_id,title,start_time,shift_date,status").eq("check_in_token", shift_token).maybeSingle();
      if (!data) return json(404, { error: "This check-in code wasn't found." });
      clubId = data.club_id; targetShift = data;
    } else {
      const { data } = await db.from("volunteer_settings").select("club_id,check_in_method").eq("check_in_token", club_token!).maybeSingle();
      if (!data) return json(404, { error: "This check-in code wasn't found." });
      clubId = data.club_id;
    }

    // is check-in switched on?
    const { data: setting } = await db.from("volunteer_settings").select("check_in_method").eq("club_id", clubId!).maybeSingle();
    if (!setting || setting.check_in_method === "off") return json(403, { error: "Check-in isn't switched on for this club." });

    // match the volunteer by mobile
    const want = digits(mobile);
    const { data: vols } = await db.from("volunteers")
      .select("id, person:people(mobile, full_name)").eq("club_id", clubId!);
    const me = (vols ?? []).find((v: any) => {
      const m = digits(v.person?.mobile ?? "");
      return m && (m === want || m.endsWith(want.slice(-9)) || want.endsWith(m.slice(-9)));
    });
    if (!me) return json(404, { error: "We couldn't find that mobile. Check the number, or ask a coordinator." });

    // find the assignment to check in
    let assignment: any = null; let shiftLabel = "";
    if (targetShift) {
      const { data } = await db.from("volunteer_shift_assignments")
        .select("id,status").eq("shift_id", targetShift.id).eq("volunteer_id", me.id).maybeSingle();
      assignment = data; shiftLabel = `${targetShift.title}${targetShift.start_time ? " · " + String(targetShift.start_time).slice(0,5) : ""}`;
    } else {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await db.from("volunteer_shift_assignments")
        .select("id,status, shift:volunteer_shifts(title,start_time,shift_date)")
        .eq("volunteer_id", me.id).order("created_at", { ascending: true });
      const todays = (data ?? []).filter((a: any) => a.shift?.shift_date === today);
      const pick = todays.find((a: any) => !["checked_in", "completed", "cancelled"].includes(a.status)) ?? todays[0];
      if (pick) { assignment = pick; shiftLabel = `${pick.shift?.title}${pick.shift?.start_time ? " · " + String(pick.shift.start_time).slice(0,5) : ""}`; }
    }

    if (!assignment) return json(404, { error: "No shift found for you today. If you just put your hand up, a coordinator may not have rostered you yet." });
    if (assignment.status === "checked_in") return json(200, { ok: true, already: true, shift: shiftLabel, name: (me as any).person?.full_name });

    await db.from("volunteer_shift_assignments").update({ status: "checked_in", check_in_at: new Date().toISOString() }).eq("id", assignment.id);
    return json(200, { ok: true, shift: shiftLabel, name: (me as any).person?.full_name });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : String(e) });
  }
});
