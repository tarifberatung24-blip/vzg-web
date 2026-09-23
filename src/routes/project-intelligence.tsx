import { useCallback, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Container,
  Eyebrow,
  Kicker,
  Panel,
  Section,
  SectionHeading,
} from "@/components/site/primitives";
import { ErrorNotice, GuestPreviewForm } from "@/components/site/GuestPreviewForm";
import { GuestPreviewResult } from "@/components/site/GuestPreviewResult";
import { getGuestPreviewState, runGuestPreview } from "@/lib/preview.functions";
import { PREVIEW_ERROR_MESSAGES, type GuestPreviewSuccess } from "@/lib/preview.schema";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/project-intelligence")({
  head: () =>
    pageHead({
      title: "VZG Project Intelligence — Geschäftsidee prüfen, bevor Sie investieren",
      description:
        "KI-gestützte Analyse von Geschäftsideen: Marktbelege, Kundenproblem, Wettbewerb, Geschäftsmodell, Machbarkeit, Kosten, Risiken und Umsatzszenarien. 3 Analysen kostenlos pro verifiziertem Geschäftskonto.",
      path: "/project-intelligence",
    }),
  // The preview counter is a server decision, so it is read before render.
  loader: async () => {
    try {
      return { distribution: await getGuestPreviewState() };
    } catch {
      return { distribution: { remaining: null, limitMode: null, configured: true } };
    }
  },
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
  {
    n: "01",
    title: "Vorprüfung ohne Konto",
    text: "Sie beschreiben Idee und Zielmarkt und erhalten sofort eine kostenlose Vorprüfung: Compliance-Signal, Geschäftsmodell, Machbarkeit und Kernrisiken.",
  },
  {
    n: "02",
    title: "Geschäftskonto verifizieren",
    text: "Für die vollständige Analyse bestätigen Sie eine geschäftliche E-Mail-Adresse. Drei vollständige Analysen sind kostenlos.",
  },
  {
    n: "03",
    title: "Vollständige Analyse erhalten",
    text: "Strukturierte Auswertung entlang der elf Dimensionen – mit recherchierten Quellen, unabhängiger Verifikation und offengelegten Annahmen.",
  },
  {
    n: "04",
    title: "Umsetzungsangebot anfordern",
    text: "Auf Wunsch erstellt VZG CONSULT innerhalb von 2 Werktagen ein individuelles Umsetzungsangebot.",
  },
];

/** Section id used by the in-page CTA so it works without a route change. */
const PREVIEW_SECTION_ID = "guest-preview";

