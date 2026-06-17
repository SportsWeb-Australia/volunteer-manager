import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useApp } from "../context/AppContext";
import { Card, SectionHead, Icon, Btn, Loading, Pill, fieldInput } from "../components/ui";
import { Qr } from "../components/Qr";
import { T } from "../lib/theme";

function SenderPill({ status }: { status: string }) {
  const map: Record<string, [string, string, string]> = {
    not_started: ["#EEF1F4", T.muted, "Not requested"],
    pending: [T.amberSoft, T.amber, "Pending approval"],
    approved: [T.greenSoft, T.green, "Approved"],
    rejected: [T.redSoft, T.red, "Rejected"],
  };
  const [bg, fg, label] = map[status] ?? map.not_started;
  return <Pill bg={bg} fg={fg}>{label}</Pill>;
}

interface Settings {
  require_approval_before_send: boolean;
  block_restricted_without_checks: boolean;
  avoid_overuse: boolean;
  allow_self_select: boolean;
  publish_to_website: boolean;
  check_in_method: string;
  check_in_token: string | null;
}
const TOGGLES: [keyof Settings, string][] = [
  ["require_approval_before_send", "Require approval before any message is sent"],
  ["block_restricted_without_checks", "Block restricted roles without the required checks"],
  ["avoid_overuse", "Avoid overusing the same volunteers"],
  ["allow_self_select", "Let volunteers self-select shifts"],
  ["publish_to_website", "Publish volunteer sign-ups to the club website"],
];
const METHODS: [string, string, string][] = [
  ["off", "Off", "No check-in"],
  ["qr", "QR code", "Scan to check in"],
  ["nfc", "NFC tag", "Tap to check in"],
  ["both", "Both", "QR + NFC"],
];

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ width: 44, height: 26, borderRadius: 99, border: "none", background: on ? T.green : "#D8D1C2", position: "relative", flex: "0 0 auto", cursor: "pointer" }}>
      <span style={{ position: "absolute", top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: 99, background: "#fff", transition: "left .15s ease" }} />
    </button>
  );
}

