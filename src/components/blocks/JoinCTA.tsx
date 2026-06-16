import { useClub } from "../ClubContext";
import { SmartLink } from "../SmartLink";

export function JoinCTA() {
  const { club } = useClub();
  const { join } = club;

  return (
    <section className="sw-section sw-join">
      <div className="sw-hero-motif" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="sw-container">
        <h2>{join.heading}</h2>
        <p>{join.blurb}</p>
        <div className="sw-join-options">
          {join.options.map((o) => (
            <SmartLink key={o.label} href={o.href} className="sw-btn">
              {o.label}
            </SmartLink>
          ))}
        </div>
      </div>
    </section>
  );
}
