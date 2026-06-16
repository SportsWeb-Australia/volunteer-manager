import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useApp } from "../context/AppContext";
import { Card, SectionHead, Dot, Loading, EmptyState } from "../components/ui";
import { Gate } from "../components/Gate";
import { Btn } from "../components/ui";
import { T } from "../lib/theme";

interface Row { id: string; check_type: string; expires_on: string | null; status: string; volunteer_id: string; person_name?: string; }

const dotFor = (s: string): "green" | "amber" | "red" | "grey" =>
  s === "valid" ? "green" : s === "expiring_soon" ? "amber" : s === "expired" || s === "missing" ? "red" : "grey";

export function Compliance() {
  const { clubId } = useApp();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const sendReminders = async () => {
    if (!clubId) return;
    setBusy(true); setNote(null);
    try {
      const affected = rows.filter(r => ["expiring_soon", "expired", "missing"].includes(r.status));
      const ids = [...new Set(affected.map(r => r.volunteer_id))];
      if (ids.length === 0) { setNote("All checks are valid — no reminders needed right now."); return; }
      const { error } = await supabase.from("volunteer_messages").insert({
        club_id: clubId,
        title: "Compliance reminder",
        subject: "Your club check needs updating",
        body: "Hi {name}, one or more of your volunteer checks is expiring or has expired. Please renew it when you get a chance — thanks for keeping the club safe!",
        channels: ["email"],
        audience: { volunteer_ids: ids },
        status: "draft",
      });
      if (error) throw error;
      setNote(`Drafted an email reminder for ${ids.length} volunteer${ids.length === 1 ? "" : "s"}. Review and send it from Communications.`);
    } catch (e: unknown) {
      setNote(e instanceof Error ? e.message : "Could not draft reminders.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("volunteer_compliance_records")
        .select("id,check_type,expires_on,status,volunteer_id,volunteer:volunteers(person:people(full_name))")
        .eq("club_id", clubId).order("expires_on", { nullsFirst: false });
      const mapped: Row[] = ((data as any[]) ?? []).map(d => ({
        id: d.id, check_type: d.check_type, expires_on: d.expires_on, status: d.status, volunteer_id: d.volunteer_id,
        person_name: d.volunteer?.person?.full_name ?? "Volunteer",
      }));
      if (!cancelled) { setRows(mapped); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [clubId]);

  return (
    <div className="fade">
      <SectionHead eyebrow="Child safety first" title="Compliance"
        sub="Traffic lights on every check. Anyone red can't be assigned to a restricted role unless an authorised admin overrides."
        right={<Gate feature="automated_reminders" fallback={null}><Btn icon="bell" onClick={sendReminders}>{busy ? "Drafting…" : "Send expiry reminders"}</Btn></Gate>} />
      {note && <Card pad={13} style={{ marginBottom: 14, fontSize: 13.5, color: T.ink, background: T.greenSoft, borderColor: "#CDE6D8" }}>{note}</Card>}
      {loading ? <Loading />
        : rows.length === 0 ? <EmptyState icon="shield" title="No compliance records yet" sub="Checks appear here as volunteers upload WWCC, First Aid and other documents." />
        : (
          <Card pad={0} style={{ overflow: "hidden" }}>
            {rows.map((r, i) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderTop: i ? `1px solid ${T.line}` : "none", fontSize: 13.5 }}>
                <Dot k={dotFor(r.status)} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b>{r.person_name}</b> <span style={{ color: T.muted }}>· {r.check_type}</span>
                </div>
                <span style={{ color: r.status === "expired" || r.status === "missing" ? T.red : T.muted, fontWeight: 500 }}>
                  {r.status.replace("_", " ")}{r.expires_on ? ` · ${r.expires_on}` : ""}
                </span>
              </div>
            ))}
          </Card>
        )}
    </div>
  );
}
