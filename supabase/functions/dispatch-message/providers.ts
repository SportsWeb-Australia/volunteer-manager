// supabase/functions/dispatch-message/providers.ts
// Channel adapters. Each returns { ok, providerId?, error? }. All secrets come
// from Edge Function env (Supabase Vault) — never from the database.

export interface SendResult { ok: boolean; providerId?: string; error?: string }

// --- SMS · Twilio ----------------------------------------------------------
// Env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM
//   TWILIO_FROM = a number (+61…) OR a Messaging Service SID (starts with "MG")
export async function sendSms(to: string, body: string, fromOverride?: string): Promise<SendResult> {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  // fromOverride = an approved club-branded sender ID; otherwise the registered
  // platform sender (TWILIO_FROM, e.g. "VOLUNTEER1").
  const from = fromOverride || Deno.env.get("TWILIO_FROM");
  if (!sid || !token || !from) return { ok: false, error: "Twilio env not set (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM)" };

  const form = new URLSearchParams({ To: to, Body: body });
  if (from.startsWith("MG")) form.set("MessagingServiceSid", from);
  else form.set("From", from);

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: "Basic " + btoa(`${sid}:${token}`), "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  const d = await res.json().catch(() => ({}));
  return res.ok ? { ok: true, providerId: d.sid } : { ok: false, error: d.message ?? `Twilio ${res.status}` };
}

// --- Email · Zoho ZeptoMail (transactional Zoho family) --------------------
// Env: ZEPTOMAIL_TOKEN ("Zoho-enczapikey …"), ZEPTOMAIL_FROM (verified sender),
//   optional ZEPTOMAIL_HOST (default api.zeptomail.com; .com.au / .eu etc per DC)
// Note: for bulk newsletters you'd route to Zoho Campaigns instead (list-based);
//   ZeptoMail is the right per-recipient sender for volunteer comms.
export async function sendEmail(to: string, subject: string, html: string, toName?: string): Promise<SendResult> {
  const token = Deno.env.get("ZEPTOMAIL_TOKEN");
  const from = Deno.env.get("ZEPTOMAIL_FROM");
  const host = Deno.env.get("ZEPTOMAIL_HOST") ?? "api.zeptomail.com";
  if (!token || !from) return { ok: false, error: "ZeptoMail env not set (ZEPTOMAIL_TOKEN / ZEPTOMAIL_FROM)" };

  const res = await fetch(`https://${host}/v1.1/email`, {
    method: "POST",
    headers: { Authorization: token, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      from: { address: from, name: "Club Volunteers" },
      to: [{ email_address: { address: to, name: toName ?? to } }],
      subject, htmlbody: html,
    }),
  });
  const d = await res.json().catch(() => ({}));
  return res.ok
    ? { ok: true, providerId: d?.data?.[0]?.message_id ?? d?.request_id }
    : { ok: false, error: d?.message ?? d?.error?.details?.[0]?.message ?? `ZeptoMail ${res.status}` };
}

// --- Web push · WebPushr (send to all subscribers / a segment) -------------
// Env: WEBPUSHR_KEY, WEBPUSHR_AUTH_TOKEN
// (Zoho PageSense push is an alternative; same shape — swap this adapter.)
export async function sendPush(title: string, message: string, targetUrl?: string): Promise<SendResult> {
  const key = Deno.env.get("WEBPUSHR_KEY");
  const auth = Deno.env.get("WEBPUSHR_AUTH_TOKEN");
  if (!key || !auth) return { ok: false, error: "WebPushr env not set (WEBPUSHR_KEY / WEBPUSHR_AUTH_TOKEN)" };

  const res = await fetch("https://api.webpushr.com/v1/notification/send/all", {
    method: "POST",
    headers: { "Content-Type": "application/json", "webpushr-key": key, "webpushr-auth-token": auth },
    body: JSON.stringify({ title, message, target_url: targetUrl ?? "" }),
  });
  const d = await res.json().catch(() => ({}));
  return res.ok ? { ok: true, providerId: String(d?.id ?? d?.data?.id ?? "") } : { ok: false, error: d?.description ?? `WebPushr ${res.status}` };
}
