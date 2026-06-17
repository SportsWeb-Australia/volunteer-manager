import { T, F } from "../lib/theme";

/**
 * VolunteerOne mark — a two-tone ribbon "V" (silver left arm, teal right arm
 * with a ribbon flick), optionally set in a dark rounded tile (app-icon style).
 * Recreated as a crisp vector so it scales to any size.
 */
export function VMark({ size = 36, tile = true }: { size?: number; tile?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" role="img" aria-label="VolunteerOne">
      <defs>
        <linearGradient id="voSilver" x1="9" y1="8" x2="26" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F1F4F6" />
          <stop offset=".55" stopColor="#AEB7BF" />
          <stop offset="1" stopColor="#DBE0E4" />
        </linearGradient>
        <linearGradient id="voTeal" x1="22" y1="38" x2="44" y2="8" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#00917A" />
          <stop offset="1" stopColor="#00BFA6" />
        </linearGradient>
      </defs>
      {tile && <rect x="0" y="0" width="48" height="48" rx="13" fill="#1F2328" />}
      <path d="M11 12 C 14 23, 18 30, 23 36" stroke="url(#voSilver)" strokeWidth="6.4" strokeLinecap="round" fill="none" />
      <path d="M23 36 C 28 30, 33 21, 37 12 C 38 9.4, 40.6 9.4, 42 12" stroke="url(#voTeal)" strokeWidth="6.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

/** The "VolunteerOne" wordmark. `light` for dark backgrounds. */
export function VOneWord({ light = false, size = 18 }: { light?: boolean; size?: number }) {
  return (
    <span style={{ fontFamily: F.body, fontWeight: 700, fontSize: size, letterSpacing: "-.015em", lineHeight: 1, whiteSpace: "nowrap" }}>
      <span style={{ color: light ? "#fff" : T.ink }}>Volunteer</span>
      <span style={{ color: T.brand }}>One</span>
    </span>
  );
}

/** Horizontal lockup: mark + wordmark + "Powered by SportsWeb One". */
export function VOneLogo({ light = false, mark = 36, word = 18, tagline = true }: { light?: boolean; mark?: number; word?: number; tagline?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <VMark size={mark} />
      <div style={{ lineHeight: 1 }}>
        <VOneWord light={light} size={word} />
        {tagline && (
          <div className="mono" style={{ fontSize: 8.5, color: light ? T.mutedNavy : T.muted, letterSpacing: ".14em", marginTop: 4 }}>
            POWERED BY SPORTSWEB ONE
          </div>
        )}
      </div>
    </div>
  );
}
