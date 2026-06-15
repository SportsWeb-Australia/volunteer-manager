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
        right={<Gate feature="automated_reminders" fallback={null}><Btn icon="bell">Send expiry reminders</Btn></Gate>} />
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
