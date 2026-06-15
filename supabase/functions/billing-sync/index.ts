// supabase/functions/billing-sync/index.ts
// SportsWeb One — Volunteer Manager · entitlement sync (Phase C)
// ---------------------------------------------------------------------
// Single endpoint that grants/revokes Volunteer Manager for a club. It is the
// one place entitlement changes, fed by:
//   * STANDALONE  — your Zoho Billing / Stripe webhook (after a thin per-biller
//     adapter normalises the payload to the body below).
//   * BUNDLED      — a SportsWeb One "plan changed" call passing the new tier;
//     the matching VM plan (via included_in_sportsweb_tiers) is applied free.
//
// It writes the two things the gate reads: the `modules` row (enabled) and
// `volunteer_settings.plan_key`. Protected by a shared secret so only your
// servers can call it.
//
// Deploy:  supabase functions deploy billing-sync
// Secret:  supabase secrets set VM_WEBHOOK_SECRET=<long-random-string>

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

interface Body {
  club_id: string;
  action?: "activate" | "cancel";       // default activate
  plan_key?: string;                     // explicit tier (e.g. vm_club)
  sportsweb_tier?: string;               // OR resolve the plan from a SW1 tier
  source?: "standalone" | "bundled_sportsweb" | "trial" | "manual";
  biller?: string;                       // zoho_billing | stripe | bundled | manual
  biller_ref?: string;                   // external subscription id (stored in settings.config)
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "POST only" });

  // shared-secret guard
  const expected = Deno.env.get("VM_WEBHOOK_SECRET");
  if (!expected || req.headers.get("x-webhook-secret") !== expected) return json(401, { error: "bad or missing webhook secret" });

  try {
    const b = await req.json() as Body;
    if (!b.club_id) return json(400, { error: "club_id is required" });
    const action = b.action ?? "activate";

    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (action === "cancel") {
      await db.from("modules").update({ enabled: false })
        .eq("club_id", b.club_id).eq("module_name", "volunteers");
      // keep their settings row but drop to free so re-activation is clean
      await db.from("volunteer_settings").update({ plan_key: "vm_free" }).eq("club_id", b.club_id);
      return json(200, { ok: true, club_id: b.club_id, status: "cancelled" });
    }

    // resolve the plan
    let planKey = b.plan_key ?? null;
    if (!planKey && b.sportsweb_tier) {
      const { data: plan } = await db.from("volunteer_plans")
        .select("key,tier_rank").contains("included_in_sportsweb_tiers", [b.sportsweb_tier])
        .eq("status", "active").order("tier_rank", { ascending: false }).limit(1).maybeSingle();
      planKey = plan?.key ?? null;
    }
    if (!planKey) planKey = "vm_free";

    // enable the module (idempotent)
    const { error: modErr } = await db.from("modules")
      .upsert({ club_id: b.club_id, module_name: "volunteers", enabled: true, label: "Volunteer Manager" },
              { onConflict: "club_id,module_name" });
    if (modErr) return json(500, { error: "could not enable module", detail: modErr.message });

    // set the tier + record the billing source
    const cfg: Record<string, unknown> = {};
    if (b.source) cfg.source = b.source;
    if (b.biller) cfg.biller = b.biller;
    if (b.biller_ref) cfg.biller_ref = b.biller_ref;
    const { error: setErr } = await db.from("volunteer_settings")
      .upsert({ club_id: b.club_id, plan_key: planKey, config: cfg }, { onConflict: "club_id" });
    if (setErr) return json(500, { error: "could not set plan", detail: setErr.message });

    return json(200, { ok: true, club_id: b.club_id, status: "active", plan_key: planKey });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : String(e) });
  }
});
