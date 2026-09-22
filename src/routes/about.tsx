import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container, Eyebrow, Kicker, Panel, Section, SectionHeading } from "@/components/site/primitives";
import { CtaBand } from "@/components/site/CtaBand";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/about")({
  head: () =>
    pageHead({
      title: "Über VZG CONSULT — Vilislav Gitsov, Founder & AI Automation Builder",
      description:
        "Vilislav Gitsov verbindet 5+ Jahre operative Erfahrung in Kundenservice, Vertrieb und Vertragsmanagement mit KI, Automatisierung und digitaler Produktentwicklung. Ein Gründer, volle Verantwortung.",
      path: "/about",
    }),
  component: AboutPage,
});

const background = [
  "5+ Jahre Kundenservice, Vertrieb und Vertragsmanagement",
  "E.ON Energie Deutschland",
  "3rd-Level-Kundenservice",
  "Kundenprozesse und Vertragsprozesse",
  "Beschwerdemanagement",
  "Abrechnungsnahe Operations",
  "Salesforce und SAP CRM im täglichen Einsatz",
];

const today = ["KI", "Automatisierung", "Digitale Produkte", "Business-Systeme", "Workflow-Design"];

const differences = [
  ["Direkte Kommunikation", "Analyse, Architektur und Umsetzung liegen bei einer Person – Sie sprechen immer mit ihr."],
  ["Keine unnötigen Managementebenen", "Kein Account-Management, keine Übergaben zwischen Abteilungen, keine Reibungsverluste."],
  ["Eine verantwortliche Person", "Entscheidungen, Qualität und Ergebnis haben einen klaren Namen."],
  ["Technologie nach Problem", "Werkzeuge werden anhand der Anforderung gewählt, nicht anhand des Portfolios."],
  ["Kontinuierliche Iteration", "Systeme entstehen in nutzbaren Schritten und werden im Betrieb weiterentwickelt."],
];

function AboutPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <div className="bg-grid mask-fade pointer-events-none absolute inset-0" aria-hidden />
        <Container className="relative grid gap-12 py-20 md:py-28 lg:grid-cols-[1.3fr_1fr] lg:items-end">
          <div>
            <Eyebrow>Gründer</Eyebrow>
            <h1 className="display mt-6 text-5xl md:text-7xl">Vilislav Gitsov</h1>
            <p className="mt-4 font-mono text-xs tracking-widest text-muted-foreground uppercase">
              Founder · AI Automation & Digital Product Builder · VZG CONSULT
            </p>
            <p className="lede mt-8 max-w-xl">
              Autodidakt – und in ständiger Weiterentwicklung durch praktische Umsetzung, Experimente und
              das Lösen realer Probleme. VZG CONSULT ist die persönliche Experten- und B2B-Marke, unter der
              jedes Projekt von einer Person verantwortet wird.
            </p>
          </div>
          <Panel className="text-center">
            <p className="display text-2xl md:text-3xl">
              One Vision.
              <br />
              One Builder.
              <br />
              Full Responsibility.
            </p>
            <p className="mt-6 font-mono text-[0.65rem] tracking-[0.2em] text-muted-foreground uppercase">
              Leitprinzip von VZG CONSULT
            </p>
          </Panel>
        </Container>
      </section>

      <Section>
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <Kicker n="01" label="Herkunft" />
            <h2 className="display mt-4 text-3xl md:text-4xl">Operative Erfahrung</h2>
            <p className="mt-5 text-muted-foreground">
              Die Grundlage der Arbeit ist kein Studium der Informatik, sondern Jahre im operativen
              Geschäft – dort, wo Prozesse tatsächlich brechen.
            </p>
            <ul className="mt-8 space-y-3">
              {background.map((b) => (
                <li key={b} className="flex gap-3 border-b border-border pb-3 text-sm">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <Kicker n="02" label="Heute" />
            <h2 className="display mt-4 text-3xl md:text-4xl">Systeme bauen</h2>
            <p className="mt-5 text-muted-foreground">
              Dieses operative Verständnis wird heute mit technischer Umsetzung kombiniert: Ich baue die
              Systeme, die ich früher selbst gebraucht hätte.
            </p>
            <ul className="mt-8 flex flex-wrap gap-2">
              {today.map((t) => (
                <li key={t} className="rounded-sm border border-border-strong px-3 py-2 font-mono text-[0.7rem] tracking-widest uppercase">
                  {t}
                </li>
              ))}
            </ul>
            <p className="mt-8 text-sm text-muted-foreground">
              Ich positioniere mich bewusst nicht als Senior Software Engineer, AI Scientist oder
              ML-Forscher – sondern als jemand, der Geschäftsprobleme versteht und daraus funktionierende
              Systeme baut.
            </p>
          </div>
        </div>
      </Section>

      <Section className="bg-surface">
        <SectionHeading
          eyebrow="Arbeitsweise"
          title="Warum VZG anders arbeitet als eine große Agentur."
        />
        <ol className="mt-14 grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-2 lg:grid-cols-5">
          {differences.map(([t, d], i) => (
            <li key={t} className="bg-background p-6">
              <span className="font-mono text-xs text-accent">0{i + 1}</span>
              <p className="mt-4 font-medium">{t}</p>
              <p className="mt-2 text-sm text-muted-foreground">{d}</p>
            </li>
          ))}
        </ol>
        <Button asChild size="lg" className="mt-12">
          <Link to="/contact">
            Projekt besprechen <ArrowRight />
          </Link>
        </Button>
      </Section>

      <CtaBand />
    </>
  );
}
