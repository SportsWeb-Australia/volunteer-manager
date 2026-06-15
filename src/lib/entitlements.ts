// Feature + limit keys — must match the jsonb seeded in volunteer_plans.
// This is the single source of truth the UI gates against.

export type FeatureFlag =
  | "website_publish"
  | "channel_email"
  | "channel_sms"
  | "channel_push"
  | "ai_suggestions_basic"
  | "ai_comms_drafts"
  | "ai_roster_builder"
  | "automated_reminders"
  | "advanced_reports"
  | "exports"
  | "surveys"
  | "recognition_automation"
  | "sponsor_recognition"
  | "association_rollups"
  | "api_access";

export type LimitKey = "active_volunteers" | "seasons" | "teams";

export interface EffectiveFeatures {
  plan?: string;
  flags: Partial<Record<FeatureFlag, boolean>>;
  limits: Partial<Record<LimitKey, number | null>>;
}

// Friendly copy shown on the upgrade prompt for each gated feature.
export const FEATURE_LABELS: Partial<Record<FeatureFlag, string>> = {
  ai_roster_builder: "AI roster builder",
  channel_sms: "SMS messages",
  channel_push: "Web push notifications",
  automated_reminders: "Automated reminders",
  advanced_reports: "Advanced reports & exports",
  surveys: "Volunteer surveys",
  recognition_automation: "Recognition automation",
  sponsor_recognition: "Sponsor-backed recognition",
  association_rollups: "Association rollups",
  api_access: "API access",
};
