import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { Container, Eyebrow, Panel } from "@/components/site/primitives";
import { InquiryForm } from "@/components/site/InquiryForm";
import { pageHead } from "@/lib/seo";

const searchSchema = z.object({
  intent: z.enum(["project-intelligence"]).optional(),
});

export const Route = createFileRoute("/contact")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () =>
    pageHead({
      title: "Projekt anfragen — Individuelle KI- und Automatisierungslösung",
      description:
        "Beschreiben Sie Ihr Vorhaben: KI-Automatisierung, n8n, Customer Service Automation, Online-Shop, individuelle Anwendung oder B2B-Plattform. Persönliche Rückmeldung innerhalb von 2 Werktagen.",
      path: "/contact",
    }),
  component: ContactPage,
});

function ContactPage() {
  const { intent } = Route.useSearch();
  const isPI = intent === "project-intelligence";

  return (
    <>
      <section className="border-b border-border">
        <Container className="py-16 md:py-24">
          <Eyebrow>{isPI ? "VZG Project Intelligence · Frühzugang" : "Projektanfrage"}</Eyebrow>
          <h1 className="display mt-6 max-w-3xl text-4xl md:text-6xl">
            {isPI ? "Geschäftsidee analysieren lassen." : "Beschreiben Sie Ihr Vorhaben."}
          </h1>
          <p className="lede mt-6 max-w-2xl">
            {isPI
              ? "Die interaktive Analyse-Anwendung wird derzeit vorbereitet. Beschreiben Sie Ihre Idee kurz – Sie erhalten Frühzugang und eine persönliche Ersteinschätzung."
              : "Je konkreter das Problem beschrieben ist, desto präziser die erste Einschätzung. Alle Angaben werden vertraulich behandelt und ausschließlich zur Bearbeitung Ihrer Anfrage genutzt."}
          </p>
        </Container>
      </section>

      <Container className="grid gap-10 py-16 lg:grid-cols-[1fr_320px] lg:py-24">
        <InquiryForm defaultProjectType={isPI ? "Other" : undefined} />
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Panel>
            <p className="eyebrow">Was danach passiert</p>
            <ol className="mt-5 space-y-4 text-sm">
              {[
                "Persönliche Prüfung der Anfrage durch Vilislav Gitsov.",
                "Rückmeldung mit erster Einschätzung innerhalb von 2 Werktagen.",
                "Auf Wunsch: Gespräch zur Vertiefung und konkretes Angebot.",
              ].map((t, i) => (
                <li key={t} className="flex gap-3">
                  <span className="font-mono text-xs text-accent">0{i + 1}</span>
                  <span className="text-muted-foreground">{t}</span>
                </li>
              ))}
            </ol>
          </Panel>
          <Panel>
            <p className="eyebrow">Direkter Kontakt</p>
            <p className="mt-4 text-sm text-muted-foreground">
              Kontaktdaten: <span className="font-mono text-xs text-foreground">[LEGAL DATA REQUIRED]</span>
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              LinkedIn ist der bevorzugte Kanal für den Erstkontakt.
            </p>
          </Panel>
        </aside>
      </Container>
    </>
  );
}
