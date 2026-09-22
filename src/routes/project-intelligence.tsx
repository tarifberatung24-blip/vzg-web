import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container, Eyebrow, Kicker, Panel, Section, SectionHeading } from "@/components/site/primitives";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/project-intelligence")({
  head: () =>
    pageHead({
      title: "VZG Project Intelligence — Geschäftsidee prüfen, bevor Sie investieren",
      description:
        "KI-gestützte Analyse von Geschäftsideen: Marktbelege, Kundenproblem, Wettbewerb, Geschäftsmodell, Machbarkeit, Kosten, Risiken und Umsatzszenarien. 3 Analysen kostenlos pro verifiziertem Geschäftskonto.",
      path: "/project-intelligence",
    }),
  component: ProjectIntelligencePage,
});

const dimensions = [
  ["Marktbelege", "Welche Evidenz spricht für eine reale Nachfrage?"],
  ["Kundenproblem", "Wie konkret, dringend und zahlungsrelevant ist das Problem?"],
  ["Wettbewerb", "Wer löst das Problem heute – und wie?"],
  ["Geschäftsmodell", "Wie entsteht Wert, und für wen?"],
  ["Monetarisierung", "Welche Erlösmechanik ist plausibel?"],
  ["Technische Machbarkeit", "Was ist mit heutigen Mitteln realistisch umsetzbar?"],
  ["Betriebskosten", "Welche laufenden Kosten sind zu erwarten?"],
  ["Risiken", "Welche Annahmen sind kritisch, welche Faktoren gefährden das Vorhaben?"],
  ["Umsatzszenarien", "Wie sehen konservative, mittlere und optimistische Verläufe aus?"],
  ["Break-even-Annahmen", "Unter welchen Bedingungen trägt sich das Vorhaben?"],
  ["Umsetzungsmachbarkeit", "Wie aufwendig ist der Weg vom Konzept zum System?"],
];

const steps = [
  { n: "01", title: "Geschäftskonto verifizieren", text: "Anmeldung mit geschäftlicher E-Mail-Adresse. Drei vollständige Analysen sind kostenlos." },
  { n: "02", title: "Idee strukturiert beschreiben", text: "Ein geführter Fragebogen erfasst Idee, Zielgruppe, Annahmen und Rahmenbedingungen." },
  { n: "03", title: "Analyse erhalten", text: "Sie erhalten eine strukturierte Auswertung entlang der elf Dimensionen – mit offengelegten Annahmen." },
  { n: "04", title: "Umsetzungsangebot anfordern", text: "Auf Wunsch erstellt VZG CONSULT innerhalb von 2 Werktagen ein individuelles Umsetzungsangebot." },
];

