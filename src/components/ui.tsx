import type { CSSProperties, ReactNode } from "react";
import { T, F } from "../lib/theme";

const PATHS: Record<string, string> = {
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  people: "M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2.5 20a6.5 6.5 0 0113 0M16 11a3 3 0 100-6M21.5 20a5.5 5.5 0 00-7-5.2",
  role: "M5 4h9l5 5v11a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1zM14 4v5h5M8 13h8M8 17h6",
  mega: "M4 10v4l11 4V6L4 10zM4 12H2.5M15 9a3 3 0 010 6M18.5 7a6 6 0 010 10",
  cal: "M4 6h16v15H4zM4 10h16M8 3v4M16 3v4",
  whistle: "M14 8a5 5 0 11-3.5 8.6L4 19l1.2-4.4A5 5 0 0114 8zM14 8V5h4M9.5 13.5h.01",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3zM9 12l2 2 4-4",
  chat: "M4 5h16v11H8l-4 4V5z",
  award: "M12 3a5 5 0 100 10 5 5 0 000-10zM9 12l-1.5 8L12 18l4.5 2L15 12",
  report: "M4 20V4M4 20h16M8 16v-5M12 16V7M16 16v-8",
  cog: "M12 9a3 3 0 100 6 3 3 0 000-6zM12 2v3M12 19v3M5 5l2 2M17 17l2 2M2 12h3M19 12h3M5 19l2-2M17 7l2-2",
  spark: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z",
  check: "M5 12l4 4 10-10",
  x: "M6 6l12 12M18 6L6 18",
  edit: "M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4",
  bolt: "M13 3L4 14h6l-1 7 9-11h-6l1-7z",
  bell: "M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6zM10 21h4",
  arrow: "M5 12h14M13 6l6 6-6 6",
  clock: "M12 3a9 9 0 100 18 9 9 0 000-18zM12 8v4l3 2",
  menu: "M4 7h16M4 12h16M4 17h16",
  lock: "M6 11h12v9H6zM9 11V8a3 3 0 016 0v3",
  card: "M3 6h18v12H3zM3 10h18",
  onboard: "M12 3v12M8 11l4 4 4-4M5 19h14",
  survey: "M5 4h14v16H5zM9 9h6M9 13h6M9 17h3",
};

export function Icon({ n, s = 20, c = "currentColor", sw = 1.7 }: { n: string; s?: number; c?: string; sw?: number }) {
  const d = PATHS[n] ?? "";
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {d.split("M").filter(Boolean).map((seg, i) => <path key={i} d={"M" + seg} />)}
    </svg>
  );
}

export function Card({ children, pad = 18, style, className, onClick }: { children: ReactNode; pad?: number; style?: CSSProperties; className?: string; onClick?: () => void }) {
  return <div className={className} onClick={onClick} style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 18, padding: pad, ...style }}>{children}</div>;
}

export function Pill({ children, bg, fg, soft }: { children: ReactNode; bg: string; fg: string; soft?: boolean }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, background: bg, color: fg, fontFamily: F.body, border: soft ? `1px solid ${fg}22` : "none" }}>{children}</span>;
}

const STATUS: Record<string, [string, string]> = {
  active: [T.greenSoft, T.green], approved: [T.greenSoft, T.green],
  paused: [T.amberSoft, T.amber], applied: [T.blueSoft, T.blue],
  prospect: ["#EEE9DD", T.muted], inactive: ["#EEE9DD", T.muted], archived: ["#EEE9DD", T.muted],
};
export function StatusPill({ s }: { s: string }) {
  const [bg, fg] = STATUS[s] ?? ["#EEE9DD", T.muted];
  return <Pill bg={bg} fg={fg} soft>{s.charAt(0).toUpperCase() + s.slice(1)}</Pill>;
}

export function Dot({ k }: { k: "green" | "amber" | "red" | "grey" }) {
  const c = { green: T.green, amber: T.amber, red: T.red, grey: "#B8B2A4" }[k];
  return <span style={{ width: 10, height: 10, borderRadius: 999, background: c, display: "inline-block" }} />;
}

export function Avatar({ name, color, size = 38 }: { name: string; color: string; size?: number }) {
  const init = name.split(" ").map(w => w[0]).slice(0, 2).join("");
  return <span style={{ width: size, height: size, borderRadius: 12, background: color, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: size * 0.36, flex: "0 0 auto" }}>{init}</span>;
}

