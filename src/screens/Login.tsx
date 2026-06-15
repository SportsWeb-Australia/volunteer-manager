import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Card, Btn, Icon } from "../components/ui";
import { T } from "../lib/theme";

export function Login() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const send = async () => {
    if (!email.trim()) { setErr("Enter your email."); return; }
    setBusy(true); setErr(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) setErr(error.message); else setSent(true);
    setBusy(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: T.paper, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 18px" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800&family=Outfit:wght@300;400;500;600;700&display=swap');`}</style>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, justifyContent: "center" }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: T.red, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon n="people" c="#fff" s={19} /></div>
          <span className="disp" style={{ fontSize: 19 }}>VOLUNTEER MANAGER</span>
        </div>

        {sent ? (
          <Card pad={30} style={{ textAlign: "center" }}>
            <div style={{ width: 54, height: 54, borderRadius: 15, background: T.greenSoft, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}><Icon n="check" s={26} c={T.green} /></div>
            <h1 className="disp" style={{ fontSize: 23, margin: 0 }}>Check your email</h1>
            <p style={{ color: T.muted, fontSize: 14.5, marginTop: 8 }}>We sent a sign-in link to <b style={{ color: T.ink }}>{email}</b>. Open it on this device and you're in.</p>
            <div style={{ marginTop: 14 }}><Btn kind="ghost" sm onClick={() => setSent(false)}>Use a different email</Btn></div>
          </Card>
        ) : (
          <Card pad={26}>
            <h1 className="disp" style={{ fontSize: 22, margin: "0 0 6px" }}>Sign in</h1>
            <p style={{ fontSize: 13.5, color: T.muted, margin: "0 0 16px" }}>Use the email on your SportsWeb One staff account. We'll email you a one-tap sign-in link — no password.</p>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@club.org.au" inputMode="email" type="email"
              onKeyDown={e => { if (e.key === "Enter") send(); }}
              style={{ width: "100%", padding: "12px 14px", borderRadius: 11, border: `1px solid ${T.line}`, fontSize: 15, fontFamily: "inherit", marginBottom: 12 }} />
            {err && <div style={{ color: T.red, fontSize: 13, marginBottom: 12 }}>{err}</div>}
            <Btn kind="primary" icon="arrow" full onClick={send}>{busy ? "Sending…" : "Email me a sign-in link"}</Btn>
          </Card>
        )}
      </div>
    </div>
  );
}
