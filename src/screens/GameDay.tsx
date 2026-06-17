import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useApp } from "../context/AppContext";
import { Card, SectionHead, Btn, Field, FormError, fieldInput } from "../components/ui";
import { T } from "../lib/theme";

// Common community-footy / netball game-day jobs.
const JOBS = [
  "BBQ", "Canteen", "Gate / ticketing", "Timekeeper", "Scorer",
  "Boundary umpire", "Goal umpire", "Ground setup", "Ground pack-down",
  "First aid", "Runner", "Water / trainer",
];

export function GameDay() {
  const { clubId } = useApp();
  const [date, setDate] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const toggle = (j: string) => setPicked(p => {
    const n = new Set(p); n.has(j) ? n.delete(j) : n.add(j); return n;
  });

  const generate = async () => {
    if (!clubId) return;
    if (picked.size === 0) { setErr("Pick at least one job."); return; }
    setSaving(true); setErr(null); setNote(null);
    try {
      const rows = [...picked].map(title => ({
        club_id: clubId, title, shift_date: date || null,
        status: "open", volunteers_needed: 1, check_in_token: crypto.randomUUID(),
      }));
      const { error } = await supabase.from("volunteer_shifts").insert(rows);
      if (error) throw error;
      setNote(`Created ${rows.length} game-day shift${rows.length === 1 ? "" : "s"} — open Rosters & Shifts to fill them or print their check-in QR codes.`);
      setPicked(new Set());
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not create shifts.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fade">
      <SectionHead eyebrow="Match day" title="Game Day Jobs"
        sub="Pick the jobs you need filled and a date — we'll create an open shift for each one (with its own check-in QR), ready to roster." />
      <Card pad={20} style={{ maxWidth: 720 }}>
        <Field label="Match date">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...fieldInput, maxWidth: 240 }} />
        </Field>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: T.muted, margin: "4px 0 8px" }}>Jobs</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {JOBS.map(j => {
            const on = picked.has(j);
            return (
              <button key={j} onClick={() => toggle(j)} style={{ border: `1px solid ${on ? T.red : T.line}`, background: on ? T.red : "#fff", color: on ? "#fff" : T.ink, padding: "8px 13px", borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{j}</button>
            );
          })}
        </div>
        {err && <FormError>{err}</FormError>}
        {note && <Card pad={12} style={{ marginBottom: 12, fontSize: 13.5, background: T.greenSoft, borderColor: "#CDE6D8" }}>{note}</Card>}
        <Btn icon="whistle" onClick={generate}>{saving ? "Creating…" : `Create ${picked.size || ""} shift${picked.size === 1 ? "" : "s"}`.trim()}</Btn>
      </Card>
    </div>
  );
}
