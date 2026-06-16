import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client for reading published club content.
 *
 * Values come from Vite env vars in production (set these in Vercel):
 *   VITE_SUPABASE_URL       e.g. https://uzibfawcwoapfbigpzum.supabase.co
 *   VITE_SUPABASE_ANON_KEY  the publishable key, sb_publishable_… (safe in the
 *                           browser; RLS-protected). Accepts a legacy anon key too.
 *
 * If env vars aren't set, we fall back to the SportsWeb One project so the site
 * works out of the box. The publishable key is public by design — never put the
 * service-role / secret key in front-end code.
 */
const FALLBACK_URL = "https://uzibfawcwoapfbigpzum.supabase.co";
const FALLBACK_PUBLISHABLE_KEY = "sb_publishable_bxaxVOhm9-9wyRrsvJG7Sw_MxAZ-egN";

const url = import.meta.env.VITE_SUPABASE_URL ?? FALLBACK_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? FALLBACK_PUBLISHABLE_KEY;

/** Which club this site is for. Set VITE_CLUB_SLUG per deployment. */
export const CLUB_SLUG = import.meta.env.VITE_CLUB_SLUG ?? "dookie-united";

export const supabase =
  url && anonKey ? createClient(url, anonKey, { auth: { persistSession: false } }) : null;
