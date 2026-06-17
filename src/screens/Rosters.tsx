import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useApp } from "../context/AppContext";
import { buildRoster, approveRoster, type RosterProposal } from "../lib/api";
import type { Shift } from "../lib/types";
import { Card, SectionHead, Pill, Icon, Loading, EmptyState, Btn, Avatar, ReviewChip, Modal, Field, FormError, fieldInput } from "../components/ui";
import { Gate } from "../components/Gate";
import { Qr } from "../components/Qr";
import { T } from "../lib/theme";

const PALETTE = [T.red, T.navy3, "#5A6B2B", "#7A4A1E", T.blue, "#7A2B57", "#1E6E5C"];
const ci = (s: string) => PALETTE[(s.charCodeAt(0) + s.length) % PALETTE.length];

function BuildMyRoster({ onCommitted }: { onCommitted: () => void }) {
  const { clubId } = useApp();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [proposal, setProposal] = useState<RosterProposal | null>(null);
  const [suggestionId, setSuggestionId] = useState<string | null>(null);
  const [includeOverrides, setIncludeOverrides] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const run = async () => {
    if (!clubId) return;
    setBusy(true); setErr(null); setProposal(null); setDone(null);
    try {
      const res = await buildRoster(clubId, { avoid_recent_weeks: 4, prioritise_new: true });
      setProposal(res.proposal); setSuggestionId(res.suggestion_id);
    } catch (e: any) { setErr(e?.message ?? "Couldn't build a roster."); }
    finally { setBusy(false); }
  };

  const approve = async () => {
    if (!suggestionId) return;
    setBusy(true); setErr(null);
    try {
      const r = await approveRoster(suggestionId, includeOverrides);
      setDone(`Roster approved — ${r.created} assigned${r.skipped.length ? `, ${r.skipped.length} skipped` : ""}.`);
      setProposal(null); onCommitted();
    } catch (e: any) { setErr(e?.message ?? "Couldn't approve."); }
    finally { setBusy(false); }
  };

  return (
    <Card pad={18} style={{ marginBottom: 18, borderColor: T.brandSoft }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon n="spark" s={18} c={T.brand} /><b style={{ fontSize: 15 }}>Build my roster</b>
        </div>
        {!proposal && <Btn icon="bolt" onClick={run}>{busy ? "Building…" : "Generate draft"}</Btn>}
      </div>

      {err && <div style={{ marginTop: 12, color: T.red, fontSize: 13 }}>{err}</div>}
      {done && <div style={{ marginTop: 12, color: T.green, fontSize: 13.5, fontWeight: 600 }}>{done}</div>}

      {proposal && (
        <div className="fade" style={{ marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 13.5, color: T.muted }}>{proposal.summary}</span>
            <ReviewChip state="Needs review" />
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {proposal.assignments.map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: 12, borderRadius: 12, background: a.needs_override ? T.redSoft : "#FAF8F2", border: `1px solid ${a.needs_override ? "#EEC6C3" : T.line}` }}>
                <Avatar name={a.volunteer_name} color={ci(a.volunteer_name)} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <b style={{ fontSize: 14 }}>{a.volunteer_name}</b><Icon n="arrow" s={13} c={T.muted} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: T.navy }}>{a.shift_title}</span>
                    <span className="mono" style={{ fontSize: 10, color: T.muted, background: "#fff", padding: "1px 6px", borderRadius: 5, border: `1px solid ${T.line}` }}>{Math.round(a.confidence * 100)}%</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: a.needs_override ? T.redDeep : T.muted, marginTop: 4 }}>{a.reason}</div>
                </div>
              </div>
            ))}
          </div>
          {proposal.warnings > 0 && (
            <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, fontSize: 12.5, color: T.redDeep }}>
              <input type="checkbox" checked={includeOverrides} onChange={e => setIncludeOverrides(e.target.checked)} />
              Override the compliance flag and assign anyway ({proposal.warnings})
            </label>
          )}
          <div style={{ display: "flex", gap: 9, marginTop: 14, flexWrap: "wrap" }}>
            <Btn kind="green" icon="check" onClick={approve}>{busy ? "Approving…" : "Approve roster"}</Btn>
            <Btn kind="ghost" icon="bolt" onClick={run}>Regenerate</Btn>
            <Btn kind="ghost" icon="x" onClick={() => setProposal(null)}>Discard</Btn>
          </div>
        </div>
      )}
    </Card>
  );
}

