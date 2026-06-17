import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useApp } from "../context/AppContext";
import { useEntitlement } from "../hooks/useEntitlement";
import { dispatchMessage } from "../lib/api";
import { Card, SectionHead, Icon, Btn, ReviewChip, Loading } from "../components/ui";
import { UpgradePrompt } from "../components/Gate";
import { T } from "../lib/theme";

interface Template { id: string; name: string; body: string; subject: string | null; type: string | null; }
type Stage = "Needs review" | "Approved" | "Sent";

export function Communications() {
  const { clubId } = useApp();
  const { has } = useEntitlement();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<string | null>(null);
  const [subject, setSubject] = useState("Volunteers needed this weekend");
  const [stage, setStage] = useState<Stage>("Needs review");
  const [channels, setChannels] = useState<string[]>(["Email"]);
  const [messageId, setMessageId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [quota, setQuota] = useState<{ used: number; allowance: number; remaining: number; trial: boolean } | null>(null);

  const loadQuota = async () => {
    if (!clubId) return;
    const { data } = await supabase.rpc("vm_sms_quota", { p_club: clubId });
    if (data && typeof (data as { allowance?: number }).allowance === "number") {
      setQuota(data as { used: number; allowance: number; remaining: number; trial: boolean });
    }
  };

  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("volunteer_message_templates")
        .select("id,name,body,subject,type,club_id").or(`club_id.eq.${clubId},club_id.is.null`).order("name");
      if (!cancelled) { setTemplates((data as Template[]) ?? []); setLoading(false); loadQuota(); }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  const newDraft = (body?: string) => {
    setDraft(body ?? "Hi everyone! We're short a few hands for this Saturday's home games. If you can spare an hour on the canteen or BBQ, tap 'Put my hand up' below. Thanks team! 🧡");
    setStage("Needs review"); setMessageId(null); setResult(null); setErr(null);
  };

  const approve = async () => {
    if (!clubId || !draft) return;
    setBusy(true); setErr(null);
    try {
      const { data, error } = await supabase.from("volunteer_messages").insert({
        club_id: clubId, type: "call_out", title: subject, subject, body: draft,
        channels: channels.map(c => c.toLowerCase()), audience: { statuses: ["active"] },
        status: "approved", approved_at: new Date().toISOString(),
      }).select("id").single();
      if (error) throw error;
      setMessageId(data.id); setStage("Approved");
    } catch (e: any) { setErr(e?.message ?? "Couldn't save the message."); }
    finally { setBusy(false); }
  };

  const send = async () => {
    if (!messageId) return;
    setBusy(true); setErr(null);
    try {
      const r = await dispatchMessage(messageId);
      const sent = Object.values(r.channels).reduce((s, c) => s + c.sent, 0);
      setResult(`${r.status} — ${sent} sent across ${Object.keys(r.channels).join(", ") || "no channels"}${r.skipped.length ? ` · skipped: ${r.skipped.join(", ")}` : ""}`);
      setStage("Sent");
      loadQuota();
    } catch (e: any) { setErr(e?.message ?? "Send failed."); }
    finally { setBusy(false); }
  };

  const CHANNELS: [string, boolean][] = [["Email", true], ["SMS", has("channel_sms")], ["Push", has("channel_push")]];

  return (
    <div className="fade">
      <SectionHead eyebrow="Plain, friendly club language" title="Communications"
        sub="AI drafts every message; you read and approve before anything goes out. Sending runs through Twilio / Zoho / WebPushr — and never on its own."
        right={<Btn icon="spark" onClick={() => newDraft()}>New AI draft</Btn>} />

      {quota && (quota.trial || quota.allowance > 0) && (
        <Card pad={13} style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", background: quota.trial ? T.brandSoft : T.card, borderColor: quota.trial ? "#A9E6DD" : T.line }}>
          <div style={{ fontSize: 13 }}>
            {quota.trial && <b style={{ color: T.brandDeep }}>Free trial · </b>}
            <b>{quota.used}</b> of <b>{quota.allowance}</b> SMS used this month
            {quota.remaining === 0 && <span style={{ color: T.red, fontWeight: 600 }}> · allowance reached</span>}
          </div>
          <span style={{ fontSize: 11.5, color: T.muted }}>Email &amp; push are unlimited</span>
        </Card>
      )}

      {draft != null && (
        <Card pad={18} style={{ marginBottom: 20, borderColor: T.brandSoft }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}><Icon n="spark" s={18} c={T.brand} /><b style={{ fontSize: 15 }}>AI draft · volunteer call-out</b></div>
            <ReviewChip state={stage === "Sent" ? "Approved" : stage} />
          </div>
          <input value={subject} onChange={e => setSubject(e.target.value)} disabled={stage !== "Needs review"}
            style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: `1px solid ${T.line}`, fontSize: 13.5, fontFamily: "inherit", marginBottom: 9 }} />
          <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={4} disabled={stage !== "Needs review"}
            style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: `1px solid ${T.line}`, fontSize: 14, fontFamily: "inherit", resize: "vertical", lineHeight: 1.5 }} />
          <div style={{ display: "flex", gap: 7, margin: "12px 0", flexWrap: "wrap", alignItems: "center" }}>
            <span className="eyebrow">Send via</span>
            {CHANNELS.map(([ch, allowed]) => {
              if (!allowed) return <span key={ch} style={{ opacity: .7 }}><UpgradePrompt feature={ch === "SMS" ? "channel_sms" : "channel_push"} compact /></span>;
              const on = channels.includes(ch);
              return <button key={ch} disabled={stage !== "Needs review"} onClick={() => setChannels(on ? channels.filter(c => c !== ch) : [...channels, ch])}
                style={{ border: `1px solid ${on ? T.navy : T.line}`, background: on ? T.navy : "#fff", color: on ? "#fff" : T.muted, padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{ch}</button>;
            })}
          </div>

          {err && <div style={{ color: T.red, fontSize: 13, marginBottom: 10 }}>{err}</div>}
          {result && <div style={{ color: T.green, fontSize: 13.5, fontWeight: 600, marginBottom: 10 }}>{result}</div>}

          <div style={{ display: "flex", gap: 9, flexWrap: "wrap", alignItems: "center" }}>
            {stage === "Needs review" && <Btn kind="green" icon="check" onClick={approve}>{busy ? "Saving…" : "Approve draft"}</Btn>}
            {stage === "Approved" && <Btn kind="primary" icon="mega" onClick={send}>{busy ? "Sending…" : "Send now"}</Btn>}
            {stage === "Sent" && <span style={{ display: "inline-flex", gap: 6, alignItems: "center", color: T.green, fontWeight: 700, border: `2px solid ${T.green}`, borderRadius: 8, padding: "4px 10px", transform: "rotate(-6deg)" }}><Icon n="check" s={14} c={T.green} />SENT</span>}
            <Btn kind="ghost" icon="x" onClick={() => setDraft(null)}>Close</Btn>
            <span style={{ marginLeft: "auto", fontSize: 11.5, color: T.muted }}>AI never sends on its own.</span>
          </div>
        </Card>
      )}

      <div className="eyebrow" style={{ margin: "4px 0 12px" }}>Templates</div>
      {loading ? <Loading /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
          {templates.map(t => (
            <Card key={t.id} className="lift" pad={15}>
              <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 7 }}>{t.name}</div>
              <p style={{ fontSize: 12.5, color: T.muted, lineHeight: 1.55, margin: "0 0 12px" }}>{t.body}</p>
              <Btn sm kind="soft" icon="edit" onClick={() => { newDraft(t.body); if (t.subject) setSubject(t.subject); }}>Use template</Btn>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
