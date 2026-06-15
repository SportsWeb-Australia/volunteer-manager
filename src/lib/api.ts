import { supabase } from "./supabase";

export interface RosterPick {
  shift_id: string; shift_title: string; role: string;
  volunteer_id: string; volunteer_name: string;
  confidence: number; needs_override: boolean; missing_checks: string[]; reason: string;
}
export interface RosterProposal { summary: string; confidence: number; warnings: number; assignments: RosterPick[]; }

export async function buildRoster(club_id: string, options?: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("build-roster", { body: { club_id, options } });
  if (error) throw error;
  return data as { suggestion_id: string; proposal: RosterProposal };
}

export async function approveRoster(suggestion_id: string, include_overrides = false) {
  const { data, error } = await supabase.functions.invoke("approve-roster", { body: { suggestion_id, include_overrides } });
  if (error) throw error;
  return data as { ok: boolean; created: number; skipped: string[]; shifts_updated: number };
}

export async function dispatchMessage(message_id: string) {
  const { data, error } = await supabase.functions.invoke("dispatch-message", { body: { message_id } });
  if (error) throw error;
  return data as { status: string; recipients: number; channels: Record<string, { sent: number; failed: number }>; skipped: string[] };
}
