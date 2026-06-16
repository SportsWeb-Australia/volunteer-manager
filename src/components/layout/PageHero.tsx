import { AccentBars } from "./Chevron";

interface Props {
  eyebrow: string;
  title: string;
  intro?: string;
}

export function PageHero({ eyebrow, title, intro }: Props) {
  return (
    <section className="sw-pagehero">
      <div className="sw-hero-motif" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="sw-container">
        <AccentBars />
        <span className="sw-breadcrumb">{eyebrow}</span>
        <h1>{title}</h1>
        {intro && <p>{intro}</p>}
      </div>
    </section>
  );
}
