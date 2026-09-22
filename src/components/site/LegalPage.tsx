import type { ReactNode } from "react";
import { Container, Eyebrow } from "./primitives";

export function LegalValue({ children = "[LEGAL DATA REQUIRED]" }: { children?: ReactNode }) {
  return (
    <span className="rounded-sm border border-accent/40 bg-accent/10 px-1.5 py-0.5 font-mono text-[0.7rem] tracking-wider text-accent">
      {children}
    </span>
  );
}

export function LegalPage({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <>
      <section className="border-b border-border">
        <Container className="py-16 md:py-24">
          <Eyebrow>Rechtliches</Eyebrow>
          <h1 className="display mt-6 text-4xl md:text-6xl">{title}</h1>
          <p className="lede mt-6 max-w-2xl">{intro}</p>
        </Container>
      </section>
      <Container className="py-16 md:py-24">
        <div className="max-w-3xl space-y-10 leading-relaxed text-muted-foreground [&_h2]:text-xl [&_h2]:font-medium [&_h2]:tracking-tight [&_h2]:text-foreground [&_h3]:font-medium [&_h3]:text-foreground [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
          <div className="rounded-md border border-accent/30 bg-accent/5 p-4 text-sm">
            Platzhalter-Dokument. Alle als <LegalValue /> markierten Angaben müssen vor Veröffentlichung
            durch die tatsächlichen rechtlichen Daten ersetzt und der Text rechtlich geprüft werden.
          </div>
          {children}
        </div>
      </Container>
    </>
  );
}
