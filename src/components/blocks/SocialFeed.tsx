import { useClub } from "../ClubContext";
import { AccentBars } from "../layout/Chevron";

export function SocialFeed() {
  const { club } = useClub();
  const { social, contact, identity } = club;

  return (
    <section className="sw-section">
      <div className="sw-container">
        <AccentBars />
        <span className="sw-eyebrow">{social.heading}</span>
        <div className="sw-social-grid" style={{ marginTop: "1.5rem" }}>
          <div>
            <h2 style={{ fontSize: "var(--fs-h2)" }}>Match-day, results &amp; club life</h2>
            <p className="sw-lead" style={{ marginTop: "0.75rem" }}>
              {social.note}
            </p>
            <p className="sw-social-embed-note">
              Embed slot: connect the {identity.shortName} Instagram or Facebook feed here in
              SportsWeb One. Until then, the links below point supporters to the live pages.
            </p>
          </div>
          <div className="sw-social-cards">
            {contact.instagram && (
              <a className="sw-social-card" href={contact.instagram} target="_blank" rel="noopener noreferrer">
                <span className="sw-social-plat">Instagram</span>
                <span className="sw-social-handle">@dookieunited</span>
                <span className="sw-link-arrow">Follow →</span>
              </a>
            )}
            {contact.facebook && (
              <a className="sw-social-card" href={contact.facebook} target="_blank" rel="noopener noreferrer">
                <span className="sw-social-plat">Facebook</span>
                <span className="sw-social-handle">{identity.shortName}</span>
                <span className="sw-link-arrow">Follow →</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
