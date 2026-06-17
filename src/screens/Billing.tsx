import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useApp } from "../context/AppContext";
import { useEntitlement } from "../hooks/useEntitlement";
import { Card, SectionHead, Pill, Icon, Btn, Loading } from "../components/ui";
import { T } from "../lib/theme";

const SMS_PACKS: { sms: number; price: number }[] = [
  { sms: 100, price: 15 },
  { sms: 300, price: 39 },
  { sms: 1000, price: 99 },
];

interface Plan {
  id: string; key: string; name: string; blurb: string | null;
  tier_rank: number; price_monthly: number | null;
  included_in_sportsweb_tiers: string[] | null;
  features: { flags?: Record<string, boolean> };
}

const HIGHLIGHTS: [string, string][] = [
  ["ai_roster_builder", "AI roster builder"],
  ["channel_sms", "SMS messages"],
  ["channel_push", "Web push"],
  ["automated_reminders", "Automated reminders"],
  ["advanced_reports", "Advanced reports & exports"],
  ["surveys", "Surveys"],
  ["recognition_automation", "Recognition automation"],
  ["association_rollups", "Association rollups"],
  ["api_access", "API access"],
];

export function Billing() {
  const { clubId } = useApp();
  const { plan: currentKey } = useEntitlement();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [quota, setQuota] = useState<{ used: number; allowance: number; credits: number; trial: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("volunteer_plans")
        .select("id,key,name,blurb,tier_rank,price_monthly,included_in_sportsweb_tiers,features")
        .is("club_id", null).eq("status", "active").order("tier_rank");
      if (!cancelled) { setPlans((data as Plan[]) ?? []); setLoading(false); }
      if (clubId) {
        const { data: q } = await supabase.rpc("vm_sms_quota", { p_club: clubId });
        if (!cancelled && q && typeof (q as { allowance?: number }).allowance === "number") {
          setQuota(q as { used: number; allowance: number; credits: number; trial: boolean });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [clubId]);

  const checkout = async (kind: "sms_pack" | "plan", opts: Record<string, unknown>) => {
    if (!clubId) return;
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { club_id: clubId, kind, ...opts, success_url: window.location.href, cancel_url: window.location.href },
    });
    const d = data as { url?: string; configured?: boolean; note?: string } | null;
    if (error) { alert("Couldn't start checkout. Please try again."); return; }
    if (d?.url) { window.location.href = d.url; return; }
    if (d?.configured === false) { alert("Online checkout isn't switched on yet — add the payment provider keys to enable it."); return; }
    alert(d?.note ?? "Checkout isn't available for this item yet.");
  };

  if (loading) return <Loading />;

  return (
    <div className="fade">
      <SectionHead eyebrow="Plan & billing" title="Your plan"
        sub="Volunteer Manager is free at certain SportsWeb One tiers, or available standalone. Checkout & changes run through the billing-sync Edge Function (Phase C)." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14 }}>
        {plans.map(p => {
          const current = p.key === currentKey;
          const flags = p.features?.flags ?? {};
          return (
            <Card key={p.id} pad={20} style={{ border: current ? `2px solid ${T.brand}` : `1px solid ${T.line}`, position: "relative" }}>
              {current && <span style={{ position: "absolute", top: 14, right: 14 }}><Pill bg={T.brandSoft} fg={T.brandDeep}>Your plan</Pill></span>}
              <div className="disp" style={{ fontSize: 22 }}>{p.name.replace("Volunteer Manager — ", "")}</div>
              <div style={{ margin: "6px 0 12px" }}>
                <span className="disp" style={{ fontSize: 30, color: T.ink }}>{p.price_monthly ? `$${p.price_monthly}` : "Free"}</span>
                {p.price_monthly ? <span style={{ color: T.muted, fontSize: 13 }}> /mo</span> : null}
              </div>
              {p.blurb && <p style={{ fontSize: 13, color: T.muted, margin: "0 0 12px", minHeight: 56 }}>{p.blurb}</p>}
              {(p.included_in_sportsweb_tiers?.length ?? 0) > 0 && (
                <div style={{ fontSize: 11.5, color: T.green, marginBottom: 12, fontWeight: 600 }}>
                  Free on SportsWeb One: {p.included_in_sportsweb_tiers!.map(t => t.replace("sw1_", "")).join(", ")}
                </div>
              )}
              <div style={{ display: "grid", gap: 7, marginBottom: 16 }}>
                {HIGHLIGHTS.map(([k, label]) => (
                  <div key={k} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5, color: flags[k] ? T.ink : "#B8B2A4" }}>
                    <Icon n={flags[k] ? "check" : "x"} s={14} c={flags[k] ? T.green : "#C7C0B0"} />{label}
                  </div>
                ))}
              </div>
              {current
                ? <Btn kind="ghost" full>Current plan</Btn>
                : <Btn kind="primary" icon="bolt" full onClick={() => checkout("plan", { plan_key: p.key, amount: p.price_monthly })}>Choose {p.name.replace("Volunteer Manager — ", "")}</Btn>}
            </Card>
          );
        })}
      </div>

      <div style={{ marginTop: 30 }}>
        <SectionHead eyebrow="Top up" title="SMS packs"
          sub="Email and push are unlimited on every plan. SMS is metered — top up any time, and packs never expire." />
        {quota && (
          <Card pad={16} style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13.5 }}>This month: <b>{quota.used}</b> of <b>{quota.allowance}</b> SMS used
              {quota.credits > 0 && <> · <b>{quota.credits}</b> credit{quota.credits === 1 ? "" : "s"} in reserve</>}</span>
            {quota.trial && <Pill bg={T.brandSoft} fg={T.brandDeep}>Free trial</Pill>}
          </Card>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
          {SMS_PACKS.map(p => (
            <Card key={p.sms} pad={18}>
              <div className="disp" style={{ fontSize: 24 }}>{p.sms.toLocaleString()} SMS</div>
              <div style={{ margin: "4px 0 14px" }}><span className="disp" style={{ fontSize: 26, color: T.ink }}>${p.price}</span></div>
              <Btn full icon="bolt" onClick={() => checkout("sms_pack", { sms_count: p.sms, amount: p.price })}>Buy pack</Btn>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
