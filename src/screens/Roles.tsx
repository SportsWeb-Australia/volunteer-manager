import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useApp } from "../context/AppContext";
import type { VolunteerRole } from "../lib/types";
import { Card, SectionHead, Pill, Icon, Loading, EmptyState, Btn, Modal, Field, FormError, fieldInput } from "../components/ui";
import { T } from "../lib/theme";

const risk = (r: string): [string, string] =>
  r === "high" ? [T.redSoft, T.red] : r === "medium" ? [T.amberSoft, T.amber] : [T.greenSoft, T.green];

export function Roles() {
  const { clubId } = useApp();
  const [rows, setRows] = useState<VolunteerRole[]>([]);
  const [loading, setLoading] = useState(true);

  // add/edit modal
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [riskLevel, setRiskLevel] = useState("low");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    if (!clubId) return;
    setLoading(true);
    const { data: roles } = await supabase.from("volunteer_roles")
      .select("id,club_id,title,category,risk_level,required_checks,reports_to,status")
      .eq("club_id", clubId).eq("status", "active").order("title");
    let result = (roles as VolunteerRole[]) ?? [];
    if (result.length === 0) {
      const { data: tmpl } = await supabase.from("volunteer_role_templates")
        .select("id,title,category,risk_level,required_checks,reports_to")
        .is("club_id", null).eq("is_system", true).order("title");
      result = ((tmpl as unknown as VolunteerRole[]) ?? []);
    }
    setRows(result);
    setLoading(false);
  };

  useEffect(() => { if (clubId) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [clubId]);

  const openAdd = () => { setEditingId(null); setTitle(""); setCategory(""); setRiskLevel("low"); setErr(null); setOpen(true); };

  const openCard = (r: VolunteerRole) => {
    // a real club role is editable; a template seeds a new club role
    setEditingId(r.club_id === clubId ? r.id : null);
    setTitle(r.title); setCategory(r.category ?? ""); setRiskLevel(r.risk_level ?? "low"); setErr(null);
    setOpen(true);
  };

  const save = async () => {
    if (!clubId) return;
    const t = title.trim();
    if (!t) { setErr("Please enter a role title."); return; }
    setSaving(true); setErr(null);
    const fields = { title: t, category: category.trim() || null, risk_level: riskLevel };
    try {
      if (editingId) {
        const { error } = await supabase.from("volunteer_roles").update(fields).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("volunteer_roles").insert({ club_id: clubId, status: "active", ...fields });
        if (error) throw error;
      }
      setOpen(false);
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not save role.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!editingId) return;
    if (!confirm("Delete this role?")) return;
    setSaving(true); setErr(null);
    try {
      // soft-delete keeps any history intact
      const { error } = await supabase.from("volunteer_roles").update({ status: "archived" }).eq("id", editingId);
      if (error) throw error;
      setOpen(false);
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not delete role.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fade">
      <SectionHead eyebrow="Role library" title="Roles & position descriptions"
        sub="A ready-made library of common club roles — tap any card to edit it, or add your own and set its risk level."
        right={<Btn icon="role" onClick={openAdd}>New role</Btn>} />
      {loading ? <Loading />
        : rows.length === 0 ? <EmptyState icon="role" title="No roles yet" sub="Add the roles your club needs filled."
            action={<Btn icon="role" onClick={openAdd}>New role</Btn>} />
        : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 }}>
            {rows.map(r => {
              const [bg, fg] = risk(r.risk_level ?? "low");
              return (
                <Card key={r.id} className="lift" pad={15} style={{ cursor: "pointer" }} onClick={() => openCard(r)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{r.title}</span>
                    <Pill bg={bg} fg={fg}>{r.risk_level} risk</Pill>
                  </div>
                  {r.category && <Pill bg="#EFE9DC" fg={T.muted}>{r.category}</Pill>}
                  {r.reports_to && <div style={{ fontSize: 12.5, color: T.muted, margin: "10px 0 0", display: "flex", gap: 6, alignItems: "center" }}><Icon n="people" s={14} c={T.muted} />Reports to {r.reports_to}</div>}
                  {(r.required_checks?.length ?? 0) > 0 && (
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 10 }}>
                      {r.required_checks!.map(c => <Pill key={c} bg={T.redSoft} fg={T.red}>{c}</Pill>)}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

      {open && (
        <Modal title={editingId ? "Edit role" : "New role"} busy={saving} onClose={() => setOpen(false)}>
          <Field label="Role title *">
            <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Canteen coordinator" style={fieldInput} />
          </Field>
          <Field label="Category (optional)">
            <input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Game day" style={fieldInput} />
          </Field>
          <Field label="Risk level">
            <select value={riskLevel} onChange={e => setRiskLevel(e.target.value)} style={{ ...fieldInput, textTransform: "capitalize" }}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </Field>

          {err && <FormError>{err}</FormError>}

          <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
            <div>{editingId && <Btn kind="ghost" onClick={remove}>Delete</Btn>}</div>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn kind="ghost" onClick={() => !saving && setOpen(false)}>Cancel</Btn>
              <Btn onClick={save}>{saving ? "Saving…" : editingId ? "Save changes" : "Create role"}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
