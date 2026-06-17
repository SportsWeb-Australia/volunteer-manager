// supabase/functions/payment-webhook/index.ts
// Receives the payment provider's callback and grants what was bought:
//   sms_pack -> SMS credit balance;  plan -> enable module + set plan_key.
//
// Auth: if STRIPE_WEBHOOK_SECRET is set, the Stripe-Signature header is verified
// (HMAC-SHA256). Otherwise it falls back to a ?key=<VM_WEBHOOK_SECRET> guard.
//
// Deploy:  supabase functions deploy payment-webhook --no-verify-jwt
// Stripe:  add this URL as a webhook for `checkout.session.completed`, then set
//          STRIPE_WEBHOOK_SECRET to the signing secret.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ok = () => new Response("ok", { status: 200 });

async function verifyStripeSig(payload: string, header: string, secret: string): Promise<boolean> {
  try {
    const parts = Object.fromEntries(header.split(",").map(kv => kv.split("=")));
    const t = parts["t"]; const v1 = parts["v1"];
    if (!t || !v1) return false;
    const key = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${payload}`));
    const hex = [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
    return hex === v1;
  } catch { return false; }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });

  const raw = await req.text();
  const whSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const sig = req.headers.get("stripe-signature");
  let authed: boolean;
  if (whSecret && sig) authed = await verifyStripeSig(raw, sig, whSecret);
  else authed = new URL(req.url).searchParams.get("key") === Deno.env.get("VM_WEBHOOK_SECRET");
  if (!authed) return new Response("forbidden", { status: 403 });

  try {
    const event = JSON.parse(raw || "{}");
    const type = event?.type ?? "";
    const obj = event?.data?.object ?? event?.object ?? event;
    const paid = obj?.payment_status ? obj.payment_status === "paid" : true;
    const meta = obj?.metadata ?? event?.metadata ?? {};
    const completed = type === "checkout.session.completed" || type === ""; // "" = non-Stripe poke
    if (!completed || !paid || !meta?.club_id) return ok();

    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (meta.kind === "sms_pack") {
      const qty = Math.max(0, Math.floor(Number(meta.sms_count ?? 0)));
      if (qty) {
        const { data: cur } = await db.from("volunteer_settings").select("sms_credit_balance").eq("club_id", meta.club_id).maybeSingle();
        const balance = (cur?.sms_credit_balance ?? 0) + qty;
        await db.from("volunteer_settings").update({ sms_credit_balance: balance }).eq("club_id", meta.club_id);
        await db.from("volunteer_sms_packs").insert({
          club_id: meta.club_id, sms_count: qty,
          amount_aud: obj?.amount_total != null ? Number(obj.amount_total) / 100 : null,
          source: "checkout",
        });
      }
    } else if (meta.kind === "plan" && meta.plan_key) {
      await db.from("modules").upsert(
        { club_id: meta.club_id, module_name: "volunteers", enabled: true, label: "Volunteer Manager" },
        { onConflict: "club_id,module_name" },
      );
      // Paying now ends any trial cap.
      await db.from("volunteer_settings").upsert(
        { club_id: meta.club_id, plan_key: meta.plan_key, trial_ends_at: null },
        { onConflict: "club_id" },
      );
    }
    return ok();
  } catch {
    return ok(); // never error back to the provider
  }
});
