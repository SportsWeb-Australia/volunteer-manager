import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { supabase } from "../lib/supabase";
import { useApp } from "../context/AppContext";
import type { Volunteer, VolunteerStatus } from "../lib/types";
import { Card, SectionHead, Avatar, StatusPill, Loading, EmptyState, Btn, Icon } from "../components/ui";
import { T } from "../lib/theme";

const PALETTE = [T.red, T.navy3, "#5A6B2B", "#7A4A1E", T.blue, "#7A2B57", "#1E6E5C"];
const ci = (s: string) => PALETTE[(s.charCodeAt(0) + s.length) % PALETTE.length];
const FILTERS = ["All", "active", "applied", "approved", "paused", "prospect"];
const ADD_STATUSES: VolunteerStatus[] = ["active", "approved", "applied", "prospect", "paused"];

const inputStyle: CSSProperties = {
  width: "100%", padding: "10px 13px", borderRadius: 11, border: `1px solid ${T.line}`,
  fontSize: 14, fontFamily: "inherit", background: "#fff", boxSizing: "border-box",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: 13 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: T.muted, marginBottom: 6 }}>{label}</div>
      {children}
    </label>
  );
}

export function People() {
  const { clubId } = useApp();
  const [rows, setRows] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("All");

  // add-volunteer modal
  const [adding, setAdding] = useState(false);
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<VolunteerStatus>("active");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    if (!clubId) return;
    setLoading(true);
    const { data } = await supabase
      .from("volunteers")
      .select("id,status,person:people(id,full_name,mobile,email),profile:volunteer_profiles(preferred_roles,internal_tags)")
      .eq("club_id", clubId)
      .order("status");
    setRows((data as unknown as Volunteer[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("volunteers")
        .select("id,status,person:people(id,full_name,mobile,email),profile:volunteer_profiles(preferred_roles,internal_tags)")
        .eq("club_id", clubId)
        .order("status");
      if (!cancelled) { setRows((data as unknown as Volunteer[]) ?? []); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [clubId]);

  const openAdd = () => {
    setFullName(""); setMobile(""); setEmail(""); setStatus("active"); setErr(null);
    setAdding(true);
  };

  const saveVolunteer = async () => {
    if (!clubId) return;
    const name = fullName.trim();
    if (!name) { setErr("Please enter a name."); return; }
    setSaving(true); setErr(null);
    try {
      // 1. create the shared person record (volunteers hang off `people`)
      const parts = name.split(/\s+/);
      const { data: person, error: pErr } = await supabase
        .from("people")
        .insert({
          club_id: clubId,
          full_name: name,
          first_name: parts[0],
          last_name: parts.length > 1 ? parts.slice(1).join(" ") : null,
          mobile: mobile.trim() || null,
          email: email.trim() || null,
        })
        .select("id")
        .single();
      if (pErr) throw pErr;

      // 2. link a volunteer record to that person
      const { error: vErr } = await supabase
        .from("volunteers")
        .insert({ club_id: clubId, person_id: person!.id, status });
      if (vErr) throw vErr;

      setAdding(false);
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not add volunteer.");
    } finally {
      setSaving(false);
    }
  };

  const list = useMemo(() => rows.filter(r => {
    const name = r.person?.full_name?.toLowerCase() ?? "";
    const roles = (r.profile?.preferred_roles ?? []).join(" ").toLowerCase();
    return (filter === "All" || r.status === filter) && (name.includes(q.toLowerCase()) || roles.includes(q.toLowerCase()));
  }), [rows, q, filter]);

  return (
    <div className="fade">
      <SectionHead eyebrow="People Hub · volunteer view" title="Volunteer people"
        sub="One person record, shared across the whole club — volunteer details extend the existing People Hub contact, never a duplicate."
        right={<Btn icon="people" onClick={openAdd}>Add volunteer</Btn>} />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name or role…"
          style={{ flex: "1 1 220px", padding: "10px 14px", borderRadius: 11, border: `1px solid ${T.line}`, fontSize: 14, fontFamily: "inherit", background: "#fff" }} />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ border: `1px solid ${filter === f ? T.navy : T.line}`, background: filter === f ? T.navy : "#fff", color: filter === f ? "#fff" : T.ink, padding: "8px 13px", borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: "pointer", textTransform: f === "All" ? "none" : "capitalize" }}>{f}</button>
          ))}
        </div>
      </div>

      {loading ? <Loading />
        : list.length === 0
        ? <EmptyState icon="people" title="No volunteers yet" sub="Add one directly, or they'll appear here once people put their hand up through an opportunity."
            action={<Btn icon="people" onClick={openAdd}>Add volunteer</Btn>} />
        : (
          <Card pad={0} style={{ overflow: "hidden" }}>
            {list.map((r, i) => {
              const name = r.person?.full_name ?? "Unknown";
              const roles = (r.profile?.preferred_roles ?? []).join(", ");
              return (
                <div key={r.id} className="row-hover" style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", borderTop: i ? `1px solid ${T.line}` : "none", cursor: "pointer" }}>
                  <Avatar name={name} color={ci(name)} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14.5 }}>{name}</div>
                    <div style={{ fontSize: 12.5, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{roles || "No preferred roles yet"}</div>
                  </div>
                  <StatusPill s={r.status} />
                </div>
              );
            })}
          </Card>
        )}

      {adding && (
        <div onClick={() => !saving && setAdding(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(7,12,22,.55)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 440, background: T.card, borderRadius: 18, border: `1px solid ${T.line}`, padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 className="disp" style={{ fontSize: 22, margin: 0, color: T.ink }}>Add volunteer</h2>
              <button onClick={() => !saving && setAdding(false)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4 }}><Icon n="x" s={20} c={T.muted} /></button>
            </div>

            <Field label="Full name *">
              <input autoFocus value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Jordan Smith" style={inputStyle} />
            </Field>
            <Field label="Mobile">
              <input value={mobile} onChange={e => setMobile(e.target.value)} placeholder="0400 000 000" style={inputStyle} />
            </Field>
            <Field label="Email">
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" style={inputStyle} />
            </Field>
            <Field label="Status">
              <select value={status} onChange={e => setStatus(e.target.value as VolunteerStatus)} style={{ ...inputStyle, textTransform: "capitalize" }}>
                {ADD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>

            {err && <div style={{ background: T.redSoft ?? "#FBE9E8", color: T.red, fontSize: 12.5, padding: "9px 12px", borderRadius: 10, marginBottom: 13 }}>{err}</div>}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
              <Btn kind="ghost" onClick={() => !saving && setAdding(false)}>Cancel</Btn>
              <Btn onClick={saveVolunteer}>{saving ? "Saving…" : "Add volunteer"}</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
