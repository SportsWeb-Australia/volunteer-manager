// supabase/functions/create-checkout/index.ts
// Starts a hosted-checkout session for an SMS pack (or plan, later) and returns
// a redirect URL. Provider-agnostic: PAYMENT_PROVIDER selects the adapter. Stays
// inert (configured:false) until a provider + keys are set, so the UI degrades
// gracefully.
//
// Deploy:  supabase functions deploy create-checkout
// Secrets (Stripe): PAYMENT_PROVIDER=stripe, STRIPE_SECRET_KEY
//   On success the provider webhook hits payment-webhook, which grants the pack.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

interface Body {
  club_id: string;
  kind: "sms_pack" | "plan";
  sms_count?: number;
  plan_key?: string;
  amount?: number;        // AUD
  success_url?: string;
  cancel_url?: string;
}

// --- Stripe adapter (one-time SMS pack) -----------------------------------
async function stripeCheckout(b: Body): Promise<{ url?: string; error?: string }> {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) return { error: "STRIPE_SECRET_KEY not set" };
  const amountCents = Math.round((b.amount ?? 0) * 100);
  if (b.kind !== "sms_pack" || !amountCents) return { error: "only one-time sms_pack checkout is implemented" };

  const form = new URLSearchParams();
  form.set("mode", "payment");
  form.set("success_url", b.success_url ?? "https://volunteer-manager-e8ti.vercel.app/billing");
  form.set("cancel_url", b.cancel_url ?? "https://volunteer-manager-e8ti.vercel.app/billing");
  form.set("line_items[0][quantity]", "1");
  form.set("line_items[0][price_data][currency]", "aud");
  form.set("line_items[0][price_data][unit_amount]", String(amountCents));
  form.set("line_items[0][price_data][product_data][name]", `VolunteerOne SMS pack — ${b.sms_count} messages`);
  form.set("metadata[club_id]", b.club_id);
  form.set("metadata[kind]", "sms_pack");
  form.set("metadata[sms_count]", String(b.sms_count ?? 0));

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  const d = await res.json().catch(() => ({}));
  return res.ok ? { url: d.url } : { error: d?.error?.message ?? `Stripe ${res.status}` };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "POST only" });

  try {
    const b = await req.json() as Body;
    if (!b.club_id || !b.kind) return json(400, { error: "club_id and kind are required" });

    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // caller must be club staff
    const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: au } = await db.auth.getUser(jwt);
    if (!au?.user) return json(401, { error: "not signed in" });
    const { data: staff } = await db.from("club_users").select("id").eq("club_id", b.club_id).eq("user_id", au.user.id).maybeSingle();
    if (!staff) return json(403, { error: "not a staff member of this club" });

    const provider = (Deno.env.get("PAYMENT_PROVIDER") || "").toLowerCase();
    if (provider === "stripe") {
      const r = await stripeCheckout(b);
      if (r.url) return json(200, { url: r.url });
      return json(500, { error: r.error ?? "checkout failed" });
    }
    // No provider configured yet — let the UI fall back gracefully.
    return json(200, { configured: false });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : String(e) });
  }
});
