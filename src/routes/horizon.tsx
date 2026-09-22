import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Container,
  Eyebrow,
  Kicker,
  Panel,
  Section,
  SectionHeading,
  StatusBadge,
  type Status,
} from "@/components/site/primitives";
import { CtaBand } from "@/components/site/CtaBand";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/horizon")({
  head: () =>
    pageHead({
      title: "HORIZON by VZG — Case Study des Flagship-Produkts",
      description:
        "HORIZON by VZG ist das erste Flagship-Produkt von VZG CONSULT: Problem, Vision, Architektur, KI-Fähigkeiten, Automatisierung und aktueller Entwicklungsstand – transparent dokumentiert.",
      path: "/horizon",
      type: "article",
    }),
  component: HorizonPage,
});

const chapters = [
  { id: "problem", n: "01", label: "Problem" },
  { id: "vision", n: "02", label: "Vision" },
  { id: "produkt", n: "03", label: "Produkt" },
  { id: "architektur", n: "04", label: "Architektur" },
  { id: "ki", n: "05", label: "KI-Fähigkeiten" },
  { id: "automatisierung", n: "06", label: "Automatisierung" },
  { id: "betrieb", n: "07", label: "Betriebslogik" },
  { id: "philosophie", n: "08", label: "Entwicklungsphilosophie" },
  { id: "status", n: "09", label: "Aktueller Stand" },
  { id: "demo", n: "10", label: "Screenshots & Demo" },
];

const capabilities: { title: string; text: string; status: Status }[] = [
  { title: "Strukturierte Aufnahme von Eingaben", text: "Eingehende Informationen werden in ein festes Datenmodell überführt, statt als Freitext zu verbleiben.", status: "exists" },
  { title: "Klassifizierung und Priorisierung", text: "KI-gestützte Einordnung von Fällen nach Typ, Dringlichkeit und Zuständigkeit – mit Rückfallebene für unklare Fälle.", status: "building" },
  { title: "Assistierte Bearbeitung", text: "Vorschläge für Antworten und nächste Schritte, die von Menschen geprüft und freigegeben werden.", status: "building" },
  { title: "Wissensgestützte Antworten", text: "Anbindung interner Wissensquellen, damit Antworten auf dokumentierten Regeln basieren.", status: "planned" },
];

const automations: { title: string; text: string; status: Status }[] = [
  { title: "Routing und Zuweisung", text: "Regelbasierte Weiterleitung an Rollen, Teams oder externe Systeme.", status: "exists" },
  { title: "Benachrichtigungen und Follow-ups", text: "Zeit- und ereignisgesteuerte Erinnerungen, Statusmeldungen und Nachfassaktionen.", status: "building" },
  { title: "System-Integrationen", text: "Anbindung an CRM, Kommunikations- und Betriebssysteme über APIs und n8n.", status: "building" },
  { title: "Eskalationsketten", text: "Automatische Eskalation bei Fristüberschreitung oder definierten Risikomerkmalen.", status: "planned" },
];

const philosophy = [
  "Das Datenmodell kommt vor der Oberfläche.",
  "KI ergänzt Regeln, sie ersetzt sie nicht.",
  "Jeder automatisierte Schritt hat einen menschlichen Übergabepunkt.",
  "Nachvollziehbarkeit vor Magie: Jede Entscheidung ist protokolliert.",
  "Das Produkt wird im eigenen Betrieb genutzt, bevor es anderen angeboten wird.",
];

function HorizonPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="bg-grid mask-fade pointer-events-none absolute inset-0" aria-hidden />
        <Container className="relative py-20 md:py-28">
          <Eyebrow>Case Study · Flagship-Projekt</Eyebrow>
          <h1 className="display mt-6 text-5xl md:text-7xl">HORIZON by VZG</h1>
          <p className="lede mt-8 max-w-2xl">
            Das erste unter VZG CONSULT entwickelte Flagship-Produkt. HORIZON dient als primärer Nachweis
            dafür, wie VZG Produkt-, Automatisierungs- und Plattformentwicklung als Gesamtsystem denkt und
            umsetzt.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-2"><StatusBadge status="exists" /> Bereits umgesetzt</span>
            <span className="flex items-center gap-2"><StatusBadge status="building" /> In aktiver Entwicklung</span>
            <span className="flex items-center gap-2"><StatusBadge status="planned" /> Geplant, noch nicht begonnen</span>
          </div>
        </Container>
      </section>

      <Container className="grid gap-16 py-16 lg:grid-cols-[220px_1fr] lg:py-24">
        {/* Chapter nav */}
        <nav aria-label="Kapitel" className="hidden lg:block">
          <ol className="sticky top-24 space-y-3 border-l border-border">
            {chapters.map((c) => (
              <li key={c.id}>
                <a
                  href={`#${c.id}`}
                  className="-ml-px flex items-baseline gap-3 border-l border-transparent pl-4 font-mono text-[0.65rem] tracking-widest text-muted-foreground uppercase transition-colors hover:border-accent hover:text-foreground"
                >
                  <span className="text-accent">{c.n}</span>
                  {c.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="space-y-24">
          <Chapter id="problem" n="01" title="Problem">
            <p>
              In vielen Unternehmen laufen operative Abläufe über E-Mail, Telefon, Tabellen und mehrere,
              nicht verbundene Systeme. Informationen gehen zwischen Eingang, Bearbeitung und Abschluss
              verloren; Zuständigkeiten sind unklar; Wissen liegt bei einzelnen Personen.
            </p>
            <p>
              Diese Beobachtung stammt aus mehr als fünf Jahren eigener Arbeit im operativen Kundenservice,
              in Vertrags- und Abrechnungsprozessen. Die typischen Symptome: doppelte Erfassung, lange
              Durchlaufzeiten, manuelle Eskalationen und fehlende Übersicht über den tatsächlichen Stand.
            </p>
          </Chapter>

          <Chapter id="vision" n="02" title="Vision">
            <p>
              HORIZON soll operative Prozesse als <em>System</em> abbilden: Eingänge werden strukturiert
              erfasst, automatisch eingeordnet, an die richtige Stelle geleitet und mit KI-Unterstützung
              bearbeitet – während Menschen jederzeit die Kontrolle über Entscheidungen behalten.
            </p>
            <p>
              Das Ziel ist nicht, Mitarbeitende zu ersetzen, sondern Routinearbeit zu entfernen und
              Entscheidungen mit besseren Informationen zu unterlegen.
            </p>
          </Chapter>

          <Chapter id="produkt" n="03" title="Produkt">
            <p>
              HORIZON ist eine webbasierte B2B-Plattform mit rollenbasiertem Zugang, einem zentralen
              Fall- und Vorgangsmodell, konfigurierbaren Workflows und einer Integrationsschicht zu
              bestehenden Systemen.
            </p>
            <div className="not-prose grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
              {[
                ["Vorgänge", "Zentrales Datenmodell für Fälle, Status, Historie und Zuständigkeit."],
                ["Workflows", "Konfigurierbare Abläufe mit Regeln, Fristen und Übergabepunkten."],
                ["Integrationen", "Schnittstellen zu CRM, Kommunikation und Betriebssystemen."],
              ].map(([t, d]) => (
                <div key={t} className="bg-background p-5">
                  <p className="font-mono text-xs tracking-widest text-foreground uppercase">{t}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{d}</p>
                </div>
              ))}
            </div>
          </Chapter>

          <Chapter id="architektur" n="04" title="Architektur-Überblick">
            <p>
              Die Architektur trennt bewusst öffentliche Oberfläche, authentifizierte Anwendung,
              serverseitige Logik und Automatisierungsebene. Sensible Verarbeitung findet ausschließlich
              serverseitig statt.
            </p>
            <ArchitectureDiagram />
            <p className="text-sm">
              Detaillierte Schnittstellen, Datenmodelle und interne Verarbeitungslogik sind Teil der
              vertraulichen Produktarchitektur und werden hier nicht veröffentlicht.
            </p>
          </Chapter>

          <Chapter id="ki" n="05" title="KI-Fähigkeiten">
            <p>
              KI wird in HORIZON an klar definierten Punkten eingesetzt – dort, wo unstrukturierte
              Information in strukturierte Entscheidungen überführt werden muss.
            </p>
            <StatusList items={capabilities} />
          </Chapter>

          <Chapter id="automatisierung" n="06" title="Automatisierung">
            <p>
              Die Automatisierungsebene verbindet HORIZON mit dem Rest der Systemlandschaft und übernimmt
              wiederkehrende Abläufe, die heute manuell angestoßen werden.
            </p>
            <StatusList items={automations} />
          </Chapter>

          <Chapter id="betrieb" n="07" title="Operative Logik">
            <p>
              Jeder Vorgang durchläuft definierte Zustände. Übergänge werden durch Regeln, Fristen oder
              menschliche Entscheidungen ausgelöst und vollständig protokolliert. Automatisierte Schritte
              haben stets einen definierten Rückfall auf manuelle Bearbeitung.
            </p>
            <div className="not-prose overflow-x-auto rounded-lg border border-border">
              <div className="flex min-w-[560px] items-center justify-between gap-2 bg-surface p-5 font-mono text-[0.65rem] tracking-widest uppercase">
                {["Eingang", "Erfassung", "Einordnung", "Bearbeitung", "Prüfung", "Abschluss"].map((s, i, arr) => (
                  <div key={s} className="flex flex-1 items-center gap-2">
                    <span className="rounded-sm border border-border-strong bg-background px-3 py-2 whitespace-nowrap">{s}</span>
                    {i < arr.length - 1 && <span className="h-px flex-1 bg-border-strong" />}
                  </div>
                ))}
              </div>
            </div>
          </Chapter>

          <Chapter id="philosophie" n="08" title="Entwicklungsphilosophie">
            <ul className="not-prose space-y-3">
              {philosophy.map((p, i) => (
                <li key={p} className="flex gap-4 border-b border-border pb-3">
                  <span className="font-mono text-xs text-accent">0{i + 1}</span>
                  <span className="text-foreground">{p}</span>
                </li>
              ))}
            </ul>
          </Chapter>

          <Chapter id="status" n="09" title="Aktueller Stand">
            <p>
              HORIZON befindet sich in aktiver Entwicklung. Kernmodell, Grundoberfläche und erste
              Routing-Automatisierungen sind vorhanden; KI-gestützte Einordnung, assistierte Bearbeitung
              und Integrationen werden derzeit ausgebaut. Wissensanbindung und Eskalationsketten sind
              geplant.
            </p>
            <p className="text-sm">
              Es werden bewusst keine Kunden-, Nutzungs- oder Ergebniszahlen genannt. Sobald belastbare
              Betriebsdaten vorliegen, werden sie an dieser Stelle transparent ergänzt.
            </p>
          </Chapter>

          <Chapter id="demo" n="10" title="Screenshots & Demo">
            <div className="not-prose grid gap-4 sm:grid-cols-2">
              {["Vorgangsübersicht", "Fall-Detail", "Workflow-Konfiguration", "Integrationen"].map((label) => (
                <div key={label} className="panel relative aspect-[16/10] overflow-hidden rounded-lg">
                  <div className="bg-grid absolute inset-0" aria-hidden />
                  <div className="absolute inset-x-5 top-5 h-5 rounded-sm border border-border bg-surface-raised" />
                  <div className="absolute top-14 right-5 bottom-5 left-5 rounded-sm border border-dashed border-border-strong" />
                  <span className="absolute bottom-3 left-4 font-mono text-[0.6rem] tracking-[0.2em] text-muted-foreground uppercase">
                    {label} · Platzhalter
                  </span>
                </div>
              ))}
            </div>
            <p className="text-sm">
              Screenshots und eine geführte Demo werden ergänzt, sobald die entsprechenden Module den
              Entwicklungsstand „vorhanden“ erreicht haben.
            </p>
            <Button asChild variant="outline" className="not-prose">
              <Link to="/contact">
                Demo-Termin anfragen <ArrowRight />
              </Link>
            </Button>
          </Chapter>
        </article>
      </Container>

      <Section className="bg-surface">
        <SectionHeading
          eyebrow="Was HORIZON zeigt"
          title="Ein Produkt als Beleg für die Arbeitsweise."
          lede="Wer HORIZON versteht, versteht, wie VZG Kundenprojekte angeht: Datenmodell zuerst, klare Übergabepunkte, KI dort, wo sie Entscheidungen verbessert."
        />
      </Section>

      <CtaBand />
    </>
  );
}

function Chapter({ id, n, title, children }: { id: string; n: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <Kicker n={n} label="Kapitel" />
      <h2 className="display mt-4 text-3xl md:text-4xl">{title}</h2>
      <div className="mt-6 max-w-2xl space-y-5 leading-relaxed text-muted-foreground [&_em]:text-foreground [&_em]:not-italic">
        {children}
      </div>
    </section>
  );
}

function StatusList({ items }: { items: { title: string; text: string; status: Status }[] }) {
  return (
    <ul className="not-prose grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
      {items.map((c) => (
        <li key={c.title} className="flex flex-col gap-3 bg-background p-5">
          <StatusBadge status={c.status} />
          <p className="font-medium text-foreground">{c.title}</p>
          <p className="text-sm text-muted-foreground">{c.text}</p>
        </li>
      ))}
    </ul>
  );
}

function ArchitectureDiagram() {
  const layers = [
    { label: "Öffentliche Oberfläche", sub: "Marketing · Einstieg", tone: "border-border" },
    { label: "Authentifizierte Anwendung", sub: "Rollen · Vorgänge · Workflows", tone: "border-border" },
    { label: "Serverseitige Funktionen", sub: "Geschäftslogik · KI-Einsatzpunkte · Validierung", tone: "border-accent" },
    { label: "Daten & Automatisierung", sub: "Datenbank · n8n · Integrationen", tone: "border-border" },
  ];
  return (
    <Panel className="not-prose">
      <ol className="space-y-2">
        {layers.map((l, i) => (
          <li key={l.label} className={`flex items-center justify-between gap-4 rounded-sm border bg-background px-4 py-3 ${l.tone}`}>
            <div>
              <p className="text-sm font-medium text-foreground">{l.label}</p>
              <p className="font-mono text-[0.65rem] tracking-widest text-muted-foreground uppercase">{l.sub}</p>
            </div>
            <span className="font-mono text-xs text-muted-foreground">L{i + 1}</span>
          </li>
        ))}
      </ol>
    </Panel>
  );
}
