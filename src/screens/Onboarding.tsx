import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useApp } from "../context/AppContext";
import { Card, SectionHead, Pill, Loading, EmptyState, Btn, Modal, Field, FormError, fieldInput } from "../components/ui";
import { Gate } from "../components/Gate";
import { T } from "../lib/theme";

interface Rec { id: string; course: string; completed_on: string | null; expires_on: string | null; status: string; volunteer?: { person?: { full_name: string | null } | null } | null; }
interface VOpt { id: string; person?: { full_name: string | null } | null; }

function OnboardingInner() {
  const { clubId } = useApp();
  const [rows, setRows] = useState<Rec[]>([]);
  const [vols, setVols] = useState<VOpt[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [volId, setVolId] = useState("");
  const [course, setCourse] = useState("");
  const [completed, setCompleted] = useState("");
  const [expires, setExpires] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    if (!clubId) return;
    setLoading(true);
    const [{ data }, { data: v }] = await Promise.all([
      supabase.from("volunteer_training_records")
        .select("id,course,completed_on,expires_on,status,volunteer:volunteers(person:people(full_name))")
        .eq("club_id", clubId).order("completed_on", { ascending: false }),
      supabase.from("volunteers").select("id,person:people(full_name)").eq("club_id", clubId),
    ]);
    setRows((data as unknown as Rec[]) ?? []);
    setVols((v as unknown as VOpt[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { if (clubId) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [clubId]);

  const openAdd = () => { setVolId(vols[0]?.id ?? ""); setCourse(""); setCompleted(""); setExpires(""); setErr(null); setOpen(true); };

  const save = async () => {
    if (!clubId) return;
    if (!volId) { setErr("Pick a volunteer (add one under Volunteer People first)."); return; }
    if (!course.trim()) { setErr("Enter a course or onboarding step."); return; }
    setSaving(true); setErr(null);
    try {
      const { error } = await supabase.from("volunteer_training_records").insert({
        club_id: clubId, volunteer_id: volId, course: course.trim(),
        completed_on: completed || null, expires_on: expires || null,
        status: completed ? "completed" : "in_progress",
      });
      if (error) throw error;
      setOpen(false);
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not save record.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fade">
      <SectionHead eyebrow="Bring people up to speed" title="Onboarding & Training"
        sub="Track inductions and courses your volunteers have completed, and when they're due to refresh."
        right={<Btn icon="onboard" onClick={openAdd}>Record training</Btn>} />
      {loading ? <Loading />
        : rows.length === 0 ? <EmptyState icon="onboard" title="No training recorded yet" sub="Log an induction or course a volunteer has completed."
            action={<Btn icon="onboard" onClick={openAdd}>Record training</Btn>} />
        : (
          <Card pad={0} style={{ overflow: "hidden" }}>
            {rows.map((r, i) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderTop: i ? `1px solid ${T.line}` : "none", fontSize: 13.5 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b>{r.volunteer?.person?.full_name ?? "Volunteer"}</b> <span style={{ color: T.muted }}>· {r.course}</span>
                </div>
                <span style={{ color: T.muted, fontSize: 12.5 }}>{r.completed_on ? `Done ${r.completed_on}` : "In progress"}{r.expires_on ? ` · expires ${r.expires_on}` : ""}</span>
                <Pill bg={T.greenSoft} fg={T.green}>{r.status}</Pill>
              </div>
            ))}
          </Card>
        )}

      {open && (
        <Modal title="Record training" busy={saving} onClose={() => setOpen(false)}>
          <Field label="Volunteer *">
            <select value={volId} onChange={e => setVolId(e.target.value)} style={fieldInput}>
              {vols.length === 0 && <option value="">No volunteers yet</option>}
              {vols.map(v => <option key={v.id} value={v.id}>{v.person?.full_name ?? "Volunteer"}</option>)}
            </select>
          </Field>
          <Field label="Course / step *"><input autoFocus value={course} onChange={e => setCourse(e.target.value)} placeholder="e.g. Level 1 First Aid" style={fieldInput} /></Field>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}><Field label="Completed on"><input type="date" value={completed} onChange={e => setCompleted(e.target.value)} style={fieldInput} /></Field></div>
            <div style={{ flex: 1 }}><Field label="Expires on"><input type="date" value={expires} onChange={e => setExpires(e.target.value)} style={fieldInput} /></Field></div>
          </div>
          {err && <FormError>{err}</FormError>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <Btn kind="ghost" onClick={() => !saving && setOpen(false)}>Cancel</Btn>
            <Btn onClick={save}>{saving ? "Saving…" : "Save record"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function Onboarding() {
  return <Gate feature="onboarding"><OnboardingInner /></Gate>;
}
