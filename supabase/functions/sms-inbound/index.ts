// supabase/functions/sms-inbound/index.ts
// Inbound SMS handler for opt-out/opt-in keywords (STOP / START). Point your SMS
// provider's inbound webhook here with ?key=<VM_WEBHOOK_SECRET>. Handles Twilio
// (form-encoded From/Body) and JSON providers (ClickSend etc).
//
// Deploy:  supabase functions deploy sms-inbound --no-verify-jwt

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STOP = ["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT", "OPTOUT"];
const START = ["START", "UNSTOP", "YES", "OPTIN"];
const ok = () => new Response("", { status: 200 });

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });
  const url = new URL(req.url);
  if (url.searchParams.get("key") !== Deno.env.get("VM_WEBHOOK_SECRET")) return new Response("forbidden", { status: 403 });

  try {
    const ct = req.headers.get("content-type") ?? "";
    let from: string | undefined, body: string | undefined;
    if (ct.includes("application/x-www-form-urlencoded")) {
      const f = new URLSearchParams(await req.text());           // Twilio
      from = f.get("From") ?? undefined; body = f.get("Body") ?? undefined;
    } else {
      const j = await req.json().catch(() => ({})) as any;        // ClickSend / JSON
      from = j?.from ?? j?.From ?? j?.source ?? j?.[0]?.from;
      body = j?.body ?? j?.Body ?? j?.message ?? j?.[0]?.body;
    }
    const word = (body ?? "").trim().toUpperCase().split(/\s+/)[0];
    if (!from || !word) return ok();

    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    if (STOP.includes(word)) await db.rpc("vm_marketing_opt_out_by_mobile", { p_mobile: from });
    else if (START.includes(word)) await db.rpc("vm_marketing_opt_in_by_mobile", { p_mobile: from });
    return ok();
  } catch {
    return ok(); // never error back to the provider
  }
});
