import { useState } from "react";
import { Card, SectionHead, Icon } from "../components/ui";
import { T } from "../lib/theme";

const QUICK: { icon: string; title: string; body: string }[] = [
  { icon: "people", title: "1. Add your volunteers", body: "Volunteer People → Add volunteer. Or skip ahead — people can add themselves by tapping a sign-up link (step 4)." },
  { icon: "role", title: "2. Set up your roles", body: "Roles & Descriptions → New role. There's a ready-made library of common club roles to start from — tap any card to tweak it." },
  { icon: "cal", title: "3. Create shifts", body: "Rosters & Shifts → New shift, or use Game Day Jobs to create a whole match-day in one go. Every shift gets its own check-in QR." },
  { icon: "mega", title: "4. Recruit publicly", body: "Volunteer Sign-ups → New sign-up → share the link or QR (website, socials, the ground). One tap, no login. Responses land back in the sign-up." },
  { icon: "spark", title: "5. Let AI build a roster", body: "Rosters & Shifts → Generate draft. The AI proposes a fair roster and explains each pick. You review and Approve — nothing is assigned until you do." },
  { icon: "chat", title: "6. Send a message", body: "Communications → New AI draft → pick Email and/or SMS → Approve → Send. Email & push are free; SMS uses your monthly allowance." },
];

const DEEP: { icon: string; title: string; body: string }[] = [
  { icon: "grid", title: "Dashboard", body: "Your home base. Shows AI-suggested actions (e.g. a draft roster ready for review) that you approve or dismiss. Nothing happens automatically — you're always in control." },
  { icon: "people", title: "Volunteer People", body: "Everyone who helps. Add or edit a volunteer (tap a row to edit), set their status, and record marketing consent. A volunteer is a person from your club's shared People Hub — never a duplicate contact." },
  { icon: "role", title: "Roles & Descriptions", body: "The jobs your club needs filled, with a risk level and any required checks (e.g. WWCC, First Aid). Tap a card to edit it, or New role to add your own." },
  { icon: "mega", title: "Volunteer Sign-ups", body: "Public 'put your hand up' posts. Create one, share its link/QR, and members respond in one tap without logging in. Track responses against how many you need." },
  { icon: "cal", title: "Rosters & Shifts", body: "Schedule volunteers to specific shifts. Build by hand with New shift, or let the AI draft a fair roster. Each shift carries a check-in QR you can print." },
  { icon: "whistle", title: "Game Day Jobs", body: "A fast way to spin up a match day: tick the jobs you need (BBQ, canteen, gate, timekeeper…) and a date, and it creates an open shift for each." },
  { icon: "shield", title: "Compliance", body: "Traffic-lights on every check (valid / expiring / expired / missing). Anyone 'red' can't be assigned to a restricted role unless an admin overrides. 'Send expiry reminders' drafts a message to those who need to renew." },
  { icon: "onboard", title: "Onboarding & Training", body: "Record inductions and courses each volunteer has completed, and when they're due to refresh." },
  { icon: "chat", title: "Communications", body: "AI drafts every message; you read and approve before anything goes out. Choose Operational (rosters, reminders — sent to everyone) or Marketing (only opted-in volunteers, with an automatic opt-out). The SMS usage banner shows your allowance." },
  { icon: "award", title: "Recognition", body: "Celebrate volunteers — record a thank-you, award or milestone." },
  { icon: "survey", title: "Surveys & Feedback", body: "Capture how volunteers are feeling with ratings and comments, and see the average at a glance." },
  { icon: "report", title: "Reports", body: "Headline numbers for your committee — hours, active volunteers and the dollar value of volunteer time. Export to CSV or PDF on the Club plan." },
  { icon: "card", title: "Plan & Billing", body: "Your plan, and SMS packs. Email & push are free on every plan; SMS is metered — top up with a pack any time (packs never expire)." },
  { icon: "cog", title: "Settings", body: "Guardrails (e.g. require approval before sending), shift check-in method (QR/NFC), and your SMS sender ID. Sensible defaults are on out of the box." },
];

const CONCEPTS: { title: string; body: string }[] = [
  { title: "AI prepares, you approve", body: "The AI only ever drafts — rosters, messages, reminders. It never sends or assigns on its own. Every action waits for your tap." },
  { title: "Operational vs marketing", body: "Operational messages (rosters, reminders, check-in) go to everyone. Marketing only goes to volunteers who opted in, and always includes an opt-out (SMS 'STOP' / email unsubscribe)." },
  { title: "Manager vs volunteer view", body: "The toggle at the bottom of the menu switches between the manager dashboard and the simple member-facing view a volunteer sees." },
  { title: "Email & push free, SMS metered", body: "Email and push are unlimited on every plan. SMS draws on a monthly allowance; buy SMS packs for more. Texts send from your sender ID." },
];

function Accordion({ items }: { items: { icon?: string; title: string; body: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Card pad={0} style={{ overflow: "hidden" }}>
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={it.title} style={{ borderTop: i ? `1px solid ${T.line}` : "none" }}>
            <button onClick={() => setOpen(isOpen ? null : i)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "14px 16px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
              {it.icon && <Icon n={it.icon} s={18} c={T.brand} />}
              <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{it.title}</span>
              <span style={{ transition: "transform .15s ease", transform: isOpen ? "rotate(90deg)" : "none", display: "inline-flex" }}><Icon n="arrow" s={15} c={T.muted} /></span>
            </button>
            {isOpen && <div className="fade" style={{ padding: "0 16px 15px", fontSize: 13.5, color: T.muted, lineHeight: 1.6 }}>{it.body}</div>}
          </div>
        );
      })}
    </Card>
  );
}

export function Help() {
  return (
    <div className="fade">
      <SectionHead eyebrow="VolunteerOne" title="Help & Guide"
        sub="New here? Start with the quick start, then dig into any screen below. This page is always here under the menu." />

      <div className="eyebrow" style={{ margin: "4px 0 12px" }}>Quick start — 6 steps</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12, marginBottom: 24 }}>
        {QUICK.map(q => (
          <Card key={q.title} pad={16}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 7 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: T.brandSoft, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon n={q.icon} s={17} c={T.brandDeep} /></div>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{q.title}</span>
            </div>
            <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.55 }}>{q.body}</div>
          </Card>
        ))}
      </div>

      <div className="eyebrow" style={{ margin: "4px 0 12px" }}>How each screen works</div>
      <div style={{ marginBottom: 24 }}><Accordion items={DEEP} /></div>

      <div className="eyebrow" style={{ margin: "4px 0 12px" }}>Good to know</div>
      <div style={{ marginBottom: 24 }}><Accordion items={CONCEPTS} /></div>

      <Card pad={16} style={{ display: "flex", gap: 11, alignItems: "center", background: T.brandSoft, borderColor: "#A9E6DD" }}>
        <Icon n="help" s={20} c={T.brandDeep} />
        <span style={{ fontSize: 13.5, color: T.ink }}>Still stuck? Email <b>info@sportsweb.com.au</b> and we'll help you out.</span>
      </Card>
    </div>
  );
}
