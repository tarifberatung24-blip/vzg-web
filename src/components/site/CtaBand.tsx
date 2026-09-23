import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container, Eyebrow } from "./primitives";

export function CtaBand() {
  return (
    <section className="relative overflow-hidden border-t border-border">
      <div className="bg-grid mask-fade pointer-events-none absolute inset-0" aria-hidden />
      <div className="bg-aurora pointer-events-none absolute inset-0" aria-hidden />
      <Container className="relative grid gap-10 py-24 md:grid-cols-[1.2fr_1fr] md:items-end md:py-32">
        <div>
          <Eyebrow>Nächster Schritt</Eyebrow>
          <h2 className="display mt-5 text-4xl md:text-6xl">
            Ein Projekt.
            <br />
            Ein Ansprechpartner.
          </h2>
          <p className="lede mt-6 max-w-xl">
            Beschreiben Sie Ihr Problem – Sie erhalten eine ehrliche Einschätzung, ob und wie es
            sinnvoll automatisiert oder als System gebaut werden kann.
          </p>
        </div>
        <div className="flex flex-col gap-3 md:items-end">
          <Button asChild size="xl" className="w-full md:w-auto">
            <Link to="/contact">
              Projekt anfragen <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="xl" variant="outline" className="w-full md:w-auto">
            <Link to="/project-intelligence">Kostenlos testen</Link>
          </Button>
        </div>
      </Container>
    </section>
  );
}
