// supabase/functions/message-webhook/index.ts
// SportsWeb One — Volunteer Manager · delivery tracking (Phase C)
// ---------------------------------------------------------------------
// Receives provider delivery callbacks and updates volunteer_message_recipients
// by provider_message_id. Handles Twilio (form-encoded status callbacks) and
// ZeptoMail (JSON events). WebPushr is send-to-all, so it has no per-recipient
// callback here.
//
// Point your providers at:
//   https://<project>.functions.supabase.co/message-webhook?key=<VM_WEBHOOK_SECRET>
//   - Twilio: set this as the Status Callback URL on the number/messaging service.
//   - ZeptoMail: add it as a webhook in the ZeptoMail console.
//
// Deploy:  supabase functions deploy message-webhook --no-verify-jwt
// (no-verify-jwt because providers can't send a Supabase JWT; we guard with ?key)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ok = () => new Response("ok", { status: 200 });

// Twilio MessageStatus -> our recipient status
const TWILIO: Record<string, string> = {
  queued: "queued", sent: "sent", delivered: "delivered",
  undelivered: "failed", failed: "failed",
};
// ZeptoMail event -> our status
const ZEPTO: Record<string, string> = {
  email_open: "opened", open: "opened", click: "clicked", email_click: "clicked",
  softbounce: "bounced", hardbounce: "bounced", bounce: "bounced", spam: "bounced",
};
// ClickSend delivery-receipt status -> our status
const CLICKSEND: Record<string, string> = {
  delivered: "delivered", sent: "sent", queued: "queued",
  undelivered: "failed", failed: "failed", bounced: "failed",
  "hard bounce": "failed", "soft bounce": "failed", rejected: "failed",
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });

  const url = new URL(req.url);
  if (url.searchParams.get("key") !== Deno.env.get("VM_WEBHOOK_SECRET")) return new Response("forbidden", { status: 403 });

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const ct = req.headers.get("content-type") ?? "";

  try {
    let providerId: string | undefined; let status: string | undefined;
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = {};

    if (ct.includes("application/x-www-form-urlencoded")) {
      // Twilio
      const form = new URLSearchParams(await req.text());
      providerId = form.get("MessageSid") ?? form.get("SmsSid") ?? undefined;
      status = TWILIO[(form.get("MessageStatus") ?? "").toLowerCase()];
      if (status === "delivered") patch.delivered_at = now;
      if (status === "sent") patch.sent_at = now;
      if (status === "failed") patch.error = form.get("ErrorCode") ?? "undelivered";
    } else {
      // JSON providers: ZeptoMail (email events) + ClickSend (SMS delivery receipts)
      const body = await req.json().catch(() => ({})) as any;
      const ev = body?.event_name ?? body?.["event-name"] ?? body?.event ?? body?.[0]?.event;
      providerId = body?.message_id ?? body?.messageid ?? body?.request_id ?? body?.data?.message_id ?? body?.[0]?.message_id;
      status = ZEPTO[String(ev ?? "").toLowerCase()] ?? CLICKSEND[String(body?.status ?? "").toLowerCase()];
      if (status === "opened") patch.opened_at = now;
      if (status === "clicked") patch.clicked_at = now;
      if (status === "delivered") patch.delivered_at = now;
      if (status === "sent") patch.sent_at = now;
      if (status === "failed") patch.error = body?.error_text ?? body?.error_code ?? "undelivered";
    }

    if (providerId && status) {
      await db.from("volunteer_message_recipients")
        .update({ status, ...patch })
        .eq("provider_message_id", providerId);
    }
    return ok(); // always 200 so providers don't retry-storm
  } catch (_) {
    return ok();
  }
});
