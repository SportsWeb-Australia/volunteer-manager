import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useApp } from "../context/AppContext";
import type { VolunteerRole } from "../lib/types";
import { Card, SectionHead, Pill, Icon, Loading, EmptyState, Btn } from "../components/ui";
import { T } from "../lib/theme";

const risk = (r: string): [string, string] =>
  r === "high" ? [T.redSoft, T.red] : r === "medium" ? [T.amberSoft, T.amber] : [T.greenSoft, T.green];

export function Roles() {
  const { clubId } = useApp();
  const [rows, setRows] = useState<VolunteerRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      // A club's active roles; fall back to the shared template library if none yet.
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
      if (!cancelled) { setRows(result); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [clubId]);

  return (
    <div className="fade">
      <SectionHead eyebrow="Role library" title="Roles & position descriptions"
        sub="A ready-made library of local club roles. The one-sentence AI position-description generator ports from the prototype and writes to volunteer_roles."
        right={<Btn icon="spark">Generate role</Btn>} />
      {loading ? <Loading />
        : rows.length === 0 ? <EmptyState icon="role" title="No roles yet" sub="Add a role or generate one from a sentence." />
        : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 }}>
            {rows.map(r => {
              const [bg, fg] = risk(r.risk_level ?? "low");
              return (
                <Card key={r.id} className="lift" pad={15}>
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
    </div>
  );
}
