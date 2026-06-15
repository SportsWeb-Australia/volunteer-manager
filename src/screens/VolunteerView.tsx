import { useState } from "react";
import { useApp } from "../context/AppContext";
import { Card, Btn, Pill, Icon } from "../components/ui";
import { T } from "../lib/theme";

/**
 * The member-facing experience. In production this reads the signed-in
 * person's own assignments, hours and open opportunities (RLS-scoped).
 * Kept airy and one-tap, per the brief's dual-experience rule.
 */
export function VolunteerView() {
  const { clubName, setViewer } = useApp();
  const [resp, setResp] = useState<Record<number, string>>({});
  const set = (i: number, v: string) => setResp(p => ({ ...p, [i]: v }));

  return (
    <div className="fade" style={{ maxWidth: 560, margin: "0 auto", padding: "28px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div className="eyebrow">{clubName ?? "Your club"}</div>
        <button onClick={() => setViewer("manager")} style={{ border: `1px solid ${T.line}`, background: "#fff", borderRadius: 999, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Manager view</button>
      </div>
      <h1 className="disp" style={{ fontSize: 30, margin: 0 }}>Hi there 👋</h1>
      <p style={{ color: T.muted, fontSize: 14.5, margin: "6px 0 18px" }}>Thanks for everything you do. Here's what's on.</p>

      <Card pad={16} style={{ marginBottom: 16, background: T.navy, borderColor: T.navy }}>
        <div className="eyebrow" style={{ color: T.mutedNavy, marginBottom: 8 }}>Your next shift</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div className="disp" style={{ fontSize: 22, color: "#fff" }}>BBQ · Saturday</div>
            <div style={{ fontSize: 13, color: T.mutedNavy, marginTop: 4 }}>9:00am–12:00pm · Oval gate</div>
          </div>
          <Btn kind="green" icon="check">Check in</Btn>
        </div>
      </Card>

      <div className="eyebrow" style={{ marginBottom: 10 }}>Can you help this weekend?</div>
      {[{ t: "Sunday canteen", w: "Sun · 8:30am · 1 hr" }, { t: "Finals BBQ", w: "Sat 5 Jul · 9:00am · 2 hrs" }].map((o, i) => (
        <Card key={i} pad={15} style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{o.t}</div>
          <div style={{ fontSize: 12.5, color: T.muted, margin: "4px 0 12px" }}>{o.w}</div>
          {resp[i]
            ? <Pill bg={resp[i] === "yes" ? T.greenSoft : "#EEE9DD"} fg={resp[i] === "yes" ? T.green : T.muted}>{resp[i] === "yes" ? "✓ You're in" : "Maybe next time"}</Pill>
            : (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Btn sm kind="green" icon="check" onClick={() => set(i, "yes")}>Put my hand up</Btn>
                <Btn sm kind="ghost" onClick={() => set(i, "later")}>Ask me next time</Btn>
              </div>
            )}
        </Card>
      ))}

      <Card pad={14} style={{ marginTop: 6, display: "flex", gap: 10, alignItems: "center", background: T.greenSoft, borderColor: "#CDE6D8" }}>
        <Icon n="shield" s={18} c={T.green} />
        <span style={{ fontSize: 13, color: "#0E5C3D" }}>Your checks are all up to date. Nice and easy.</span>
      </Card>
    </div>
  );
}
