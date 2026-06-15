import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useApp } from "../context/AppContext";
import { Card, SectionHead, Pill, Icon, Loading, EmptyState, Btn } from "../components/ui";
import { T } from "../lib/theme";

interface Opp {
  id: string; title: string; starts_at: string | null; location: string | null;
  volunteers_needed: number; visibility: string; status: string; signup_token: string;
  applications?: { count: number }[];
}

export function Opportunities() {
  const { clubId } = useApp();
  const [opps, setOpps] = useState<Opp[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("volunteer_opportunities")
        .select("id,title,starts_at,location,volunteers_needed,visibility,status,signup_token,applications:volunteer_applications(count)")
        .eq("club_id", clubId).order("created_at", { ascending: false });
      if (!cancelled) { setOpps((data as unknown as Opp[]) ?? []); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [clubId]);

  const linkFor = (token: string) => `${window.location.origin}/v/${token}`;
  const copy = async (token: string) => {
    try { await navigator.clipboard.writeText(linkFor(token)); setCopied(token); setTimeout(() => setCopied(null), 1800); } catch { /* ignore */ }
  };

  return (
    <div className="fade">
      <SectionHead eyebrow="Recruit · publish anywhere" title="Opportunities"
        sub="Post a job once and share the public link or QR — members put their hand up in one tap, no login. Responses land in Applications for you to approve."
        right={<Btn icon="mega">New opportunity</Btn>} />
      {loading ? <Loading />
        : opps.length === 0 ? <EmptyState icon="mega" title="No opportunities yet" sub="Create one and share its link/QR to the website, socials or the ground." />
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
    </div>
  );
}
