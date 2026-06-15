import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useEntitlement } from "../hooks/useEntitlement";
import { FEATURE_LABELS, type FeatureFlag } from "../lib/entitlements";
import { Card, Icon, Btn } from "./ui";
import { T } from "../lib/theme";

/**
 * Wrap any paid feature. When the club's plan includes it, children render.
 * Otherwise an upgrade prompt is shown (or a custom fallback).
 *
 *   <Gate feature="ai_roster_builder"><BuildMyRoster /></Gate>
 */
export function Gate({ feature, children, fallback }: { feature: FeatureFlag; children: ReactNode; fallback?: ReactNode }) {
  const { has, loading } = useEntitlement();
  if (loading) return null;
  if (has(feature)) return <>{children}</>;
  return <>{fallback ?? <UpgradePrompt feature={feature} />}</>;
}

export function UpgradePrompt({ feature, compact }: { feature: FeatureFlag; compact?: boolean }) {
  const nav = useNavigate();
  const label = FEATURE_LABELS[feature] ?? "this feature";
  if (compact) {
    return (
      <button onClick={() => nav("/billing")} style={{ display: "inline-flex", alignItems: "center", gap: 6, border: `1px solid ${T.amber}55`, background: T.amberSoft, color: T.amber, borderRadius: 999, padding: "5px 11px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
        <Icon n="lock" s={13} c={T.amber} />Upgrade for {label}
      </button>
    );
  }
  return (
    <Card pad={26} style={{ textAlign: "center", borderColor: "#EAD9AE", background: "#FDFBF4" }}>
      <div style={{ width: 48, height: 48, borderRadius: 14, background: T.amberSoft, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
        <Icon n="lock" s={22} c={T.amber} />
      </div>
      <div style={{ fontWeight: 700, fontSize: 17 }}>{label} is on the Club plan</div>
      <p style={{ fontSize: 13.5, color: T.muted, maxWidth: 420, margin: "8px auto 16px" }}>
        Upgrade to let the AI build fair rosters, send SMS & push, and automate reminders — or it's included free on your SportsWeb One plan.
      </p>
      <Btn icon="bolt" onClick={() => nav("/billing")}>See plans</Btn>
    </Card>
  );
}
