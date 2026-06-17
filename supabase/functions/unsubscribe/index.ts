// supabase/functions/unsubscribe/index.ts
// Public email unsubscribe link target. Sets marketing_opt_out on the person
// matched by their unsubscribe_token and returns a small confirmation page.
//
// Deploy:  supabase functions deploy unsubscribe --no-verify-jwt

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const page = (msg: string) => new Response(
  `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
   <title>VolunteerOne</title>
   <div style="font-family:system-ui,Arial,sans-serif;max-width:440px;margin:14vh auto;text-align:center;color:#1F2328;padding:0 18px">
     <div style="font-weight:800;font-size:22px;letter-spacing:-.01em">Volunteer<span style="color:#00BFA6">One</span></div>
     <p style="font-size:15px;line-height:1.6;margin-top:18px;color:#4b5563">${msg}</p>
   </div>`,
  { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
);

Deno.serve(async (req) => {
  const t = new URL(req.url).searchParams.get("t");
  if (!t) return page("This unsubscribe link is missing its code.");
  try {
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error } = await db.from("people")
      .update({ marketing_opt_out: true, marketing_opt_out_at: new Date().toISOString(), email_marketing_consent: false })
      .eq("unsubscribe_token", t);
    if (error) return page("Sorry — we couldn't process that just now. Please try again later.");
    return page("You've been unsubscribed from marketing emails. You'll still get essential club messages (rosters, shift reminders, check-in). You can close this page.");
  } catch {
    return page("Sorry — something went wrong. Please try again later.");
  }
});
