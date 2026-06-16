import { Routes, Route } from "react-router-dom";
import { useApp } from "./context/AppContext";
import { Shell } from "./components/Shell";
import { Loading, Card, Icon } from "./components/ui";
import { T } from "./lib/theme";

import { Dashboard } from "./screens/Dashboard";
import { People } from "./screens/People";
import { Roles } from "./screens/Roles";
import { Rosters } from "./screens/Rosters";
import { Communications } from "./screens/Communications";
import { Reports } from "./screens/Reports";
import { Compliance } from "./screens/Compliance";
import { Billing } from "./screens/Billing";
import { Opportunities } from "./screens/Opportunities";
import { PublicSignup } from "./screens/PublicSignup";
import { CheckIn } from "./screens/CheckIn";
import { Settings } from "./screens/Settings";
import { Login } from "./screens/Login";
import { VolunteerView } from "./screens/VolunteerView";
import { Stub } from "./screens/Stub";

function NoticeScreen({ title, body, icon }: { title: string; body: string; icon: string }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Card pad={32} style={{ maxWidth: 460, textAlign: "center" }}>
        <div style={{ width: 52, height: 52, borderRadius: 15, background: "#F4EEE2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}><Icon n={icon} s={24} c={T.navy} /></div>
        <h1 className="disp" style={{ fontSize: 24, margin: 0 }}>{title}</h1>
        <p style={{ color: T.muted, fontSize: 14.5, marginTop: 10 }}>{body}</p>
      </Card>
    </div>
  );
}

export function App() {
  const { ready, configured, signedIn, clubId, viewer } = useApp();

  // Public, unauthenticated pages (QR / NFC / shared link) — before any gate.
  if (window.location.pathname.startsWith("/v/")) return <PublicSignup />;
  if (window.location.pathname.startsWith("/checkin")) return <CheckIn />;

  if (!ready) return <Loading label="Starting Volunteer Manager…" />;
  if (!configured) return <NoticeScreen icon="cog" title="Connect Supabase" body="Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see .env.example), then reload." />;
  if (!signedIn) return <Login />;
  if (!clubId) return <NoticeScreen icon="people" title="No club found" body="Your account isn't linked to a club yet. Add a club_users row mapping your user to a club." />;

  // The volunteer/parent view is a single airy screen, not the manager shell.
  if (viewer === "volunteer") return <VolunteerView />;

  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Dashboard />} />
        <Route path="people" element={<People />} />
        <Route path="roles" element={<Roles />} />
        <Route path="opportunities" element={<Opportunities />} />
        <Route path="rosters" element={<Rosters />} />
        <Route path="game-day" element={<Stub title="Game Day Jobs" icon="whistle" sub="Sport-specific job templates (AFL / cricket / soccer) generate open shifts from a fixture." />} />
        <Route path="events" element={<Stub title="Events" icon="spark" sub="Reuses the roster builder, scoped to club events." />} />
        <Route path="compliance" element={<Compliance />} />
        <Route path="onboarding" element={<Stub title="Onboarding & Training" icon="onboard" sub="Role-based onboarding stages; AI drafts each step." />} />
        <Route path="comms" element={<Communications />} />
        <Route path="recognition" element={<Stub title="Recognition" icon="award" sub="Suggests who to thank; drafts posts and certificates." />} />
        <Route path="surveys" element={<Stub title="Surveys & Feedback" icon="survey" sub="Pulse surveys with AI summaries that become actions." />} />
        <Route path="reports" element={<Reports />} />
        <Route path="billing" element={<Billing />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
