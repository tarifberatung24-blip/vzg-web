import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Container } from "./primitives";

const nav = [
  { to: "/services", label: "Leistungen" },
  { to: "/horizon", label: "HORIZON" },
  { to: "/project-intelligence", label: "Project Intelligence" },
  { to: "/projects", label: "Projekte" },
  { to: "/about", label: "Über VZG" },
] as const;

export function Logo() {
  return (
    <Link to="/" className="group flex items-center gap-3" aria-label="VZG CONSULT – Startseite">
      <span className="grid size-8 place-items-center rounded-sm border border-border-strong font-mono text-[0.7rem] font-medium tracking-tight">
        VZG
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-sm font-semibold tracking-[0.2em]">VZG CONSULT</span>
        <span className="mt-1 hidden font-mono text-[0.6rem] tracking-[0.16em] text-muted-foreground uppercase sm:block">
          AI Systems · Automation · Digital Products
        </span>
      </span>
    </Link>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between">
        <Logo />

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Hauptnavigation">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-sm px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:block">
          <Button asChild size="default">
            <Link to="/contact">Projekt besprechen</Link>
          </Button>
        </div>

        <button
          type="button"
          className="grid size-10 place-items-center rounded-sm border border-border lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Menü schließen" : "Menü öffnen"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </Container>

      {open && (
        <div id="mobile-nav" className="border-t border-border bg-background lg:hidden">
          <Container className="flex flex-col py-4">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="border-b border-border py-3 text-base text-muted-foreground"
                activeProps={{ className: "text-foreground" }}
              >
                {item.label}
              </Link>
            ))}
            <Button asChild size="lg" className="mt-4">
              <Link to="/contact" onClick={() => setOpen(false)}>
                Projekt besprechen
              </Link>
            </Button>
          </Container>
        </div>
      )}
    </header>
  );
}