function ProjectIntelligencePage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <div className="bg-grid mask-fade pointer-events-none absolute inset-0" aria-hidden />
        <Container className="relative grid gap-12 py-20 md:py-28 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <div>
            <Eyebrow>VZG Project Intelligence</Eyebrow>
            <h1 className="display mt-6 text-4xl sm:text-5xl md:text-6xl">
              Sie haben eine Geschäftsidee?
              <br />
              <span className="text-muted-foreground">
                Prüfen Sie ihr Potenzial, bevor Sie in die Entwicklung investieren.
              </span>
            </h1>
            <p className="lede mt-8 max-w-xl">
              Eine KI-gestützte Analyse, die Ihre Idee entlang von Markt, Problem, Modell, Machbarkeit,
              Kosten und Risiken strukturiert bewertet – auf Basis verfügbarer Evidenz, offengelegter
              Annahmen und Szenariorechnungen.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="xl" variant="accent">
                <Link to="/contact" search={{ intent: "project-intelligence" }}>
                  Geschäftsidee analysieren
                </Link>
              </Button>
            </div>
            <p className="mt-4 font-mono text-[0.65rem] tracking-widest text-muted-foreground uppercase">
              Die interaktive Anwendung wird derzeit vorbereitet · Frühzugang über Anfrage
            </p>
          </div>

          <Panel>
            <p className="eyebrow">Konditionen</p>
            <dl className="mt-5 space-y-4">
              <div className="flex items-baseline justify-between border-b border-border pb-4">
                <dt className="text-sm text-muted-foreground">Kostenlose Analysen</dt>
                <dd className="text-right font-medium">3 pro verifiziertem Geschäftskonto</dd>
              </div>
              <div className="flex items-baseline justify-between border-b border-border pb-4">
                <dt className="text-sm text-muted-foreground">Jede weitere vollständige Analyse</dt>
                <dd className="font-medium">49,00 €</dd>
              </div>
              <div className="flex items-baseline justify-between pb-1">
                <dt className="text-sm text-muted-foreground">Umsetzungsangebot</dt>
                <dd className="text-right font-medium">Innerhalb von 2 Werktagen</dd>
              </div>
            </dl>
          </Panel>
        </Container>
      </section>

      <Section>
        <SectionHeading
          eyebrow="Was analysiert wird"
          title="Elf Dimensionen. Eine strukturierte Antwort."
          lede="Statt einer Meinung erhalten Sie eine nachvollziehbare Auswertung, die zeigt, welche Annahmen tragen – und welche zuerst überprüft werden sollten."
        />
        <ol className="mt-14 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {dimensions.map(([t, d], i) => (
            <li key={t} className="bg-background p-6">
              <span className="font-mono text-xs text-accent">{String(i + 1).padStart(2, "0")}</span>
              <p className="mt-3 font-medium">{t}</p>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section className="bg-surface">
        <SectionHeading eyebrow="Ablauf" title="Von der Idee zur Entscheidung." />
        <ol className="mt-14 grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-4">
          {steps.map((s) => (
            <li key={s.n} className="bg-background p-7">
              <Kicker n={s.n} label="Schritt" />
              <h3 className="mt-5 text-lg font-medium tracking-tight">{s.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <Panel className="flex flex-col justify-between gap-6">
            <div>
              <p className="eyebrow">Schritt 1</p>
              <p className="mt-3 text-xl font-medium tracking-tight">Geschäftsidee analysieren</p>
              <p className="mt-2 text-sm text-muted-foreground">Strukturierte Auswertung Ihrer Idee entlang der elf Dimensionen.</p>
            </div>
            <Button asChild size="xl" variant="accent">
              <Link to="/contact" search={{ intent: "project-intelligence" }}>
                Geschäftsidee analysieren
              </Link>
            </Button>
          </Panel>
          <Panel className="flex flex-col justify-between gap-6">
            <div>
              <p className="eyebrow">Nach der Analyse</p>
              <p className="mt-3 text-xl font-medium tracking-tight">Individuelles Umsetzungsangebot anfordern</p>
              <p className="mt-2 text-sm text-muted-foreground">
                VZG CONSULT erstellt innerhalb von 2 Werktagen ein individuelles Umsetzungsangebot.
              </p>
            </div>
            <Button asChild size="xl" variant="outline">
              <Link to="/contact">
                Umsetzungsangebot anfordern <ArrowRight />
              </Link>
            </Button>
          </Panel>
        </div>
      </Section>

      <Section>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <Eyebrow>Transparenz</Eyebrow>
            <h2 className="display mt-5 text-3xl md:text-4xl">Was die Analyse ist – und was nicht.</h2>
          </div>
          <ul className="space-y-4">
            {[
              "Die Analyse ist KI-gestützt und wird durch strukturierte Methodik ergänzt.",
              "Ergebnisse basieren auf verfügbarer Evidenz, offengelegten Annahmen und Szenariorechnungen.",
              "Es gibt keine Garantie für geschäftlichen Erfolg.",
              "Umsatzangaben sind Szenarien, keine Prognosen oder Zusagen.",
              "Eine Compliance-Vorprüfung ersetzt keine individuelle Rechtsberatung.",
              "Interne Bewertungsmethodik, Gewichtungen und Arbeitsabläufe von VZG sind vertraulich und nicht Teil der Ausgabe.",
            ].map((t) => (
              <li key={t} className="flex gap-4 border-b border-border pb-4 text-sm leading-relaxed">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" />
                <span className="text-muted-foreground">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>
    </>
  );
}
