import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useApp } from "../context/AppContext";
import type { AiSuggestion } from "../lib/types";
import { Card, SectionHead, Icon, Btn, ReviewChip, Loading } from "../components/ui";
import { T } from "../lib/theme";

interface Counts { active: number; unfilled: number; newApps: number; expiring: number; }

export function Dashboard() {
  const { clubId, clubName } = useApp();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [ai, setAi] = useState<AiSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const head = { count: "exact" as const, head: true };
      const [active, unfilled, newApps, expiring, sugg] = await Promise.all([
        supabase.from("volunteers").select("*", head).eq("club_id", clubId).eq("status", "active"),
        supabase.from("volunteer_shifts").select("*", head).eq("club_id", clubId).eq("status", "open"),
        supabase.from("volunteer_applications").select("*", head).eq("club_id", clubId).eq("status", "new"),
        supabase.from("volunteer_compliance_records").select("*", head).eq("club_id", clubId).eq("status", "expiring_soon"),
        supabase.from("volunteer_ai_suggestions").select("id,type,title,summary,payload,confidence,status")
          .eq("club_id", clubId).eq("status", "needs_review").order("confidence", { ascending: false }).limit(6),
      ]);
      if (cancelled) return;
      setCounts({
        active: active.count ?? 0, unfilled: unfilled.count ?? 0,
        newApps: newApps.count ?? 0, expiring: expiring.count ?? 0,
      });
      setAi((sugg.data as AiSuggestion[]) ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [clubId]);

  const act = async (id: string, status: "approved" | "dismissed") => {
    setAi(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    await supabase.from("volunteer_ai_suggestions").update({ status, reviewed_at: new Date().toISOString() }).eq("id", id);
  };

  if (loading) return <Loading label="Loading your club…" />;

  const stats: [string | number, string, string][] = [
    [counts?.active ?? 0, "Active volunteers", T.ink],
    [counts?.unfilled ?? 0, "Unfilled shifts", T.amber],
    [counts?.newApps ?? 0, "New applications", T.green],
    [counts?.expiring ?? 0, "Checks expiring soon", T.amber],
  ];

  return (
    <div className="fade">
      <SectionHead eyebrow={clubName ?? "Your club"} title="Dashboard"
        sub="The system prepares everything below — you just review and approve. Nothing is sent without you." />

      <Card pad={0} style={{ overflow: "hidden", marginBottom: 22, borderColor: T.brandSoft }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", background: "linear-gradient(90deg,#E0F5F1,#EAF6F4)", borderBottom: `1px solid ${T.line}` }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: T.brand, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon n="spark" c="#fff" s={18} /></div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Suggested actions</div>
            <div style={{ fontSize: 12, color: T.muted }}>Prepared by SportsWeb AI · approve before anything happens</div>
          </div>
        </div>
        {ai.length === 0
          ? <div style={{ padding: 26, textAlign: "center", color: T.muted, fontSize: 14 }}>All caught up. 🧡</div>
          : ai.map((a, i) => (
            <div key={a.id} className="fade" style={{ display: "flex", gap: 13, padding: "15px 18px", borderTop: i ? `1px solid ${T.line}` : "none", alignItems: "flex-start" }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: "#F4EEE2", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}><Icon n="spark" s={17} c={T.navy} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600, fontSize: 14.5 }}>{a.title ?? "Suggested action"}</span>
                  {a.confidence != null && <span className="mono" style={{ fontSize: 10.5, color: T.muted, background: "#F1ECE0", padding: "2px 7px", borderRadius: 6 }}>{Math.round(a.confidence * 100)}%</span>}
                </div>
                {a.summary && <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>{a.summary}</div>}
                <div style={{ marginTop: 10, display: "flex", gap: 9, alignItems: "center", flexWrap: "wrap" }}>
                  {a.status === "approved"
                    ? <span style={{ display: "inline-flex", gap: 6, alignItems: "center", color: T.green, fontWeight: 700, border: `2px solid ${T.green}`, borderRadius: 8, padding: "3px 9px", fontSize: 12, transform: "rotate(-8deg)" }}><Icon n="check" s={14} c={T.green} />APPROVED</span>
                    : a.status === "dismissed"
                    ? <span style={{ fontSize: 12.5, color: T.muted }}>Dismissed</span>
                    : <>
                        <Btn sm kind="green" icon="check" onClick={() => act(a.id, "approved")}>Approve</Btn>
                        <Btn sm kind="ghost" icon="x" onClick={() => act(a.id, "dismissed")}>Dismiss</Btn>
                      </>}
                  <span style={{ marginLeft: "auto" }}><ReviewChip state={a.status === "approved" ? "Approved" : "Needs review"} /></span>
                </div>
              </div>
            </div>
          ))}
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
        {stats.map(([v, l, c]) => (
          <Card key={l} pad={16}>
            <div className="disp" style={{ fontSize: 34, color: c }}>{v}</div>
            <div style={{ fontSize: 12.5, color: T.muted, marginTop: 4, fontWeight: 500 }}>{l}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
