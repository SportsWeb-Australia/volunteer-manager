// supabase/functions/payment-webhook/index.ts
// Receives the payment provider's success callback and grants what was bought
// (currently: SMS packs → credit balance). Point your provider's webhook here
// with ?key=<VM_WEBHOOK_SECRET>.
//
// NOTE: for production Stripe, add real signature verification (STRIPE_WEBHOOK_SECRET).
// The ?key guard is the interim protection.
//
// Deploy:  supabase functions deploy payment-webhook --no-verify-jwt

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ok = () => new Response("ok", { status: 200 });

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });
  const url = new URL(req.url);
  if (url.searchParams.get("key") !== Deno.env.get("VM_WEBHOOK_SECRET")) return new Response("forbidden", { status: 403 });

  try {
    const event = await req.json().catch(() => ({})) as any;
    // Stripe shape: { type, data: { object: { metadata, payment_status } } }
    const type = event?.type ?? "";
    const obj = event?.data?.object ?? event?.object ?? event;
    const paid = obj?.payment_status ? obj.payment_status === "paid" : true;
    const meta = obj?.metadata ?? event?.metadata ?? {};

    const completed = type === "checkout.session.completed" || type === "" /* non-Stripe */;
    if (completed && paid && meta?.kind === "sms_pack" && meta?.club_id) {
      const qty = Math.max(0, Math.floor(Number(meta.sms_count ?? 0)));
      if (qty) {
        const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        const { data: cur } = await db.from("volunteer_settings").select("sms_credit_balance").eq("club_id", meta.club_id).maybeSingle();
        const balance = (cur?.sms_credit_balance ?? 0) + qty;
        await db.from("volunteer_settings").update({ sms_credit_balance: balance }).eq("club_id", meta.club_id);
        await db.from("volunteer_sms_packs").insert({
          club_id: meta.club_id, sms_count: qty,
          amount_aud: obj?.amount_total != null ? Number(obj.amount_total) / 100 : null,
          source: "checkout",
        });
      }
    }
    return ok();
  } catch {
    return ok(); // never error back to the provider
  }
});
