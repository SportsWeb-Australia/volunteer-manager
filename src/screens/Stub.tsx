import { SectionHead, EmptyState } from "../components/ui";

export function Stub({ title, sub, icon }: { title: string; sub: string; icon: string }) {
  return (
    <div className="fade">
      <SectionHead eyebrow="SportsWeb One module" title={title} />
      <EmptyState icon={icon} title="Ports from the prototype" sub={sub} />
    </div>
  );
}
