import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container, Eyebrow, Kicker, Section, SectionHeading, StatusBadge } from "@/components/site/primitives";
import { SystemDiagram } from "@/components/site/SystemDiagram";
import { CtaBand } from "@/components/site/CtaBand";
import { services } from "@/content/services";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () =>
    pageHead({
      title: "VZG CONSULT — AI Systems · Automation · Digital Products",
      description:
        "Individuelle KI-Automatisierung, n8n-Workflows, Customer Service Automation und B2B-Plattformen für Unternehmen in Deutschland. Ein Gründer. Volle Verantwortung.",
      path: "/",
    }),
  component: Index,
});

const principles = [
  {
    n: "01",
    title: "Direkte Kommunikation",
    text: "Sie sprechen mit der Person, die analysiert, entwirft und baut. Keine Übersetzungsverluste zwischen Vertrieb, Projektleitung und Entwicklung.",
  },
  {
    n: "02",
    title: "Keine unnötigen Managementebenen",
    text: "Entscheidungen werden dort getroffen, wo das Problem verstanden wird. Das spart Zeit, Budget und Abstimmungsschleifen.",
  },
  {
    n: "03",
    title: "Technologie nach Problem",
    text: "KI, n8n, individuelle Entwicklung oder bestehende Tools – ausgewählt nach Anforderung, nicht nach Trend.",
  },
  {
    n: "04",
    title: "Kontinuierliche Iteration",
    text: "Systeme werden in nutzbaren Schritten aufgebaut, im Betrieb beobachtet und gezielt weiterentwickelt.",
  },
];

