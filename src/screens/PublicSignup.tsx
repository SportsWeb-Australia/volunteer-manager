import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Card, Btn, Icon, Loading } from "../components/ui";
import { VOneLogo } from "../components/Logo";
import { T } from "../lib/theme";

interface OppInfo { title: string; description: string | null; location: string | null; starts_at: string | null; }

export function PublicSignup() {
  const token = window.location.pathname.split("/v/")[1]?.split(/[/?#]/)[0] ?? "";
  const [info, setInfo] = useState<OppInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) { setError("This link is missing its code."); setLoading(false); return; }
      const { data, error } = await supabase.functions.invoke("public-signup", { body: { token, action: "get" } });
      if (cancelled) return;
      if (error || (data as any)?.error) setError((data as any)?.error ?? "We couldn't find that volunteer link.");
      else setInfo((data as any).opportunity);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [token]);

  const submit = async (response: string) => {
    setBusy(true); setError(null);
    const { data, error } = await supabase.functions.invoke("public-signup", {
      body: { token, action: "submit", response, name, mobile },
    });
    if (error || (data as any)?.error) setError((data as any)?.error ?? "Something went wrong. Please try again.");
    else setDone((data as any).message ?? "Thanks!");
    setBusy(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: T.paper, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "32px 18px" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800&family=Outfit:wght@300;400;500;600;700&display=swap');`}</style>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ display: "flex", marginBottom: 18 }}>
          <VOneLogo mark={34} word={19} />
        </div>

        {loading ? <Loading label="Loading…" />
          : error && !info ? <Card pad={28} style={{ textAlign: "center" }}><Icon n="x" s={26} c={T.red} /><p style={{ marginTop: 10 }}>{error}</p></Card>
          : done ? (
            <Card pad={32} style={{ textAlign: "center" }}>
              <div style={{ width: 54, height: 54, borderRadius: 16, background: T.greenSoft, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}><Icon n="check" s={26} c={T.green} /></div>
              <h1 className="disp" style={{ fontSize: 24, margin: 0 }}>{done}</h1>
              <p style={{ color: T.muted, fontSize: 14, marginTop: 8 }}>You can close this page.</p>
            </Card>
          ) : info ? (
            <Card pad={0} style={{ overflow: "hidden" }}>
              <div style={{ background: T.navy, color: "#fff", padding: "18px 18px 16px" }}>
                <div className="disp" style={{ fontSize: 22 }}>{info.title}</div>
                {(info.starts_at || info.location) && <div style={{ fontSize: 13, color: T.mutedNavy, marginTop: 5 }}>{[info.starts_at ? new Date(info.starts_at).toLocaleString() : "", info.location].filter(Boolean).join(" · ")}</div>}
              </div>
              <div style={{ padding: 18 }}>
                {info.description && <p style={{ fontSize: 14, color: T.ink, marginTop: 0 }}>{info.description}</p>}
                <div style={{ display: "grid", gap: 9, marginBottom: 14 }}>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={{ padding: "11px 13px", borderRadius: 11, border: `1px solid ${T.line}`, fontSize: 14, fontFamily: "inherit" }} />
                  <input value={mobile} onChange={e => setMobile(e.target.value)} placeholder="Mobile (so we can confirm)" style={{ padding: "11px 13px", borderRadius: 11, border: `1px solid ${T.line}`, fontSize: 14, fontFamily: "inherit" }} />
                </div>
                {error && <div style={{ color: T.red, fontSize: 13, marginBottom: 10 }}>{error}</div>}
                <Btn kind="green" icon="check" full onClick={() => submit("hand_up")}>{busy ? "Sending…" : "Put my hand up"}</Btn>
                <div style={{ display: "flex", gap: 8, marginTop: 9 }}>
                  <Btn kind="ghost" full onClick={() => submit("ask_next_time")}>Ask me next time</Btn>
                  <Btn kind="ghost" full onClick={() => submit("occasional")}>I can help occasionally</Btn>
                </div>
              </div>
            </Card>
          ) : null}
      </div>
    </div>
  );
}