export function Settings() {
  const { clubId } = useApp();
  const [s, setS] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sender, setSender] = useState<{ id: string; status: string }>({ id: "", status: "not_started" });
  const [savingSender, setSavingSender] = useState(false);

  const requestSender = async () => {
    if (!clubId) return;
    const id = sender.id.trim().toUpperCase();
    if (!id) return;
    setSavingSender(true);
    await supabase.from("volunteer_settings").update({ sms_sender_id: id, sms_sender_status: "pending" }).eq("club_id", clubId);
    setSender(p => ({ ...p, id, status: "pending" }));
    setSavingSender(false);
  };

  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("volunteer_settings")
        .select("require_approval_before_send,block_restricted_without_checks,avoid_overuse,allow_self_select,publish_to_website,check_in_method,check_in_token")
        .eq("club_id", clubId).maybeSingle();
      if (!cancelled) {
        setS((data as Settings) ?? {
          require_approval_before_send: true, block_restricted_without_checks: true,
          avoid_overuse: true, allow_self_select: true, publish_to_website: false,
          check_in_method: "off", check_in_token: null,
        });
        setLoading(false);
      }
      const { data: snd } = await supabase.from("volunteer_settings")
        .select("sms_sender_id,sms_sender_status").eq("club_id", clubId).maybeSingle();
      if (!cancelled && snd) setSender({ id: snd.sms_sender_id ?? "", status: snd.sms_sender_status ?? "not_started" });
    })();
    return () => { cancelled = true; };
  }, [clubId]);

  const update = (patch: Partial<Settings>) => { setS(prev => prev ? { ...prev, ...patch } : prev); setSaved(false); };

  const save = async () => {
    if (!clubId || !s) return;
    setSaving(true);
    await supabase.from("volunteer_settings").upsert({ club_id: clubId, ...s }, { onConflict: "club_id" });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  if (loading || !s) return <Loading />;
  const origin = window.location.origin;
  const checkinUrl = s.check_in_token ? `${origin}/checkin?c=${s.check_in_token}` : "";

  return (
    <div className="fade">
      <SectionHead eyebrow="Module configuration" title="Settings"
        sub="Sensible defaults out of the box. The guardrails that keep AI in check live here."
        right={<Btn icon="check" onClick={save}>{saving ? "Saving…" : saved ? "Saved" : "Save changes"}</Btn>} />

      <Card pad={6} style={{ marginBottom: 18 }}>
        {TOGGLES.map(([k, label], i) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 14px", borderTop: i ? `1px solid ${T.line}` : "none" }}>
            <span style={{ fontSize: 14, fontWeight: 500 }}>{label}</span>
            <Toggle on={Boolean(s[k])} onClick={() => update({ [k]: !s[k] } as Partial<Settings>)} />
          </div>
        ))}
      </Card>

      {/* check-in */}
      <Card pad={18}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <Icon n="bolt" s={18} c={T.navy} /><b style={{ fontSize: 15 }}>Shift check-in</b>
        </div>
        <p style={{ fontSize: 13, color: T.muted, margin: "0 0 14px" }}>
          Let volunteers check in to their shift by scanning a QR code or tapping an NFC tag at the ground. Their shift is marked attended automatically.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {METHODS.map(([val, label, hint]) => {
            const on = s.check_in_method === val;
            return (
              <button key={val} onClick={() => update({ check_in_method: val })} style={{
                flex: "1 1 110px", textAlign: "left", border: `1px solid ${on ? T.brand : T.line}`, background: on ? T.brandSoft : "#fff",
                borderRadius: 12, padding: "11px 13px", cursor: "pointer",
              }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: on ? T.brandDeep : T.ink }}>{label}</div>
                <div style={{ fontSize: 11.5, color: T.muted, marginTop: 2 }}>{hint}</div>
              </button>
            );
          })}
        </div>

        {s.check_in_method !== "off" && checkinUrl && (
          <div className="fade" style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center", borderTop: `1px solid ${T.line}`, paddingTop: 16 }}>
            <Qr value={checkinUrl} size={150} />
            <div style={{ flex: 1, minWidth: 220 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Your club check-in link</div>
              <div className="mono" style={{ fontSize: 12, background: "#FAF8F2", border: `1px solid ${T.line}`, borderRadius: 8, padding: "9px 11px", wordBreak: "break-all" }}>{checkinUrl}</div>
              {(s.check_in_method === "qr" || s.check_in_method === "both") && (
                <p style={{ fontSize: 12.5, color: T.muted, margin: "12px 0 0" }}><b style={{ color: T.ink }}>QR:</b> print this code and pin it at the canteen, gate or clubrooms.</p>
              )}
              {(s.check_in_method === "nfc" || s.check_in_method === "both") && (
                <p style={{ fontSize: 12.5, color: T.muted, margin: "8px 0 0" }}><b style={{ color: T.ink }}>NFC:</b> write the link above to an NFC tag (any "NFC Tools" app) and stick it at the ground. Volunteers tap their phone to check in — no app needed.</p>
              )}
              <Btn sm kind="ghost" icon="check" onClick={() => navigator.clipboard?.writeText(checkinUrl)} >Copy link</Btn>
            </div>
          </div>
        )}
      </Card>

      {/* SMS sender ID */}
      <Card pad={18} style={{ marginTop: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <Icon n="chat" s={18} c={T.navy} /><b style={{ fontSize: 15 }}>SMS sender ID</b>
        </div>
        <p style={{ fontSize: 13, color: T.muted, margin: "0 0 14px" }}>
          By default texts send from the VolunteerOne platform sender. You can request your own club sender ID (e.g. a short club name). In Australia sender IDs must be registered/approved — we handle that for you, and your messages fall back to the platform sender until it's approved.
        </p>
        {sender.status === "approved" ? (
          <div style={{ fontSize: 13.5, display: "flex", alignItems: "center", gap: 10 }}>Sending as <b>{sender.id}</b> <SenderPill status={sender.status} /></div>
        ) : (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input value={sender.id} onChange={e => setSender(p => ({ ...p, id: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11) }))}
              placeholder="e.g. DOOKIEFC" style={{ ...fieldInput, maxWidth: 220 }} />
            <Btn onClick={requestSender}>{savingSender ? "Submitting…" : "Request sender ID"}</Btn>
            <SenderPill status={sender.status} />
          </div>
        )}
        <p style={{ fontSize: 11.5, color: T.muted, marginTop: 10 }}>Max 11 characters · letters &amp; numbers, no spaces.</p>
      </Card>
    </div>
  );
}
