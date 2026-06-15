import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useApp } from "../context/AppContext";
import { Card, SectionHead, Loading, Btn } from "../components/ui";
import { Gate } from "../components/Gate";
import { T } from "../lib/theme";

export function Reports() {
  const { clubId } = useApp();
  const [hours, setHours] = useState<number>(0);
  const [active, setActive] = useState<number>(0);
  const [perHour, setPerHour] = useState<number>(40);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const since = new Date(); since.setDate(1);
      const [{ data: h }, act, { data: settings }] = await Promise.all([
        supabase.from("volunteer_hours").select("hours").eq("club_id", clubId).gte("occurred_on", since.toISOString().slice(0, 10)),
        supabase.from("volunteers").select("*", { count: "exact", head: true }).eq("club_id", clubId).eq("status", "active"),
        supabase.from("volunteer_settings").select("volunteer_value_per_hour").eq("club_id", clubId).maybeSingle(),
      ]);
      if (cancelled) return;
      setHours(((h as { hours: number }[]) ?? []).reduce((s, r) => s + Number(r.hours || 0), 0));
      setActive(act.count ?? 0);
      if (settings?.volunteer_value_per_hour) setPerHour(Number(settings.volunteer_value_per_hour));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [clubId]);

  if (loading) return <Loading />;

  const value = `$${(hours * perHour).toLocaleString()}`;
  const tiles: [string, string, string][] = [
    [String(hours), "Hours this month", T.ink],
    [String(active), "Active volunteers", T.ink],
    [value, "Volunteer value (mth)", T.green],
  ];

  return (
    <div className="fade">
      <SectionHead eyebrow="For your committee" title="Reports"
        sub="The headline numbers always; the deeper analysis and exports on the Club plan." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, marginBottom: 20 }}>
        {tiles.map(([v, l, c]) => (
          <Card key={l} pad={16}>
            <div className="disp" style={{ fontSize: 34, color: c }}>{v}</div>
            <div style={{ fontSize: 12.5, color: T.muted, marginTop: 4 }}>{l}</div>
          </Card>
        ))}
      </div>

      <Gate feature="advanced_reports">
        <Card pad={18}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Advanced reports</div>
          <p style={{ fontSize: 13.5, color: T.muted, margin: "0 0 14px" }}>Hours by team & role, burnout watch, compliance gaps, and the season contribution report. Charts port from the prototype.</p>
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
            <Btn kind="ghost" icon="report">Export PDF</Btn>
            <Btn kind="ghost">CSV</Btn>
          </div>
        </Card>
      </Gate>
    </div>
  );
}
