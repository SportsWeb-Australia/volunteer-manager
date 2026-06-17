import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Card, Btn, Icon } from "../components/ui";
import { VOneLogo } from "../components/Logo";
import { T } from "../lib/theme";

export function CheckIn() {
  const params = new URLSearchParams(window.location.search);
  const club_token = params.get("c") ?? undefined;
  const shift_token = params.get("s") ?? undefined;
  const [mobile, setMobile] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ shift?: string; name?: string; already?: boolean } | null>(null);

  const submit = async () => {
    setBusy(true); setError(null);
    const { data, error } = await supabase.functions.invoke("shift-checkin", { body: { club_token, shift_token, mobile } });
    if (error || (data as any)?.error) setError((data as any)?.error ?? "Something went wrong. Please try again.");
    else setDone(data as any);
    setBusy(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: T.paper, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "32px 18px" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800&family=Outfit:wght@300;400;500;600;700&display=swap');`}</style>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ display: "flex", marginBottom: 18 }}>
          <VOneLogo mark={34} word={19} />
        </div>

        {done ? (
          <Card pad={32} style={{ textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: T.greenSoft, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}><Icon n="check" s={28} c={T.green} /></div>
            <h1 className="disp" style={{ fontSize: 24, margin: 0 }}>{done.already ? "Already checked in" : "Checked in!"}</h1>
            <p style={{ color: T.muted, fontSize: 14.5, marginTop: 8 }}>
              {done.name ? `Thanks, ${done.name.split(" ")[0]}! ` : "Thanks! "}{done.shift ? `You're marked on for ${done.shift}.` : "Have a great shift."}
            </p>
          </Card>
        ) : (
          <Card pad={24}>
            <h1 className="disp" style={{ fontSize: 22, margin: "0 0 6px" }}>Check in for your shift</h1>
            <p style={{ fontSize: 13.5, color: T.muted, margin: "0 0 16px" }}>Pop in the mobile number you signed up with and you're done.</p>
            <input value={mobile} onChange={e => setMobile(e.target.value)} placeholder="Your mobile" inputMode="tel"
              style={{ width: "100%", padding: "12px 14px", borderRadius: 11, border: `1px solid ${T.line}`, fontSize: 15, fontFamily: "inherit", marginBottom: 12 }} />
            {error && <div style={{ color: T.red, fontSize: 13, marginBottom: 12 }}>{error}</div>}
            <Btn kind="green" icon="check" full onClick={submit}>{busy ? "Checking in…" : "Check in"}</Btn>
          </Card>
        )}
      </div>
    </div>
  );
}
