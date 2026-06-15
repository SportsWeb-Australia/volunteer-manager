// Hand-written types for the Volunteer Manager tables.
// Replace later with: supabase gen types typescript --project-id <ref>
// (see `npm run types`). Only the columns the app reads are typed here.

export type VolunteerStatus =
  | "prospect" | "applied" | "approved" | "active" | "paused" | "inactive" | "archived";

export interface Person {
  id: string;
  full_name: string | null;
  mobile: string | null;
  email: string | null;
}

export interface Volunteer {
  id: string;
  club_id: string;
  person_id: string;
  season_id: string | null;
  status: VolunteerStatus;
  volunteer_since: string | null;
  // joined
  person?: Person | null;
  profile?: VolunteerProfile | null;
}

export interface VolunteerProfile {
  id: string;
  volunteer_id: string;
  preferred_roles: string[] | null;
  preferred_team_ids: string[] | null;
  max_shifts_week: number | null;
  internal_tags: string[] | null;
  notes: string | null;
}

export interface VolunteerRole {
  id: string;
  club_id: string;
  title: string;
  category: string | null;
  risk_level: "low" | "medium" | "high";
  required_checks: string[] | null;
  reports_to: string | null;
  status: string;
}

export interface ComplianceRecord {
  id: string;
  volunteer_id: string;
  check_type: string;
  expires_on: string | null;
  status: "valid" | "expiring_soon" | "expired" | "not_required" | "missing" | "pending_review";
}

export interface AiSuggestion {
  id: string;
  type: string | null;
  title: string | null;
  summary: string | null;
  payload: Record<string, unknown>;
  confidence: number | null;
  status: "draft" | "needs_review" | "approved" | "dismissed" | "actioned";
}

export interface Shift {
  id: string;
  club_id: string;
  title: string;
  role_id: string | null;
  team_id: string | null;
  shift_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  volunteers_needed: number;
  status: "draft" | "open" | "filled" | "confirmed" | "completed" | "cancelled";
  check_in_token?: string | null;
}
