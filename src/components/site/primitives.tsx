import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-6 lg:px-8", className)}>{children}</div>;
}

export function Section({
  id,
  className,
  children,
  bordered = true,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
  bordered?: boolean;
}) {
  return (
    <section id={id} className={cn("py-20 md:py-28", bordered && "border-t border-border", className)}>
      <Container>{children}</Container>
    </section>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("eyebrow flex items-center gap-3", className)}>
      <span className="inline-block h-px w-6 bg-accent" aria-hidden />
      {children}
    </p>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  lede,
  className,
  align = "left",
}: {
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  className?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && <Eyebrow className={cn(align === "center" && "justify-center")}>{eyebrow}</Eyebrow>}
      <h2 className="display mt-5 text-3xl md:text-5xl">{title}</h2>
      {lede && <p className="lede mt-6">{lede}</p>}
    </div>
  );
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("panel rounded-lg p-6 md:p-8", className)}>{children}</div>;
}

export function Kicker({ n, label }: { n: string; label: string }) {
  return (
    <div className="flex items-baseline gap-3 font-mono text-xs tracking-widest text-muted-foreground uppercase">
      <span className="text-accent">{n}</span>
      <span>{label}</span>
    </div>
  );
}

export type Status = "exists" | "building" | "planned";

export function StatusBadge({ status }: { status: Status }) {
  const map: Record<Status, { label: string; dot: string }> = {
    exists: { label: "Vorhanden", dot: "bg-accent" },
    building: { label: "In Entwicklung", dot: "bg-foreground/70 animate-pulse-dot" },
    planned: { label: "Geplant", dot: "bg-muted-foreground/50" },
  };
  const s = map[status];
  return (
    <span className="inline-flex items-center gap-2 rounded-sm border border-border px-2 py-1 font-mono text-[0.625rem] tracking-widest text-muted-foreground uppercase">
      <span className={cn("size-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}
