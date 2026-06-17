import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useApp } from "../context/AppContext";
import { Card, SectionHead, Pill, Loading, EmptyState, Btn, Modal, Field, FormError, fieldInput } from "../components/ui";
import { Gate } from "../components/Gate";
import { T } from "../lib/theme";

interface Fb { id: string; survey_type: string | null; rating: number | null; comment: string | null; created_at: string; volunteer?: { person?: { full_name: string | null } | null } | null; }
interface VOpt { id: string; person?: { full_name: string | null } | null; }

const TYPES = ["Post-shift pulse", "Season survey", "General feedback"];

function SurveysInner() {
  const { clubId } = useApp();
  const [rows, setRows] = useState<Fb[]>([]);
  const [vols, setVols] = useState<VOpt[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [volId, setVolId] = useState("");
  const [type, setType] = useState(TYPES[0]);
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    if (!clubId) return;
    setLoading(true);
    const [{ data }, { data: v }] = await Promise.all([
      supabase.from("volunteer_feedback")
        .select("id,survey_type,rating,comment,created_at,volunteer:volunteers(person:people(full_name))")
        .eq("club_id", clubId).order("created_at", { ascending: false }),
      supabase.from("volunteers").select("id,person:people(full_name)").eq("club_id", clubId),
    ]);
    setRows((data as unknown as Fb[]) ?? []);
    setVols((v as unknown as VOpt[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { if (clubId) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [clubId]);

  const openAdd = () => { setVolId(""); setType(TYPES[0]); setRating("5"); setComment(""); setErr(null); setOpen(true); };

  const avg = rows.length ? (rows.reduce((s, r) => s + (r.rating ?? 0), 0) / rows.filter(r => r.rating != null).length || 0) : 0;

  const save = async () => {
    if (!clubId) return;
    setSaving(true); setErr(null);
    try {
      const { error } = await supabase.from("volunteer_feedback").insert({
        club_id: clubId,
        volunteer_id: volId || null,
        survey_type: type,
        rating: Math.max(1, Math.min(5, parseInt(rating, 10) || 5)),
        comment: comment.trim() || null,
        status: "received",
      });
      if (error) throw error;
      setOpen(false);
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not save feedback.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fade">
      <SectionHead eyebrow="Listen & improve" title="Surveys & Feedback"
        sub="Capture how volunteers are feeling. Ratings and comments collect here so you can spot issues early."
        right={<Btn icon="survey" onClick={openAdd}>Log feedback</Btn>} />
      {!loading && rows.length > 0 && (
        <Card pad={16} style={{ marginBottom: 14, display: "inline-block" }}>
          <div className="disp" style={{ fontSize: 30, color: T.ink }}>{avg ? avg.toFixed(1) : "—"}<span style={{ fontSize: 15, color: T.muted }}> / 5</span></div>
          <div style={{ fontSize: 12.5, color: T.muted, marginTop: 2 }}>Average rating · {rows.length} response{rows.length === 1 ? "" : "s"}</div>
        </Card>
      )}
      {loading ? <Loading />
        : rows.length === 0 ? <EmptyState icon="survey" title="No feedback yet" sub="Log a response to start tracking how your volunteers feel."
            action={<Btn icon="survey" onClick={openAdd}>Log feedback</Btn>} />
        : (
          <Card pad={0} style={{ overflow: "hidden" }}>
            {rows.map((r, i) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderTop: i ? `1px solid ${T.line}` : "none", fontSize: 13.5 }}>
                <Pill bg={T.blueSoft} fg={T.blue}>{r.rating ?? "—"}/5</Pill>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{r.volunteer?.person?.full_name ?? "Anonymous"} <span style={{ color: T.muted, fontWeight: 400 }}>· {r.survey_type}</span></div>
                  {r.comment && <div style={{ color: T.muted, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.comment}</div>}
                </div>
              </div>
            ))}
          </Card>
        )}

      {open && (
        <Modal title="Log feedback" busy={saving} onClose={() => setOpen(false)}>
          <Field label="Volunteer (optional)">
            <select value={volId} onChange={e => setVolId(e.target.value)} style={fieldInput}>
              <option value="">Anonymous</option>
              {vols.map(v => <option key={v.id} value={v.id}>{v.person?.full_name ?? "Volunteer"}</option>)}
            </select>
          </Field>
          <Field label="Type">
            <select value={type} onChange={e => setType(e.target.value)} style={fieldInput}>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Rating (1–5)">
            <select value={rating} onChange={e => setRating(e.target.value)} style={fieldInput}>
              {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </Field>
          <Field label="Comment"><textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} style={{ ...fieldInput, resize: "vertical" }} /></Field>
          {err && <FormError>{err}</FormError>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <Btn kind="ghost" onClick={() => !saving && setOpen(false)}>Cancel</Btn>
            <Btn onClick={save}>{saving ? "Saving…" : "Save feedback"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function Surveys() {
  return <Gate feature="surveys"><SurveysInner /></Gate>;
}
