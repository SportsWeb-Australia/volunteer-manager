import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useApp } from "../context/AppContext";
import type { Volunteer, VolunteerStatus } from "../lib/types";
import { Card, SectionHead, Avatar, StatusPill, Loading, EmptyState, Btn, Modal, Field, FormError, fieldInput } from "../components/ui";
import { T } from "../lib/theme";

const PALETTE = [T.red, T.navy3, "#5A6B2B", "#7A4A1E", T.blue, "#7A2B57", "#1E6E5C"];
const ci = (s: string) => PALETTE[(s.charCodeAt(0) + s.length) % PALETTE.length];
const FILTERS = ["All", "active", "applied", "approved", "paused", "prospect"];
const ADD_STATUSES: VolunteerStatus[] = ["active", "approved", "applied", "prospect", "paused"];

const SELECT = "id,status,person:people(id,full_name,mobile,email,sms_marketing_consent,email_marketing_consent),profile:volunteer_profiles(preferred_roles,internal_tags)";

export function People() {
  const { clubId } = useApp();
  const [rows, setRows] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("All");

  // add/edit modal
  const [open, setOpen] = useState(false);
  const [editVolId, setEditVolId] = useState<string | null>(null);
  const [editPersonId, setEditPersonId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<VolunteerStatus>("active");
  const [smsConsent, setSmsConsent] = useState(false);
  const [emailConsent, setEmailConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    if (!clubId) return;
    setLoading(true);
    const { data } = await supabase.from("volunteers").select(SELECT).eq("club_id", clubId).order("status");
    setRows((data as unknown as Volunteer[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { if (clubId) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [clubId]);

  const openAdd = () => {
    setEditVolId(null); setEditPersonId(null);
    setFullName(""); setMobile(""); setEmail(""); setStatus("active");
    setSmsConsent(false); setEmailConsent(false); setErr(null);
    setOpen(true);
  };

  const openEdit = (r: Volunteer) => {
    const p = r.person as (typeof r.person & { sms_marketing_consent?: boolean; email_marketing_consent?: boolean }) | null;
    setEditVolId(r.id); setEditPersonId(r.person?.id ?? null);
    setFullName(r.person?.full_name ?? ""); setMobile(r.person?.mobile ?? ""); setEmail(r.person?.email ?? "");
    setStatus(r.status);
    setSmsConsent(Boolean(p?.sms_marketing_consent)); setEmailConsent(Boolean(p?.email_marketing_consent));
    setErr(null);
    setOpen(true);
  };

  const save = async () => {
    if (!clubId) return;
    const name = fullName.trim();
    if (!name) { setErr("Please enter a name."); return; }
    setSaving(true); setErr(null);
    const parts = name.split(/\s+/);
    const personFields = {
      full_name: name,
      first_name: parts[0],
      last_name: parts.length > 1 ? parts.slice(1).join(" ") : null,
      mobile: mobile.trim() || null,
      email: email.trim() || null,
      sms_marketing_consent: smsConsent,
      email_marketing_consent: emailConsent,
    };
    try {
      if (editVolId && editPersonId) {
        const { error: pErr } = await supabase.from("people").update(personFields).eq("id", editPersonId);
        if (pErr) throw pErr;
        const { error: vErr } = await supabase.from("volunteers").update({ status }).eq("id", editVolId);
        if (vErr) throw vErr;
      } else {
        const { data: person, error: pErr } = await supabase.from("people")
          .insert({ club_id: clubId, ...personFields }).select("id").single();
        if (pErr) throw pErr;
        const { error: vErr } = await supabase.from("volunteers")
          .insert({ club_id: clubId, person_id: person!.id, status });
        if (vErr) throw vErr;
      }
      setOpen(false);
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not save volunteer.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!editVolId) return;
    if (!confirm("Remove this person as a volunteer? Their People Hub contact stays in the club directory.")) return;
    setSaving(true); setErr(null);
    try {
      const { error } = await supabase.from("volunteers").delete().eq("id", editVolId);
      if (error) throw error;
      setOpen(false);
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not remove volunteer.");
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
        ? <EmptyState icon="people" title="No volunteers yet" sub="Add one directly, or they'll appear here once people put their hand up through a sign-up."
            action={<Btn icon="people" onClick={openAdd}>Add volunteer</Btn>} />
        : (
          <Card pad={0} style={{ overflow: "hidden" }}>
            {list.map((r, i) => {
              const name = r.person?.full_name ?? "Unknown";
              const roles = (r.profile?.preferred_roles ?? []).join(", ");
              return (
                <div key={r.id} className="row-hover" onClick={() => openEdit(r)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", borderTop: i ? `1px solid ${T.line}` : "none", cursor: "pointer" }}>
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

      {open && (
        <Modal title={editVolId ? "Edit volunteer" : "Add volunteer"} busy={saving} onClose={() => setOpen(false)}>
          <Field label="Full name *">
            <input autoFocus value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Jordan Smith" style={fieldInput} />
          </Field>
          <Field label="Mobile">
            <input value={mobile} onChange={e => setMobile(e.target.value)} placeholder="0400 000 000" style={fieldInput} />
          </Field>
          <Field label="Email">
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" style={fieldInput} />
          </Field>
          <Field label="Status">
            <select value={status} onChange={e => setStatus(e.target.value as VolunteerStatus)} style={{ ...fieldInput, textTransform: "capitalize" }}>
              {ADD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>

          <div style={{ marginBottom: 13 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: T.muted, marginBottom: 6 }}>Marketing consent</div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, marginBottom: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={smsConsent} onChange={e => setSmsConsent(e.target.checked)} /> Opted in to marketing SMS
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, cursor: "pointer" }}>
              <input type="checkbox" checked={emailConsent} onChange={e => setEmailConsent(e.target.checked)} /> Opted in to marketing email
            </label>
            <div style={{ fontSize: 11.5, color: T.muted, marginTop: 6 }}>Operational messages (rosters, reminders, check-in) always send regardless.</div>
          </div>

          {err && <FormError>{err}</FormError>}

          <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
            <div>{editVolId && <Btn kind="ghost" onClick={remove}>Remove</Btn>}</div>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn kind="ghost" onClick={() => !saving && setOpen(false)}>Cancel</Btn>
              <Btn onClick={save}>{saving ? "Saving…" : editVolId ? "Save changes" : "Add volunteer"}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
