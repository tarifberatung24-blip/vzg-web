import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container, Eyebrow, Kicker, Section, SectionHeading } from "@/components/site/primitives";
import { CtaBand } from "@/components/site/CtaBand";
import { services } from "@/content/services";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/services")({
  head: () =>
    pageHead({
      title: "Leistungen: KI-Automatisierung, n8n, Customer Service Automation",
      description:
        "AI Automation, n8n-Automatisierung, Customer Service Automation, automatisierte Online-Shops, individuelle Webanwendungen und B2B-Plattformen – aus einer Hand.",
      path: "/services",
    }),
  component: ServicesPage,
});

const process = [
  { n: "01", title: "Problem verstehen", text: "Prozess, Beteiligte, Datenquellen und Engpässe werden vor Ort im Betrieb analysiert – nicht nur im Workshop." },
  { n: "02", title: "System entwerfen", text: "Architektur, Datenflüsse, KI-Einsatzpunkte und Übergabepunkte an Menschen werden explizit definiert." },
  { n: "03", title: "Bauen und integrieren", text: "Implementierung in nutzbaren Schritten, Anbindung an bestehende Systeme, Tests mit echten Fällen." },
  { n: "04", title: "Betreiben und verbessern", text: "Monitoring, Auswertung und gezielte Iteration – das System wird mit dem Geschäft weiterentwickelt." },
];

function ServicesPage() {
  return (
    <>
      <section className="border-b border-border">
        <Container className="py-20 md:py-28">
          <SectionHeading
            eyebrow="Leistungen"
            title="Automatisierung, KI und individuelle Systeme für den operativen Betrieb."
            lede="Jede Leistung folgt derselben Logik: Ein konkretes Geschäftsproblem, eine passende Architektur, eine verantwortliche Person."
          />
        </Container>
      </section>

      {services.map((s, i) => (
        <section
          key={s.id}
          id={s.id}
          className={`scroll-mt-20 border-b border-border ${i % 2 === 1 ? "bg-surface" : ""}`}
        >
          <Container className="grid gap-10 py-16 md:grid-cols-[1fr_1.2fr] md:py-20">
            <div>
              <Kicker n={s.index} label="Leistung" />
              <h2 className="display mt-5 text-3xl md:text-4xl">{s.title}</h2>
              <p className="mt-5 text-muted-foreground">{s.description}</p>
              <Button asChild variant="outline" className="mt-8">
                <Link to="/contact">
                  Anfrage zu {s.title} <ArrowRight />
                </Link>
              </Button>
            </div>
            <ul className="grid gap-px self-start overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
              {s.items.map((item) => (
                <li key={item} className="flex items-start gap-3 bg-background p-4 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-accent" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      ))}

      <Section bordered={false}>
        <Eyebrow>Vorgehen</Eyebrow>
        <h2 className="display mt-5 max-w-2xl text-3xl md:text-5xl">Von der Analyse zum laufenden System.</h2>
        <ol className="mt-14 grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-4">
          {process.map((p) => (
            <li key={p.n} className="bg-background p-7">
              <span className="font-mono text-xs text-accent">{p.n}</span>
              <h3 className="mt-4 text-lg font-medium tracking-tight">{p.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      <CtaBand />
    </>
  );
}
