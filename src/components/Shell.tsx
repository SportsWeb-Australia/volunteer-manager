import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { T, F } from "../lib/theme";
import { Icon } from "./ui";
import { useApp } from "../context/AppContext";
import { useEntitlement } from "../hooks/useEntitlement";
import { VOneLogo } from "./Logo";

const NAV: [string, string, string][] = [
  ["Dashboard", "/", "grid"],
  ["Volunteer People", "/people", "people"],
  ["Roles & Descriptions", "/roles", "role"],
  ["Volunteer Sign-ups", "/opportunities", "mega"],
  ["Rosters & Shifts", "/rosters", "cal"],
  ["Game Day Jobs", "/game-day", "whistle"],
  ["Events", "/events", "spark"],
  ["Compliance", "/compliance", "shield"],
  ["Onboarding & Training", "/onboarding", "onboard"],
  ["Communications", "/comms", "chat"],
  ["Recognition", "/recognition", "award"],
  ["Surveys & Feedback", "/surveys", "survey"],
  ["Reports", "/reports", "report"],
  ["Plan & Billing", "/billing", "card"],
  ["Settings", "/settings", "cog"],
  ["Help & Guide", "/help", "help"],
];

function Brand({ mini }: { mini?: boolean }) {
  return <VOneLogo light mark={mini ? 30 : 36} word={mini ? 17 : 19} tagline={!mini} />;
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 2 }}>
      {NAV.map(([label, to, icon]) => (
        <NavLink key={to} to={to} end={to === "/"} onClick={onNavigate}
          style={({ isActive }) => ({
            display: "flex", alignItems: "center", gap: 11, padding: "9px 11px", borderRadius: 10,
            textDecoration: "none", fontSize: 13.5, fontWeight: isActive ? 600 : 500,
            background: isActive ? T.brand : "transparent", color: isActive ? "#fff" : T.mutedNavy,
          })}>
          {({ isActive }) => <><Icon n={icon} s={18} c={isActive ? "#fff" : T.mutedNavy} />{label}</>}
        </NavLink>
      ))}
    </nav>
  );
}

function ViewerSwitch() {
  const { viewer, setViewer } = useApp();
  return (
    <div style={{ marginTop: 22, borderTop: `1px solid ${T.lineDark}`, paddingTop: 16 }}>
      <div className="mono" style={{ fontSize: 9.5, letterSpacing: ".14em", color: T.mutedNavy, marginBottom: 9 }}>VIEWING AS</div>
      <div style={{ display: "flex", background: T.navy2, borderRadius: 10, padding: 3 }}>
        {(["manager", "volunteer"] as const).map(k => (
          <button key={k} onClick={() => setViewer(k)} style={{ flex: 1, border: "none", borderRadius: 8, padding: "7px 6px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", background: viewer === k ? T.brand : "transparent", color: viewer === k ? "#fff" : T.mutedNavy }}>
            {k === "manager" ? "Manager" : "Volunteer"}
          </button>
        ))}
      </div>
    </div>
  );
}

function PlanBadge() {
  const { plan } = useEntitlement();
  const nav = useNavigate();
  if (!plan) return null;
  const label = plan.replace("vm_", "").replace(/^\w/, c => c.toUpperCase());
  return (
    <button onClick={() => nav("/billing")} style={{ marginTop: 14, width: "100%", border: `1px solid ${T.lineDark}`, background: T.navy2, color: T.mutedNavy, borderRadius: 10, padding: "8px 11px", fontSize: 11.5, textAlign: "left", cursor: "pointer", fontFamily: F.mono, letterSpacing: ".04em" }}>
      PLAN · {label.toUpperCase()}
    </button>
  );
}

export function Shell() {
  const [open, setOpen] = useState(false);
  return (
    <div className="shell" style={{ display: "flex", minHeight: "100vh" }}>
      <aside className="desktop-nav" style={{ width: 252, background: T.navy, flex: "0 0 252px", padding: "20px 14px", position: "sticky", top: 0, alignSelf: "flex-start", height: "100vh", overflowY: "auto" }}>
        <Brand />
        <NavList />
        <PlanBadge />
        <ViewerSwitch />
      </aside>

      <div className="mobtop" style={{ display: "none", alignItems: "center", justifyContent: "space-between", background: T.navy, padding: "12px 16px", position: "sticky", top: 0, zIndex: 30 }}>
        <Brand mini />
        <button onClick={() => setOpen(true)} style={{ background: "transparent", border: "none", cursor: "pointer" }}><Icon n="menu" c="#fff" s={24} /></button>
      </div>

      <main className="main-pad sw-scroll" style={{ flex: 1, padding: 28, minWidth: 0 }}>
        <Outlet />
      </main>

      {open && (
        <div className="mobdrawer scrim" onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(7,12,22,.55)", zIndex: 50, display: "flex" }}>
          <div className="drawer" onClick={e => e.stopPropagation()} style={{ width: 270, background: T.navy, padding: "20px 14px", height: "100%", overflowY: "auto" }}>
            <Brand />
            <NavList onNavigate={() => setOpen(false)} />
            <PlanBadge />
            <ViewerSwitch />
          </div>
        </div>
      )}
    </div>
  );
}
