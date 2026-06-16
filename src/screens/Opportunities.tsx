import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useApp } from "../context/AppContext";
import { Card, SectionHead, Pill, Icon, Loading, EmptyState, Btn, Modal, Field, FormError, fieldInput } from "../components/ui";
import { T } from "../lib/theme";

interface Opp {
  id: string; title: string; starts_at: string | null; location: string | null;
  volunteers_needed: number; visibility: string; status: string; signup_token: string;
  applications?: { count: number }[];
}

const SELECT = "id,title,starts_at,location,volunteers_needed,visibility,status,signup_token,applications:volunteer_applications(count)";

export function Opportunities() {
  const { clubId } = useApp();
  const [opps, setOpps] = useState<Opp[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  // create modal
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const [location, setLocation] = useState("");
  const [needed, setNeeded] = useState("1");
  const [visibility, setVisibility] = useState("public");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    if (!clubId) return;
    setLoading(true);
    const { data } = await supabase.from("volunteer_opportunities").select(SELECT)
      .eq("club_id", clubId).order("created_at", { ascending: false });
    setOpps((data as unknown as Opp[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { if (clubId) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [clubId]);

  const linkFor = (token: string) => `${window.location.origin}/v/${token}`;
  const copy = async (token: string) => {
    try { await navigator.clipboard.writeText(linkFor(token)); setCopied(token); setTimeout(() => setCopied(null), 1800); } catch { /* ignore */ }
  };

  const openAdd = () => {
    setTitle(""); setWhen(""); setLocation(""); setNeeded("1"); setVisibility("public"); setErr(null);
    setAdding(true);
  };

  const save = async () => {
    if (!clubId) return;
    const t = title.trim();
    if (!t) { setErr("Please enter a title."); return; }
    setSaving(true); setErr(null);
    try {
      const { error } = await supabase.from("volunteer_opportunities").insert({
        club_id: clubId,
        title: t,
        starts_at: when ? new Date(when).toISOString() : null,
        location: location.trim() || null,
        volunteers_needed: Math.max(1, parseInt(needed, 10) || 1),
        visibility,
        status: "open",
        signup_token: crypto.randomUUID(),
      });
      if (error) throw error;
      setAdding(false);
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not create sign-up.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fade">
      <SectionHead eyebrow="Recruit · publish anywhere" title="Volunteer sign-ups"
        sub="Post a sign-up once and share the public link or QR — members put their hand up in one tap, no login. Responses land in Applications for you to approve."
        right={<Btn icon="mega" onClick={openAdd}>New sign-up</Btn>} />
      {loading ? <Loading />
        : opps.length === 0 ? <EmptyState icon="mega" title="No volunteer sign-ups yet" sub="Create one and share its link/QR to the website, socials or the ground."
            action={<Btn icon="mega" onClick={openAdd}>New sign-up</Btn>} />
        : (
          <div style={{ display: "grid", gap: 12 }}>
            {opps.map(o => {
              const got = o.applications?.[0]?.count ?? 0;
              const pct = Math.min(100, Math.round((got / Math.max(1, o.volunteers_needed)) * 100));
              const tone = pct >= 100 ? T.green : pct >= 50 ? T.amber : T.red;
              return (
                <Card key={o.id} pad={16}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15.5 }}>{o.title}</div>
                      <div style={{ fontSize: 12.5, color: T.muted, marginTop: 4, display: "flex", gap: 12, flexWrap: "wrap" }}>
                        {o.starts_at && <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}><Icon n="clock" s={13} c={T.muted} />{new Date(o.starts_at).toLocaleString()}</span>}
                        {o.location && <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}><Icon n="cal" s={13} c={T.muted} />{o.location}</span>}
                      </div>
                    </div>
                    <Pill bg="#EFE9DC" fg={T.muted}><Icon n="eye" s={12} c={T.muted} />{o.visibility}</Pill>
                  </div>
                  <div style={{ margin: "13px 0 6px", display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                    <span style={{ color: T.muted }}>Responses</span>
                    <span style={{ fontWeight: 700, color: tone }}>{got} of {o.volunteers_needed}</span>
                  </div>
                  <div style={{ height: 8, background: "#EEE9DD", borderRadius: 99, overflow: "hidden" }}>
                    <div className="barfill" style={{ width: pct + "%", height: "100%", background: tone }} />
                  </div>
                  {o.visibility === "public" && (
                    <div style={{ display: "flex", gap: 8, marginTop: 13, flexWrap: "wrap", alignItems: "center" }}>
                      <Btn sm kind="ghost" icon="qr" onClick={() => copy(o.signup_token)}>{copied === o.signup_token ? "Copied!" : "Copy signup link"}</Btn>
                      <span className="mono" style={{ fontSize: 11, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260 }}>/v/{o.signup_token}</span>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

      {adding && (
        <Modal title="New volunteer sign-up" busy={saving} onClose={() => setAdding(false)}>
          <Field label="Title *">
            <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Saturday canteen helpers" style={fieldInput} />
          </Field>
          <Field label="When (optional)">
            <input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} style={fieldInput} />
          </Field>
          <Field label="Location (optional)">
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Main oval canteen" style={fieldInput} />
          </Field>
          <Field label="Volunteers needed">
            <input type="number" min={1} value={needed} onChange={e => setNeeded(e.target.value)} style={fieldInput} />
          </Field>
          <Field label="Visibility">
            <select value={visibility} onChange={e => setVisibility(e.target.value)} style={{ ...fieldInput, textTransform: "capitalize" }}>
              <option value="public">Public — share a sign-up link/QR</option>
              <option value="internal">Internal — staff only</option>
            </select>
          </Field>

          {err && <FormError>{err}</FormError>}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <Btn kind="ghost" onClick={() => !saving && setAdding(false)}>Cancel</Btn>
            <Btn onClick={save}>{saving ? "Saving…" : "Create sign-up"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
