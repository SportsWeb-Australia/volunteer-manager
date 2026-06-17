// supabase/functions/dispatch-message/index.ts
// SportsWeb One — Volunteer Manager · message dispatcher (Phase C)
// ---------------------------------------------------------------------
// Sends an APPROVED volunteer_messages row across its entitled channels via
// Twilio (SMS), Zoho ZeptoMail (email) and WebPushr (push). It records a
// volunteer_message_dispatches row per channel and a
// volunteer_message_recipients row per person (for SMS/email), then updates
// the message status. Delivery events (delivered/opened/bounced) are written
// later by provider webhooks — see the companion `message-webhook` note.
//
// Guardrails (this is the "human commits" side of the AI-prepares pattern):
//   - Caller must be a club_users staff member of the message's club.
//   - The message MUST be 'approved' (or a scheduled-approved) — never a draft,
//     when require_approval_before_send is on (default true).
//   - Each channel is checked against the club's plan (vm_feature). A channel
//     the plan doesn't include is skipped, not sent.
//   - Already-sent messages are not re-sent.
//
// Deploy:  supabase functions deploy dispatch-message
// Secrets: SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY auto-injected. Per channel:
//   Twilio:   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM
//   Email:    ZEPTOMAIL_TOKEN, ZEPTOMAIL_FROM (optional ZEPTOMAIL_HOST)
//   Push:     WEBPUSHR_KEY, WEBPUSHR_AUTH_TOKEN

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendSms, sendEmail, sendPush, type SendResult } from "./providers.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const CHANNEL_FLAG: Record<string, string> = {
  email: "channel_email", sms: "channel_sms", push: "channel_push",
};
const nameOf = (p: Record<string, unknown> | null | undefined) =>
  (p?.full_name as string) || (p?.first_name as string) || "there";
