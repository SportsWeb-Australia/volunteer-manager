import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useApp } from "../context/AppContext";
import { Card, SectionHead, Icon, Loading, EmptyState, Btn, Modal, Field, FormError, fieldInput } from "../components/ui";
import { T } from "../lib/theme";

interface Evt { id: string; title: string; event_date: string | null; location: string | null; description: string | null; }

export function Events() {
  const { clubId } = useApp();
  const [rows, setRows] = useState<Evt[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    if (!clubId) return;
    setLoading(true);
    const { data } = await supabase.from("events")
      .select("id,title,event_date,location,description")
      .eq("club_id", clubId).order("event_date", { ascending: false });
    setRows((data as Evt[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { if (clubId) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [clubId]);

  const openAdd = () => { setTitle(""); setWhen(""); setLocation(""); setDescription(""); setErr(null); setOpen(true); };

  const save = async () => {
    if (!clubId) return;
    const t = title.trim();
    if (!t) { setErr("Please enter an event name."); return; }
    setSaving(true); setErr(null);
    try {
      const { error } = await supabase.from("events").insert({
        club_id: clubId, title: t,
        event_date: when ? new Date(when).toISOString() : null,
        location: location.trim() || null,
        description: description.trim() || null,
      });
      if (error) throw error;
      setOpen(false);
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not create event.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fade">
      <SectionHead eyebrow="Club calendar" title="Events"
        sub="Club events that need volunteers. Create the event here, then post a sign-up or build a roster for it."
        right={<Btn icon="spark" onClick={openAdd}>New event</Btn>} />
      {loading ? <Loading />
        : rows.length === 0 ? <EmptyState icon="spark" title="No events yet" sub="Add your first club event."
            action={<Btn icon="spark" onClick={openAdd}>New event</Btn>} />
        : (
          <div style={{ display: "grid", gap: 12 }}>
            {rows.map(e => (
              <Card key={e.id} pad={16}>
                <div style={{ fontWeight: 700, fontSize: 15.5 }}>{e.title}</div>
                <div style={{ fontSize: 12.5, color: T.muted, marginTop: 4, display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {e.event_date && <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}><Icon n="clock" s={13} c={T.muted} />{new Date(e.event_date).toLocaleString()}</span>}
                  {e.location && <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}><Icon n="cal" s={13} c={T.muted} />{e.location}</span>}
                </div>
                {e.description && <p style={{ fontSize: 13.5, color: T.ink, margin: "10px 0 0" }}>{e.description}</p>}
              </Card>
            ))}
          </div>
        )}

      {open && (
        <Modal title="New event" busy={saving} onClose={() => setOpen(false)}>
          <Field label="Event name *"><input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Presentation night" style={fieldInput} /></Field>
          <Field label="When (optional)"><input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} style={fieldInput} /></Field>
          <Field label="Location (optional)"><input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Clubrooms" style={fieldInput} /></Field>
          <Field label="Description (optional)"><textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ ...fieldInput, resize: "vertical" }} /></Field>
          {err && <FormError>{err}</FormError>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <Btn kind="ghost" onClick={() => !saving && setOpen(false)}>Cancel</Btn>
            <Btn onClick={save}>{saving ? "Saving…" : "Create event"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
