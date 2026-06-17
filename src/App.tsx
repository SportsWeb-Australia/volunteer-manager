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
import { GameDay } from "./screens/GameDay";
import { Events } from "./screens/Events";
import { Onboarding } from "./screens/Onboarding";
import { Recognition } from "./screens/Recognition";
import { Surveys } from "./screens/Surveys";

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

  if (!ready) return <Loading label="Starting VolunteerOne…" />;
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
        <Route path="game-day" element={<GameDay />} />
        <Route path="events" element={<Events />} />
        <Route path="compliance" element={<Compliance />} />
        <Route path="onboarding" element={<Onboarding />} />
        <Route path="comms" element={<Communications />} />
        <Route path="recognition" element={<Recognition />} />
        <Route path="surveys" element={<Surveys />} />
        <Route path="reports" element={<Reports />} />
        <Route path="billing" element={<Billing />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