const fill = (tpl: string, who: string) => (tpl ?? "").replaceAll("{name}", who);
const esc = (s: string) => (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const htmlBody = (s: string) => `<div style="font-family:system-ui,Arial,sans-serif;font-size:15px;line-height:1.55;color:#15191E">${esc(s).replaceAll("\n", "<br>")}</div>`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "POST only" });

  try {
    const { message_id } = await req.json() as { message_id: string };
    if (!message_id) return json(400, { error: "message_id is required" });

    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // load the message
    const { data: msg, error: msgErr } = await db.from("volunteer_messages")
      .select("id,club_id,title,subject,body,channels,audience,status,category").eq("id", message_id).single();
    if (msgErr || !msg) return json(404, { error: "message not found" });
    const club = msg.club_id as string;

    // caller must be club staff
    const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: au } = await db.auth.getUser(jwt);
    if (!au?.user) return json(401, { error: "not signed in" });
    const { data: staff } = await db.from("club_users").select("id").eq("club_id", club).eq("user_id", au.user.id).maybeSingle();
    if (!staff) return json(403, { error: "not a staff member of this club" });

    // approval guardrail
    const { data: settings } = await db.from("volunteer_settings").select("require_approval_before_send").eq("club_id", club).maybeSingle();
    const requireApproval = settings?.require_approval_before_send ?? true;
    if (["sent", "sending", "cancelled"].includes(msg.status)) return json(409, { error: `message is already '${msg.status}'` });
    if (requireApproval && !["approved", "scheduled"].includes(msg.status))
      return json(403, { error: "message must be approved before sending" });

    // channels: requested ∩ entitled
    const requested: string[] = (msg.channels ?? []).map((c: string) => c.toLowerCase());
    const channels: string[] = [];
    const skipped: string[] = [];
    for (const ch of requested) {
      const flag = CHANNEL_FLAG[ch];
      if (!flag) { skipped.push(`${ch} (unsupported)`); continue; }
      const { data: ok } = await db.rpc("vm_feature", { p_club: club, p_key: flag });
      if (ok) channels.push(ch); else skipped.push(`${ch} (not in plan)`);
    }
    if (channels.length === 0) return json(403, { error: "no entitled channels to send on", skipped });

    await db.from("volunteer_messages").update({ status: "sending" }).eq("id", message_id);

    // resolve recipients (SMS/email need per-person contact; push goes to all subscribers)
    const aud = (msg.audience ?? {}) as { volunteer_ids?: string[]; statuses?: string[] };
    let vq = db.from("volunteers").select("id,person_id,status,person:people(full_name,first_name,email,mobile,sms_marketing_consent,email_marketing_consent,marketing_opt_out,unsubscribe_token)").eq("club_id", club);
    vq = aud.volunteer_ids?.length ? vq.in("id", aud.volunteer_ids) : vq.in("status", aud.statuses?.length ? aud.statuses : ["active"]);
    const { data: vols } = await vq;

    // SMS sender identity + allowance (Phase A metering). Fail-open if PATCH 3
    // isn't applied yet, so existing behaviour is never blocked by a missing meter.
    const { data: smsCfg } = await db.from("volunteer_settings")
      .select("sms_sender_id,sms_sender_status").eq("club_id", club).maybeSingle();
    const smsFrom = (smsCfg?.sms_sender_status === "approved" && smsCfg?.sms_sender_id)
      ? (smsCfg.sms_sender_id as string) : undefined; // else providers use the platform sender
    let smsRemaining = Number.POSITIVE_INFINITY;
    let smsMonthly = 0, smsUsedBefore = 0, smsCredits = 0;
    if (channels.includes("sms")) {
      const { data: quota } = await db.rpc("vm_sms_quota", { p_club: club });
      const q = quota as { remaining?: number; monthly?: number; used?: number; credits?: number } | null;
      if (q && typeof q.remaining === "number") {
        smsRemaining = q.remaining; smsMonthly = q.monthly ?? 0; smsUsedBefore = q.used ?? 0; smsCredits = q.credits ?? 0;
      }
    }
    const SMS_UNIT_COST = 0.08; // rough AUD per SMS, for usage/cost reporting
    const isMarketing = (msg.category ?? "operational") === "marketing";
    const FN_BASE = Deno.env.get("SUPABASE_URL")! + "/functions/v1";

    const results: Record<string, { sent: number; failed: number; provider_ref?: string; error?: string; over_allowance?: number }> = {};

    for (const ch of channels) {
      const provider = ch === "sms" ? "twilio" : ch === "email" ? "zeptomail" : "webpushr";
      const { data: dispatch } = await db.from("volunteer_message_dispatches")
        .insert({ club_id: club, message_id, channel: ch, provider, status: "sending" }).select("id").single();
      const dispatchId = dispatch?.id as string | undefined;
      let sent = 0, failed = 0, overQuota = 0, lastErr: string | undefined;

      if (ch === "push") {
        const r: SendResult = await sendPush(msg.title ?? msg.subject ?? "Club update", msg.body ?? "");
        r.ok ? sent++ : (failed++, lastErr = r.error);
        await db.from("volunteer_message_dispatches").update({
          status: r.ok ? "sent" : "failed", sent_at: new Date().toISOString(),
          provider_ref: r.providerId, error: r.error, stats: { sent, failed },
        }).eq("id", dispatchId!);
        results[ch] = { sent, failed, provider_ref: r.providerId, error: r.error };
        continue;
      }

      for (const v of vols ?? []) {
        const person = (v as any).person as Record<string, unknown> | null;
        const who = nameOf(person);
        const addr = ch === "sms" ? (person?.mobile as string) : (person?.email as string);
        if (!addr) continue;

        // Marketing requires per-channel consent and respects opt-out; operational bypasses.
        if (isMarketing) {
          if (person?.marketing_opt_out) continue;
          const consent = ch === "sms" ? person?.sms_marketing_consent : person?.email_marketing_consent;
          if (!consent) continue;
        }
        if (ch === "sms" && sent >= smsRemaining) { overQuota++; continue; } // SMS allowance reached

        const baseBody = fill(msg.body ?? "", who);
        const token = person?.unsubscribe_token as string | undefined;
        const r: SendResult = ch === "sms"
          ? await sendSms(addr, isMarketing ? `${baseBody}\nReply STOP to opt out.` : baseBody, smsFrom)
          : await sendEmail(addr, msg.subject ?? msg.title ?? "Club update",
              isMarketing
                ? htmlBody(baseBody) + `<div style="margin-top:16px;font-size:12px;color:#8A8F96">You're receiving club updates you opted in to. <a href="${FN_BASE}/unsubscribe?t=${token}" style="color:#00917A">Unsubscribe</a>.</div>`
                : htmlBody(baseBody), who);
        r.ok ? sent++ : (failed++, lastErr = r.error);

        await db.from("volunteer_message_recipients").insert({
          club_id: club, message_id, dispatch_id: dispatchId, volunteer_id: v.id, person_id: v.person_id,
          channel: ch, address: addr, provider_message_id: r.providerId, error: r.error,
          cost_estimate: ch === "sms" && r.ok ? SMS_UNIT_COST : null,
          status: r.ok ? "sent" : "failed", sent_at: r.ok ? new Date().toISOString() : null,
        });
      }

      await db.from("volunteer_message_dispatches").update({
        status: failed && !sent ? "failed" : "sent", sent_at: new Date().toISOString(),
        error: lastErr, stats: { sent, failed },
      }).eq("id", dispatchId!);
      if (overQuota > 0) skipped.push(`sms: ${overQuota} not sent (allowance reached)`);
      results[ch] = { sent, failed, error: lastErr, over_allowance: overQuota || undefined };
    }

    // Draw down purchased SMS credits for any sends beyond the monthly bundle.
    const smsSent = results["sms"]?.sent ?? 0;
    const fromCredits = Math.max(0, smsSent - Math.max(0, smsMonthly - smsUsedBefore));
    if (fromCredits > 0) {
      await db.from("volunteer_settings").update({
        sms_credit_balance: Math.max(0, smsCredits - fromCredits),
      }).eq("club_id", club);
    }

    // roll the message status up
    const totalSent = Object.values(results).reduce((s, r) => s + r.sent, 0);
    const totalFailed = Object.values(results).reduce((s, r) => s + r.failed, 0);
    const finalStatus = totalSent === 0 ? "failed" : totalFailed > 0 ? "partially_sent" : "sent";
    await db.from("volunteer_messages").update({ status: finalStatus, sent_at: new Date().toISOString() }).eq("id", message_id);

    return json(200, { status: finalStatus, channels: results, skipped, recipients: vols?.length ?? 0 });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : String(e) });
  }
});
