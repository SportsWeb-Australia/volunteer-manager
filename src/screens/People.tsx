import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useApp } from "../context/AppContext";
import type { Volunteer } from "../lib/types";
import { Card, SectionHead, Avatar, StatusPill, Loading, EmptyState, Btn } from "../components/ui";
import { T } from "../lib/theme";

const PALETTE = [T.red, T.navy3, "#5A6B2B", "#7A4A1E", T.blue, "#7A2B57", "#1E6E5C"];
const ci = (s: string) => PALETTE[(s.charCodeAt(0) + s.length) % PALETTE.length];
const FILTERS = ["All", "active", "applied", "approved", "paused", "prospect"];

export function People() {
  const { clubId } = useApp();
  const [rows, setRows] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("volunteers")
        .select("id,status,person:people(id,full_name,mobile,email),profile:volunteer_profiles(preferred_roles,internal_tags)")
        .eq("club_id", clubId)
        .order("status");
      if (!cancelled) { setRows((data as unknown as Volunteer[]) ?? []); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [clubId]);

  const list = useMemo(() => rows.filter(r => {
    const name = r.person?.full_name?.toLowerCase() ?? "";
    const roles = (r.profile?.preferred_roles ?? []).join(" ").toLowerCase();
    return (filter === "All" || r.status === filter) && (name.includes(q.toLowerCase()) || roles.includes(q.toLowerCase()));
  }), [rows, q, filter]);

  return (
    <div className="fade">
      <SectionHead eyebrow="People Hub · volunteer view" title="Volunteer people"
        sub="One person record, shared across the whole club — volunteer details extend the existing People Hub contact, never a duplicate."
        right={<Btn icon="people">Add volunteer</Btn>} />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name or role…"
          style={{ flex: "1 1 220px", padding: "10px 14px", borderRadius: 11, border: `1px solid ${T.line}`, fontSize: 14, fontFamily: "inherit", background: "#fff" }} />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ border: `1px solid ${filter === f ? T.navy : T.line}`, background: filter === f ? T.navy : "#fff", color: filter === f ? "#fff" : T.ink, padding: "8px 13px", borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: "pointer", textTransform: f === "All" ? "none" : "capitalize" }}>{f}</button>
          ))}
        </div>
      </div>

      {loading ? <Loading />
        : list.length === 0
        ? <EmptyState icon="people" title="No volunteers yet" sub="Once people put their hand up through an opportunity, they'll appear here ready to approve." />
        : (
          <Card pad={0} style={{ overflow: "hidden" }}>
            {list.map((r, i) => {
              const name = r.person?.full_name ?? "Unknown";
              const roles = (r.profile?.preferred_roles ?? []).join(", ");
              return (
                <div key={r.id} className="row-hover" style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", borderTop: i ? `1px solid ${T.line}` : "none", cursor: "pointer" }}>
                  <Avatar name={name} color={ci(name)} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14.5 }}>{name}</div>
                    <div style={{ fontSize: 12.5, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{roles || "No preferred roles yet"}</div>
                  </div>
                  <StatusPill s={r.status} />
                </div>
              );
            })}
          </Card>
        )}
    </div>
  );
}