function scrollToPreview() {
  document
    .getElementById(PREVIEW_SECTION_ID)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function ProjectIntelligencePage() {
  const navigate = useNavigate();
  const { distribution } = Route.useLoaderData();
  const [result, setResult] = useState<GuestPreviewSuccess | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  // The loader reads the counter once per navigation, so it goes stale after a
  // successful preview. Every response carries the authoritative remaining
  // count, so it is mirrored here instead of leaving the UI to guess.
  const [remaining, setRemaining] = useState<number | null>(distribution.remaining);

  const handleResult = useCallback((response: Awaited<ReturnType<typeof runGuestPreview>>) => {
    if (response.ok) {
      setFailure(null);
      setResult(response);
      setRemaining(response.remaining);
      return;
    }
    if (response.code === "RATE_LIMITED") {
      setRemaining(0);
    }
    setFailure(response.message || PREVIEW_ERROR_MESSAGES[response.code]);
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setFailure(null);
  }, []);

  if (result) {
    return (
      <Section bordered={false} className="pt-20 md:pt-28">
        <div className="mb-10 max-w-3xl">
          <Eyebrow>Ergebnis der Vorprüfung</Eyebrow>
          <h1 className="display mt-5 text-3xl md:text-5xl">
            Erste Einschätzung Ihrer Geschäftsidee.
          </h1>
          <p className="lede mt-5 text-base">
            Acht Abschnitte, in wenigen Sekunden erstellt. Diese Vorprüfung ist bewusst leicht: Sie
            strukturiert Ihre Idee und zeigt die wichtigsten Ansatzpunkte, ohne Recherche zu
            betreiben.
          </p>
        </div>
        <GuestPreviewResult
          result={result}
          onReset={reset}
          onCreateAccount={() => void navigate({ to: "/auth" })}
        />
      </Section>
    );
  }

  return (
    <>
      <section
        id={PREVIEW_SECTION_ID}
        className="relative scroll-mt-24 overflow-hidden border-b border-border"
      >
        <div className="bg-grid mask-fade pointer-events-none absolute inset-0" aria-hidden />
        <Container className="relative grid gap-12 py-20 md:py-28 lg:grid-cols-[1.05fr_1fr] lg:items-start">
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
              Beschreiben Sie Ihre Idee und erhalten Sie sofort eine kostenlose Vorprüfung entlang
              von Compliance-Signal, Geschäftsmodell, technischer Machbarkeit und den zentralen
              Risiken. Ohne Anmeldung. Ohne Kosten.
            </p>
            <p className="mt-6 max-w-xl text-sm text-muted-foreground">
              Für die belastbare Version mit recherchierten Quellen, unabhängiger Verifikation,
              Markt- und Finanzmodell nutzen Sie anschließend die vollständige Analyse.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 font-mono text-[0.65rem] tracking-widest text-muted-foreground uppercase">
              <span className="flex items-center gap-2">
                <ShieldCheck className="size-3.5 text-accent" /> Keine Anmeldung
              </span>
              <span className="flex items-center gap-2">
                <ShieldCheck className="size-3.5 text-accent" /> Keine Kosten
              </span>
              <span className="flex items-center gap-2">
                <ShieldCheck className="size-3.5 text-accent" /> Ergebnis in Sekunden
              </span>
            </div>
          </div>

          <div className="space-y-5">
            {!distribution.configured ? (
              <Panel>
                <p className="eyebrow">Wartung</p>
                <p className="mt-4 text-sm text-muted-foreground">
                  {PREVIEW_ERROR_MESSAGES.NOT_CONFIGURED} In der Zwischenzeit können Sie ein
                  individuelles Angebot anfordern.
                </p>
                <Button asChild size="xl" variant="accent" className="mt-6">
                  <Link to="/contact" search={{ intent: "project-intelligence" }}>
                    Angebot anfordern <ArrowRight />
                  </Link>
                </Button>
              </Panel>
            ) : (
              <GuestPreviewForm
                onResult={handleResult}
                disabled={remaining === 0}
                remaining={remaining}
              />
            )}
            {failure && <ErrorNotice message={failure} />}
            {distribution.configured && remaining === 0 && (
              <ErrorNotice message="Für diese Sitzung sind alle kostenlosen Vorprüfungen aufgebraucht. Erstellen Sie einen Business Account für drei vollständige Analysen." />
            )}
          </div>
        </Container>
      </section>

      <Section>
        <SectionHeading
          eyebrow="Konditionen"
          title="Vorprüfung kostenlos. Vollständige Analyse ab dem Business Account."
          lede="Die Vorprüfung kostet nichts und benötigt kein Konto. Die vollständige Project-Intelligence-Analyse ist an ein verifiziertes Business-Konto gebunden."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <Panel>
            <p className="eyebrow">Ohne Konto</p>
            <p className="mt-4 text-3xl font-medium tracking-tight">0 €</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Vorprüfung Ihrer Idee: Compliance-Signal, Geschäftsmodell, Machbarkeit, Risiken und
              nächste Schritte.
            </p>
            <p className="mt-4 font-mono text-[0.65rem] tracking-widest text-muted-foreground uppercase">
              Kein Konto · Keine Zahlungsdaten
            </p>
          </Panel>
          <Panel>
            <p className="eyebrow">Business Account</p>
            <p className="mt-4 text-3xl font-medium tracking-tight">3 Analysen</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Drei vollständige Analysen kostenlos nach Bestätigung Ihrer geschäftlichen
              E-Mail-Adresse.
            </p>
            <p className="mt-4 font-mono text-[0.65rem] tracking-widest text-muted-foreground uppercase">
              Kostenlos · Nach Verifizierung
            </p>
          </Panel>
          <Panel>
            <p className="eyebrow">Jede weitere Analyse</p>
            <p className="mt-4 text-3xl font-medium tracking-tight">49,00 €</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Vollständige Analyse im Einzelpreis, abgerechnet nach Beauftragung.
            </p>
            <p className="mt-4 font-mono text-[0.65rem] tracking-widest text-muted-foreground uppercase">
              Pro Analyse
            </p>
          </Panel>
        </div>
      </Section>

      <Section>
        <SectionHeading
          eyebrow="Was analysiert wird"
          title="Elf Dimensionen. Eine strukturierte Antwort."
          lede="Statt einer Meinung erhalten Sie eine nachvollziehbare Auswertung, die zeigt, welche Annahmen tragen – und welche zuerst überprüft werden sollten."
        />
        <ol className="mt-14 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {dimensions.map(([t, d], i) => (
            <li key={t} className="bg-background p-6">
              <span className="font-mono text-xs text-accent">
                {String(i + 1).padStart(2, "0")}
              </span>
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
              <p className="mt-3 text-xl font-medium tracking-tight">
                Kostenlose Vorprüfung starten
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Ohne Anmeldung und ohne Kosten. Direkt oben auf dieser Seite.
              </p>
            </div>
            <Button size="xl" variant="accent" onClick={scrollToPreview}>
              Zur Vorprüfung <ArrowRight />
            </Button>
          </Panel>
          <Panel className="flex flex-col justify-between gap-6">
            <div>
              <p className="eyebrow">Nach der Analyse</p>
              <p className="mt-3 text-xl font-medium tracking-tight">
                Individuelles Umsetzungsangebot anfordern
              </p>
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
            <h2 className="display mt-5 text-3xl md:text-4xl">
              Was die Analyse ist – und was nicht.
            </h2>
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
              <li
                key={t}
                className="flex gap-4 border-b border-border pb-4 text-sm leading-relaxed"
              >
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