function Index() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="bg-grid mask-fade pointer-events-none absolute inset-0" aria-hidden />
        <Container className="relative grid gap-16 pt-20 pb-24 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:pt-28 lg:pb-32">
          <div className="reveal">
            <Eyebrow>AI Systems · Automation · Digital Products</Eyebrow>
            <h1 className="display mt-8 text-5xl sm:text-6xl lg:text-7xl">
              AI Systems.
              <br />
              Automation.
              <br />
              <span className="text-muted-foreground">Digital Products.</span>
            </h1>
            <p className="lede mt-8 max-w-xl">
              Individuelle digitale Systeme für Unternehmen, die Prozesse nicht nur digitalisieren,
              sondern intelligenter machen wollen.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button asChild size="lg">
                <Link to="/contact">
                  Projekt besprechen <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/project-intelligence">Geschäftsidee analysieren</Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link to="/horizon">
                  HORIZON entdecken <ArrowUpRight />
                </Link>
              </Button>
            </div>
            <p className="mt-14 font-mono text-[0.7rem] tracking-[0.25em] text-foreground/70 uppercase">
              One Vision. One Builder. Full Responsibility.
            </p>
          </div>
          <div className="reveal panel rounded-lg p-2 [animation-delay:200ms]">
            <SystemDiagram className="h-auto w-full" />
          </div>
        </Container>
      </section>

      {/* Positioning */}
      <Section>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <SectionHeading eyebrow="Positionierung" title="Kein Agenturmodell. Ein Systembauer." />
          <div className="space-y-6 text-lg leading-relaxed text-muted-foreground lg:pt-16">
            <p>
              VZG CONSULT ist die persönliche Experten- und B2B-Marke von{" "}
              <span className="text-foreground">Vilislav Gitsov</span>. Ein Gründer begleitet Ihr
              Projekt von der Geschäftsidee über Prozessanalyse, Architektur und KI-/Automatisierungsdesign
              bis zur Implementierung – und trägt dafür die Verantwortung.
            </p>
            <p>
              Die Grundlage: über fünf Jahre operative Erfahrung in Kundenservice, Vertrieb und
              Vertragsmanagement, heute kombiniert mit KI, Automatisierung und digitaler
              Produktentwicklung.
            </p>
            <Link
              to="/about"
              className="inline-flex items-center gap-2 font-mono text-xs tracking-widest text-foreground uppercase underline-offset-4 hover:underline"
            >
              Über den Gründer <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </Section>

      {/* Services */}
      <Section className="bg-surface">
        <SectionHeading
          eyebrow="Leistungen"
          title="Sechs Felder. Ein Prinzip: Systeme, die im Betrieb funktionieren."
        />
        <div className="mt-14 grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <Link
              key={s.id}
              to="/services"
              hash={s.id}
              className="group flex flex-col bg-background p-7 transition-colors hover:bg-surface-raised"
            >
              <Kicker n={s.index} label="Leistung" />
              <h3 className="mt-6 text-xl font-medium tracking-tight">{s.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{s.short}</p>
              <span className="mt-8 inline-flex items-center gap-2 font-mono text-[0.65rem] tracking-widest text-muted-foreground uppercase transition-colors group-hover:text-foreground">
                Details <ArrowRight className="size-3" />
              </span>
            </Link>
          ))}
        </div>
      </Section>

      {/* HORIZON */}
      <Section>
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <Eyebrow>Flagship-Projekt</Eyebrow>
            <h2 className="display mt-5 text-4xl md:text-6xl">HORIZON by VZG</h2>
            <p className="lede mt-6">
              Das erste unter VZG CONSULT entwickelte Flagship-Produkt – und der primäre Nachweis für
              Produkt-, Automatisierungs- und Plattformentwicklung aus einer Hand.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <StatusBadge status="exists" />
              <StatusBadge status="building" />
              <StatusBadge status="planned" />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Die Case Study unterscheidet transparent zwischen Vorhandenem, Laufendem und Geplantem.
            </p>
            <Button asChild size="lg" className="mt-8">
              <Link to="/horizon">
                Case Study lesen <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="panel relative aspect-[4/3] overflow-hidden rounded-lg">
            <div className="bg-grid absolute inset-0" aria-hidden />
            <div className="absolute inset-x-8 top-8 h-8 rounded-sm border border-border bg-surface-raised" />
            <div className="absolute inset-y-24 left-8 w-40 rounded-sm border border-border bg-surface-raised" />
            <div className="absolute top-24 right-8 bottom-8 left-56 grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="rounded-sm border border-border bg-surface-raised" />
              ))}
            </div>
            <span className="absolute bottom-3 left-1/2 -translate-x-1/2 font-mono text-[0.6rem] tracking-[0.2em] text-muted-foreground uppercase">
              Screenshot-Platzhalter
            </span>
          </div>
        </div>
      </Section>

      {/* Project Intelligence */}
      <Section className="bg-surface">
        <div className="panel relative overflow-hidden rounded-lg p-8 md:p-14">
          <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-end">
            <div>
              <Eyebrow>VZG Project Intelligence</Eyebrow>
              <h2 className="display mt-5 text-3xl md:text-5xl">
                Sie haben eine Geschäftsidee?
                <br />
                <span className="text-muted-foreground">
                  Prüfen Sie ihr Potenzial, bevor Sie in die Entwicklung investieren.
                </span>
              </h2>
              <p className="mt-6 max-w-xl text-muted-foreground">
                KI-gestützte Analyse von Marktbelegen, Kundenproblem, Wettbewerb, Geschäftsmodell,
                technischer Machbarkeit, Kosten, Risiken und Umsatzszenarien – auf Basis verfügbarer
                Evidenz und offengelegter Annahmen.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between border-b border-border pb-3 font-mono text-xs tracking-widest uppercase">
                <span className="text-muted-foreground">Kostenlos</span>
                <span>3 Analysen / Konto</span>
              </div>
              <div className="flex items-baseline justify-between border-b border-border pb-3 font-mono text-xs tracking-widest uppercase">
                <span className="text-muted-foreground">Weitere Analyse</span>
                <span>49,00 €</span>
              </div>
              <Button asChild size="xl" variant="accent" className="mt-4">
                <Link to="/project-intelligence">Geschäftsidee analysieren</Link>
              </Button>
            </div>
          </div>
        </div>
      </Section>

      {/* How VZG works */}
      <Section>
        <SectionHeading
          eyebrow="Arbeitsweise"
          title="Anders als eine große Agentur."
          lede="Die Struktur ist bewusst schlank – nicht aus Mangel, sondern weil sie für individuelle Systeme das bessere Modell ist."
        />
        <div className="mt-14 grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-2">
          {principles.map((p) => (
            <div key={p.n} className="bg-background p-8">
              <Kicker n={p.n} label="Prinzip" />
              <h3 className="mt-5 text-xl font-medium tracking-tight">{p.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.text}</p>
            </div>
          ))}
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