type BtnKind = "primary" | "dark" | "ghost" | "soft" | "green";
export function Btn({ children, kind = "primary", sm, onClick, icon, full }: { children: ReactNode; kind?: BtnKind; sm?: boolean; onClick?: () => void; icon?: string; full?: boolean }) {
  const base: CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, border: "none", borderRadius: 11, fontWeight: 600, fontSize: sm ? 12.5 : 14, padding: sm ? "7px 12px" : "10px 16px", width: full ? "100%" : "auto", cursor: "pointer", fontFamily: F.body };
  const k: Record<BtnKind, CSSProperties> = {
    primary: { background: T.red, color: "#fff" },
    dark: { background: T.navy, color: "#fff" },
    ghost: { background: "transparent", color: T.ink, border: `1px solid ${T.line}` },
    soft: { background: "#F1ECE0", color: T.ink },
    green: { background: T.green, color: "#fff" },
  };
  return <button className="btn" style={{ ...base, ...k[kind] }} onClick={onClick}>{icon && <Icon n={icon} s={sm ? 15 : 17} c={(k[kind].color as string) ?? T.ink} />}{children}</button>;
}

export function ReviewChip({ state }: { state: "Draft" | "Needs review" | "Approved" }) {
  const steps = ["Draft", "Needs review", "Approved"] as const;
  const idx = steps.indexOf(state);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: F.mono, fontSize: 10.5 }}>
      {steps.map((st, i) => (
        <span key={st} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ padding: "2px 7px", borderRadius: 6, background: i === idx ? (i === 2 ? T.greenSoft : T.amberSoft) : "transparent", color: i === idx ? (i === 2 ? T.green : T.amber) : "#C2BBAC", border: i === idx ? `1px solid ${(i === 2 ? T.green : T.amber)}33` : "1px solid transparent" }}>{st}</span>
          {i < 2 && <span style={{ color: "#D8D1C2" }}>›</span>}
        </span>
      ))}
    </span>
  );
}

export function SectionHead({ eyebrow, title, sub, right }: { eyebrow?: string; title: string; sub?: string; right?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="disp" style={{ fontSize: 30, margin: "7px 0 0", color: T.ink }}>{title}</h1>
        {sub && <p style={{ margin: "6px 0 0", color: T.muted, fontSize: 14.5, maxWidth: 620 }}>{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return <div style={{ padding: 28, color: T.muted, fontSize: 14, display: "flex", gap: 9, alignItems: "center" }}>
    <span style={{ width: 12, height: 12, borderRadius: 99, background: T.red, display: "inline-block" }} />{label}
  </div>;
}

export function EmptyState({ icon = "spark", title, sub, action }: { icon?: string; title: string; sub?: string; action?: ReactNode }) {
  return (
    <Card pad={40} style={{ textAlign: "center" }}>
      <div style={{ width: 52, height: 52, borderRadius: 15, background: "#F4EEE2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}><Icon n={icon} s={24} c={T.navy} /></div>
      <div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>
      {sub && <div style={{ fontSize: 13.5, color: T.muted, marginTop: 6, maxWidth: 420, margin: "6px auto 0" }}>{sub}</div>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </Card>
  );
}

// --- Form helpers (shared by the create/edit modals) ----------------------
export const fieldInput: CSSProperties = {
  width: "100%", padding: "10px 13px", borderRadius: 11, border: `1px solid ${T.line}`,
  fontSize: 14, fontFamily: "inherit", background: "#fff", boxSizing: "border-box",
};

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: 13 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: T.muted, marginBottom: 6 }}>{label}</div>
      {children}
    </label>
  );
}

export function FormError({ children }: { children: ReactNode }) {
  return <div style={{ background: T.redSoft, color: T.red, fontSize: 12.5, padding: "9px 12px", borderRadius: 10, marginBottom: 13 }}>{children}</div>;
}

export function Modal({ title, onClose, busy, children }: { title: string; onClose: () => void; busy?: boolean; children: ReactNode }) {
  return (
    <div onClick={() => !busy && onClose()}
      style={{ position: "fixed", inset: 0, background: "rgba(7,12,22,.55)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 440, background: T.card, borderRadius: 18, border: `1px solid ${T.line}`, padding: 22, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 className="disp" style={{ fontSize: 22, margin: 0, color: T.ink }}>{title}</h2>
          <button onClick={() => !busy && onClose()} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4 }}><Icon n="x" s={20} c={T.muted} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
