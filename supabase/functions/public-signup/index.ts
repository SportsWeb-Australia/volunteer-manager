// supabase/functions/public-signup/index.ts
// SportsWeb One — Volunteer Manager · public opportunity signup (Phase C)
// ---------------------------------------------------------------------
// Powers the QR / public link — no login needed. Looks up a PUBLIC opportunity
// by its signup_token and records a one-tap response as a volunteer_applications
// row (status 'new') for the manager to review. Runs as service_role so anon
// visitors can write through RLS safely (only this controlled path).
//
// Deploy:  supabase functions deploy public-signup --no-verify-jwt

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

const RESPONSES = ["hand_up", "ask_next_time", "occasional", "share_only", "offer_skill"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "POST only" });

  try {
    const body = await req.json() as {
      token: string; action?: "get" | "submit";
      name?: string; mobile?: string; email?: string; response?: string; message?: string;
    };
    if (!body.token) return json(400, { error: "token is required" });

    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: opp } = await db.from("volunteer_opportunities")
      .select("id,club_id,title,description,location,starts_at,visibility,status,volunteers_needed")
      .eq("signup_token", body.token).maybeSingle();
    if (!opp) return json(404, { error: "This volunteer link wasn't found." });
    if (opp.visibility !== "public") return json(403, { error: "This opportunity isn't open to public signup." });
    if (!["open", "draft"].includes(opp.status)) return json(409, { error: "This opportunity is closed." });

    // GET: return the public details for the signup page
    if ((body.action ?? "submit") === "get") {
      return json(200, { opportunity: { title: opp.title, description: opp.description, location: opp.location, starts_at: opp.starts_at } });
    }

    // SUBMIT: record the response
    const response = RESPONSES.includes(body.response ?? "") ? body.response : "hand_up";
    const { error } = await db.from("volunteer_applications").insert({
      club_id: opp.club_id, opportunity_id: opp.id, response,
      applicant_name: (body.name ?? "").slice(0, 120) || null,
      applicant_mobile: (body.mobile ?? "").slice(0, 30) || null,
      applicant_email: (body.email ?? "").slice(0, 160) || null,
      message: (body.message ?? "").slice(0, 1000) || null,
      status: "new",
    });
    if (error) return json(500, { error: "Could not record your response. Please try again." });

    return json(200, { ok: true, message: response === "hand_up" ? "You're in — thanks! The club will be in touch." : "Thanks — recorded." });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : String(e) });
  }
});
