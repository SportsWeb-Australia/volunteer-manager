// supabase/functions/notify/index.ts
// SportsWeb One — SHARED notification service. Any module (Ticket One,
// Registrations, VolunteerOne, …) calls this to send a transactional message to
// concrete recipient(s) on a channel. It does NOT do audience resolution — the
// caller already knows who to send to. Delivery + logging only.
//
// Auth: server-to-server. Send header  x-webhook-secret: <VM_WEBHOOK_SECRET>.
//
// Body:
//   {
//     "club_id":   "uuid",                  // for sender name + logging + push scope
//     "channel":   "email" | "sms" | "push",
//     "to":        "addr" | ["addr", ...],  // email addresses / mobiles (email & sms)
//     "subject":   "…",                     // email subject / push title
//     "body":      "…",                     // text body (required)
//     "html":      "<…>",                   // optional email HTML (else body is wrapped)
//     "from_name": "…",                     // optional email sender name (else club name)
//     "target_url":"…",                     // optional push click-through URL
//     "category":  "transactional"          // free text, stored for reporting
//   }
//
// Deploy:  supabase functions deploy notify
// Example (Ticket One, on order paid):
//   POST /functions/v1/notify  (x-webhook-secret: …)
//   { club_id, channel:"email", to:"buyer@x.com", subject:"Your tickets", body:"…" }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendSms, sendEmail, sendPush, type SendResult } from "../_shared/providers.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

const esc = (s: string) => (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const htmlBody = (s: string) => `<div style="font-family:system-ui,Arial,sans-serif;font-size:15px;line-height:1.55;color:#1F2328">${esc(s).replaceAll("\n", "<br>")}</div>`;

interface Body {
  club_id: string;
  channel: "email" | "sms" | "push";
  to?: string | string[];
  subject?: string;
  body: string;
  html?: string;
  from_name?: string;
  target_url?: string;
  category?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "POST only" });

  // server-to-server auth
  const expected = Deno.env.get("VM_WEBHOOK_SECRET");
  if (!expected || req.headers.get("x-webhook-secret") !== expected) return json(401, { error: "bad or missing x-webhook-secret" });

  try {
    const b = await req.json() as Body;
    if (!b.club_id || !b.channel || !b.body) return json(400, { error: "club_id, channel and body are required" });

    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const addrs = Array.isArray(b.to) ? b.to.filter(Boolean) : (b.to ? [b.to] : []);

    const results: SendResult[] = [];

    if (b.channel === "email") {
      if (!addrs.length) return json(400, { error: "email requires `to`" });
      const { data: clubRow } = await db.from("clubs").select("name").eq("id", b.club_id).maybeSingle();
      const fromName = b.from_name || (clubRow?.name as string) || undefined;
      for (const to of addrs) {
        results.push(await sendEmail(to, b.subject ?? "Update", b.html || htmlBody(b.body), undefined, fromName));
      }
    } else if (b.channel === "sms") {
      if (!addrs.length) return json(400, { error: "sms requires `to`" });
      const { data: cfg } = await db.from("volunteer_settings").select("sms_sender_id,sms_sender_status").eq("club_id", b.club_id).maybeSingle();
      const smsFrom = (cfg?.sms_sender_status === "approved" && cfg?.sms_sender_id) ? (cfg.sms_sender_id as string) : undefined;
      for (const to of addrs) results.push(await sendSms(to, b.body, smsFrom));
    } else if (b.channel === "push") {
      results.push(await sendPush(b.subject ?? "Update", b.body, b.target_url, b.club_id));
    } else {
      return json(400, { error: `unknown channel '${b.channel}'` });
    }

    const sent = results.filter(r => r.ok).length;
    const failed = results.length - sent;

    // best-effort shared log (won't block the send if club_messages isn't writable)
    try {
      await db.from("club_messages").insert({
        club_id: b.club_id, channels: [b.channel], subject: b.subject ?? null, body: b.body,
        audience: b.category ?? "transactional", recipient_count: results.length,
        status: failed && !sent ? "failed" : "sent",
      });
    } catch (_) { /* logging is best-effort */ }

    return json(200, { ok: sent > 0, sent, failed, results });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : String(e) });
  }
});