export function Rosters() {
  const { clubId } = useApp();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [qrFor, setQrFor] = useState<string | null>(null);
  const origin = window.location.origin;

  // new-shift modal
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [location, setLocation] = useState("");
  const [needed, setNeeded] = useState("1");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const openAdd = () => {
    setTitle(""); setDate(""); setStart(""); setEnd(""); setLocation(""); setNeeded("1"); setErr(null);
    setAdding(true);
  };

  const saveShift = async () => {
    if (!clubId) return;
    const t = title.trim();
    if (!t) { setErr("Please enter a shift title."); return; }
    setSaving(true); setErr(null);
    try {
      const { error } = await supabase.from("volunteer_shifts").insert({
        club_id: clubId, title: t,
        shift_date: date || null,
        start_time: start || null,
        end_time: end || null,
        location: location.trim() || null,
        volunteers_needed: Math.max(1, parseInt(needed, 10) || 1),
        status: "open",
        check_in_token: crypto.randomUUID(),
      });
      if (error) throw error;
      setAdding(false);
      setTick(n => n + 1);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not create shift.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("volunteer_shifts")
        .select("id,club_id,title,team_id,shift_date,start_time,end_time,location,volunteers_needed,status,role_id,check_in_token")
        .eq("club_id", clubId).order("shift_date").limit(50);
      if (!cancelled) { setShifts((data as Shift[]) ?? []); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [clubId, tick]);

  return (
    <div className="fade">
      <SectionHead eyebrow="Rosters & shifts" title="Rosters & shifts"
        sub="Fill shifts by hand, or let the AI build a fair draft and explain every pick."
        right={<Btn icon="cal" onClick={openAdd}>New shift</Btn>} />
      <Gate feature="ai_roster_builder"><BuildMyRoster onCommitted={() => setTick(t => t + 1)} /></Gate>

      {loading ? <Loading />
        : shifts.length === 0 ? <EmptyState icon="cal" title="No shifts yet" sub="Add a shift by hand to get started — each one gets its own check-in QR."
            action={<Btn icon="cal" onClick={openAdd}>New shift</Btn>} />
        : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))", gap: 12 }}>
            {shifts.map(s => {
              const full = ["filled", "confirmed", "completed"].includes(s.status);
              return (
                <Card key={s.id} pad={14} style={{ borderColor: full ? "#CDE6D8" : "#EEE3C9" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14.5 }}>{s.title}</div>
                      <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>{s.shift_date ?? ""} {s.start_time ? `· ${s.start_time?.slice(0, 5)}` : ""}</div>
                    </div>
                    <Pill bg={full ? T.greenSoft : T.amberSoft} fg={full ? T.green : T.amber}>{s.status}</Pill>
                  </div>
                  {s.location && <div style={{ fontSize: 12, color: T.muted, marginTop: 9, display: "flex", gap: 5, alignItems: "center" }}><Icon n="cal" s={13} c={T.muted} />{s.location}</div>}
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 8 }}>Needs {s.volunteers_needed}</div>
                  {s.check_in_token && (
                    <div style={{ marginTop: 10, borderTop: `1px solid ${T.line}`, paddingTop: 10 }}>
                      <Btn sm kind="ghost" icon="qr" onClick={() => setQrFor(qrFor === s.id ? null : s.id)}>{qrFor === s.id ? "Hide QR" : "Check-in QR"}</Btn>
                      {qrFor === s.id && (
                        <div className="fade" style={{ marginTop: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                          <Qr value={`${origin}/checkin?s=${s.check_in_token}`} size={140} />
                          <span style={{ fontSize: 11, color: T.muted, textAlign: "center" }}>Print on the run sheet — scan or tap to check in.</span>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

      {adding && (
        <Modal title="New shift" busy={saving} onClose={() => setAdding(false)}>
          <Field label="Shift title *">
            <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Saturday BBQ" style={fieldInput} />
          </Field>
          <Field label="Date">
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={fieldInput} />
          </Field>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}><Field label="Start time"><input type="time" value={start} onChange={e => setStart(e.target.value)} style={fieldInput} /></Field></div>
            <div style={{ flex: 1 }}><Field label="End time"><input type="time" value={end} onChange={e => setEnd(e.target.value)} style={fieldInput} /></Field></div>
          </div>
          <Field label="Location">
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Oval gate" style={fieldInput} />
          </Field>
          <Field label="Volunteers needed">
            <input type="number" min={1} value={needed} onChange={e => setNeeded(e.target.value)} style={fieldInput} />
          </Field>

          {err && <FormError>{err}</FormError>}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <Btn kind="ghost" onClick={() => !saving && setAdding(false)}>Cancel</Btn>
            <Btn onClick={saveShift}>{saving ? "Saving…" : "Create shift"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
