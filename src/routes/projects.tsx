import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container, Kicker, Section, SectionHeading, StatusBadge } from "@/components/site/primitives";
import { CtaBand } from "@/components/site/CtaBand";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/projects")({
  head: () =>
    pageHead({
      title: "Projekte & Portfolio — Eigene Produkte und Systemarchitekturen",
      description:
        "Projekte von VZG CONSULT: HORIZON by VZG, VZG Project Intelligence und die Website als Referenzsystem. Transparent nach Status: vorhanden, in Entwicklung, geplant.",
      path: "/projects",
    }),
  component: ProjectsPage,
});

function ProjectsPage() {
  return (
    <>
      <section className="border-b border-border">
        <Container className="py-20 md:py-28">
          <SectionHeading
            eyebrow="Projekte"
            title="Eigene Produkte als Referenz."
            lede="VZG CONSULT zeigt hier ausschließlich eigene Vorhaben. Kundenprojekte werden nur mit ausdrücklicher Freigabe und ohne erfundene Kennzahlen veröffentlicht."
          />
        </Container>
      </section>

      <Section bordered={false} className="pt-0 md:pt-0">
        <div className="mt-16 space-y-6">
          <ProjectCard
            n="01"
            title="HORIZON by VZG"
            kind="Flagship-Produkt · B2B-Plattform"
            status="building"
            text="Operative Plattform für strukturierte Vorgänge, konfigurierbare Workflows, KI-gestützte Einordnung und Integrationen. Der primäre Nachweis für Produkt-, Automatisierungs- und Plattformentwicklung unter VZG CONSULT."
            tags={["Plattform", "Workflows", "KI-Einordnung", "n8n", "Integrationen"]}
            to="/horizon"
            cta="Case Study lesen"
          />
          <ProjectCard
            n="02"
            title="VZG Project Intelligence"
            kind="Interaktive Anwendung · Geschäftsideen-Analyse"
            status="building"
            text="KI-gestützte Analyse von Geschäftsideen entlang von Markt, Problem, Modell, Machbarkeit, Kosten, Risiken und Szenarien. Der öffentliche Einstieg ist live; die interaktive Anwendung wird separat umgesetzt."
            tags={["KI-Analyse", "Szenarien", "Geschäftskonto", "Angebotsprozess"]}
            to="/project-intelligence"
            cta="Zum Einstieg"
          />
          <ProjectCard
            n="03"
            title="VZG CONSULT Website"
            kind="Öffentliche Oberfläche · Einstiegssystem"
            status="exists"
            text="Diese Website: German-first, serverseitig gerendert, mit vorbereiteter sicherer Anfrage-Übermittlung und getrennten Ebenen für öffentliche Oberfläche, Anwendung und serverseitige Logik."
            tags={["TypeScript", "React", "SSR", "Serverseitige Funktionen"]}
            to="/contact"
            cta="Projekt anfragen"
          />
        </div>
        <p className="mt-10 max-w-2xl text-sm text-muted-foreground">
          Weitere Projekte werden ergänzt, sobald sie einen dokumentierbaren Stand erreicht haben.
        </p>
      </Section>

      <CtaBand />
    </>
  );
}

function ProjectCard(props: {
  n: string;
  title: string;
  kind: string;
  status: "exists" | "building" | "planned";
  text: string;
  tags: string[];
  to: "/horizon" | "/project-intelligence" | "/contact";
  cta: string;
}) {
  return (
    <article className="panel grid gap-8 rounded-lg p-7 md:grid-cols-[1fr_1.6fr] md:p-10">
      <div>
        <Kicker n={props.n} label="Projekt" />
        <h2 className="display mt-4 text-3xl">{props.title}</h2>
        <p className="mt-2 font-mono text-[0.65rem] tracking-widest text-muted-foreground uppercase">{props.kind}</p>
        <div className="mt-5">
          <StatusBadge status={props.status} />
        </div>
      </div>
      <div className="flex flex-col">
        <p className="leading-relaxed text-muted-foreground">{props.text}</p>
        <ul className="mt-6 flex flex-wrap gap-2">
          {props.tags.map((t) => (
            <li key={t} className="rounded-sm border border-border px-2.5 py-1 font-mono text-[0.65rem] tracking-widest uppercase">
              {t}
            </li>
          ))}
        </ul>
        <Button asChild variant="outline" className="mt-8 self-start">
          <Link to={props.to}>
            {props.cta} <ArrowRight />
          </Link>
        </Button>
      </div>
    </article>
  );
}
