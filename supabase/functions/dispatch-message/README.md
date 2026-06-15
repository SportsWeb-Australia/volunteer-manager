# dispatch-message (Edge Function)

Sends an **approved** `volunteer_messages` row across its entitled channels and
records what happened. This is the "human commits" half of the AI-prepares pattern:
nothing leaves the club until a person has approved the draft.

## Flow
1. Manager approves a draft in Communications → `volunteer_messages.status = 'approved'`.
2. Client calls `dispatch-message` with the `message_id`.
3. Function checks: caller is club staff → message is approved → each requested
   channel is in the club's plan (`vm_feature`).
4. For each entitled channel it writes a `volunteer_message_dispatches` row and,
   for SMS/email, a `volunteer_message_recipients` row per person; sends via the
   provider; updates the message to `sent` / `partially_sent` / `failed`.

## Channels & providers
| Channel | Provider | Model | Secrets |
|---|---|---|---|
| SMS | Twilio | per-recipient | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` |
| Email | Zoho ZeptoMail | per-recipient | `ZEPTOMAIL_TOKEN`, `ZEPTOMAIL_FROM`, opt `ZEPTOMAIL_HOST` |
| Push | WebPushr | send-to-all | `WEBPUSHR_KEY`, `WEBPUSHR_AUTH_TOKEN` |

Swap providers by editing `providers.ts` only (e.g. Zoho PageSense for push, or
Zoho Campaigns for bulk email newsletters instead of ZeptoMail).

## Request
```jsonc
POST /functions/v1/dispatch-message
{ "message_id": "<uuid>" }
```
Recipients come from the message's `audience`:
`{ "statuses": ["active"] }` (default) or `{ "volunteer_ids": ["<uuid>", …] }`.
`{name}` in the body is personalised per recipient.

## Response
```jsonc
{
  "status": "sent",
  "recipients": 24,
  "channels": { "sms": { "sent": 22, "failed": 2 }, "email": { "sent": 24, "failed": 0 } },
  "skipped": ["push (not in plan)"]
}
```

## Guardrails
- **Staff only** — caller must have a `club_users` row for the message's club.
- **Approved only** — refuses drafts while `require_approval_before_send` is on (default).
- **Plan-gated channels** — SMS/push send only if the plan includes them; others are skipped, listed in `skipped`.
- **No double-send** — a `sent`/`sending` message is rejected.

## Deploy
```
supabase functions deploy dispatch-message
supabase secrets set TWILIO_ACCOUNT_SID=… TWILIO_AUTH_TOKEN=… TWILIO_FROM=…
supabase secrets set ZEPTOMAIL_TOKEN='Zoho-enczapikey …' ZEPTOMAIL_FROM=you@club.org.au
supabase secrets set WEBPUSHR_KEY=… WEBPUSHR_AUTH_TOKEN=…
```
Set only the secrets for the channels you're using — a channel with missing env
simply reports an error for that channel and leaves the rest unaffected.

## Next: delivery tracking
A small `message-webhook` function will receive Twilio status callbacks and
ZeptoMail/WebPushr events and update `volunteer_message_recipients`
(delivered / opened / clicked / bounced / unsubscribed). Built alongside billing-sync.
