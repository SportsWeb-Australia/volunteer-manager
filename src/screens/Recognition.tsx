import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useApp } from "../context/AppContext";
import { Card, SectionHead, Pill, Loading, EmptyState, Btn, Modal, Field, FormError, fieldInput } from "../components/ui";
import { Gate } from "../components/Gate";
import { T } from "../lib/theme";

interface Rec { id: string; kind: string; badge: string | null; reason: string | null; created_at: string; volunteer?: { person?: { full_name: string | null } | null } | null; }
interface VOpt { id: string; person?: { full_name: string | null } | null; }

const KINDS = ["Thank you", "Award", "Milestone", "Volunteer of the month"];

function RecognitionInner() {
  const { clubId } = useApp();
  const [rows, setRows] = useState<Rec[]>([]);
  const [vols, setVols] = useState<VOpt[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [volId, setVolId] = useState("");
  const [kind, setKind] = useState(KINDS[0]);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    if (!clubId) return;
    setLoading(true);
    const [{ data }, { data: v }] = await Promise.all([
      supabase.from("volunteer_recognition")
        .select("id,kind,badge,reason,created_at,volunteer:volunteers(person:people(full_name))")
        .eq("club_id", clubId).order("created_at", { ascending: false }),
      supabase.from("volunteers").select("id,person:people(full_name)").eq("club_id", clubId),
    ]);
    setRows((data as unknown as Rec[]) ?? []);
    setVols((v as unknown as VOpt[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { if (clubId) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [clubId]);

  const openAdd = () => { setVolId(vols[0]?.id ?? ""); setKind(KINDS[0]); setReason(""); setErr(null); setOpen(true); };

  const save = async () => {
    if (!clubId) return;
    if (!volId) { setErr("Pick a volunteer (add one under Volunteer People first)."); return; }
    setSaving(true); setErr(null);
    try {
      const { error } = await supabase.from("volunteer_recognition").insert({
        club_id: clubId, volunteer_id: volId, kind, badge: kind,
        reason: reason.trim() || null, status: "published",
      });
      if (error) throw error;
      setOpen(false);
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not save recognition.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fade">
      <SectionHead eyebrow="Say thanks" title="Recognition"
        sub="Celebrate the people who make the club run — record a thank-you, award or milestone."
        right={<Btn icon="award" onClick={openAdd}>New recognition</Btn>} />
      {loading ? <Loading />
        : rows.length === 0 ? <EmptyState icon="award" title="No recognition yet" sub="Give a volunteer a shout-out."
            action={<Btn icon="award" onClick={openAdd}>New recognition</Btn>} />
        : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
            {rows.map(r => (
              <Card key={r.id} pad={16}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{r.volunteer?.person?.full_name ?? "Volunteer"}</span>
                  <Pill bg={T.amberSoft} fg={T.amber}>{r.kind}</Pill>
                </div>
                {r.reason && <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>{r.reason}</p>}
              </Card>
            ))}
          </div>
        )}

      {open && (
        <Modal title="New recognition" busy={saving} onClose={() => setOpen(false)}>
          <Field label="Volunteer *">
            <select value={volId} onChange={e => setVolId(e.target.value)} style={fieldInput}>
              {vols.length === 0 && <option value="">No volunteers yet</option>}
              {vols.map(v => <option key={v.id} value={v.id}>{v.person?.full_name ?? "Volunteer"}</option>)}
            </select>
          </Field>
          <Field label="Type">
            <select value={kind} onChange={e => setKind(e.target.value)} style={fieldInput}>
              {KINDS.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </Field>
          <Field label="Reason / message"><textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="e.g. Ran the canteen every home game this season." style={{ ...fieldInput, resize: "vertical" }} /></Field>
          {err && <FormError>{err}</FormError>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <Btn kind="ghost" onClick={() => !saving && setOpen(false)}>Cancel</Btn>
            <Btn onClick={save}>{saving ? "Saving…" : "Save"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function Recognition() {
  return <Gate feature="recognition_automation"><RecognitionInner /></Gate>;
}
