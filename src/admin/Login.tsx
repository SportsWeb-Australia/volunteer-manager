import { useState } from "react";
import { useAuth } from "../lib/auth";
import { useClub } from "../components/ClubContext";

export function Login() {
  const { signIn } = useAuth();
  const { club } = useClub();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const err = await signIn(email.trim(), password);
    setBusy(false);
    if (err) setError(err);
  };

  return (
    <div className="sw-admin-login">
      <div className="sw-admin-login-card">
        <div className="sw-accent-bars" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <h1>{club.identity.shortName} Admin</h1>
        <p>Sign in to manage {club.identity.name}.</p>
        {error && <p className="sw-admin-error">{error}</p>}
        <label className="sw-admin-field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            autoComplete="username"
          />
        </label>
        <label className="sw-admin-field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            autoComplete="current-password"
          />
        </label>
        <button className="sw-btn" onClick={submit} disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </div>
    </div>
  );
}
