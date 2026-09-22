import { Link } from "@tanstack/react-router";
import { Container } from "./primitives";
import { Logo } from "./Header";

const cols = [
  {
    title: "Leistungen",
    links: [
      { to: "/services", label: "Alle Leistungen" },
      { to: "/services", hash: "customer-service-automation", label: "Customer Service Automation" },
      { to: "/services", hash: "n8n-automation", label: "n8n Automation" },
      { to: "/services", hash: "business-platforms", label: "Business Platforms" },
    ],
  },
  {
    title: "VZG",
    links: [
      { to: "/horizon", label: "HORIZON by VZG" },
      { to: "/project-intelligence", label: "Project Intelligence" },
      { to: "/projects", label: "Projekte" },
      { to: "/about", label: "Über den Gründer" },
    ],
  },
  {
    title: "Kontakt & Recht",
    links: [
      { to: "/contact", label: "Projekt anfragen" },
      { to: "/impressum", label: "Impressum" },
      { to: "/datenschutz", label: "Datenschutz" },
      { to: "/agb", label: "AGB" },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <Container className="grid gap-12 py-16 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-6 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Individuelle KI-Systeme, Automatisierung und digitale Produkte für Unternehmen in
            Deutschland und Europa.
          </p>
          <p className="mt-6 font-mono text-[0.65rem] tracking-[0.2em] text-foreground/80 uppercase">
            One Vision. One Builder. Full Responsibility.
          </p>
        </div>
        {cols.map((col) => (
          <div key={col.title}>
            <p className="eyebrow">{col.title}</p>
            <ul className="mt-5 space-y-3">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link
                    to={l.to}
                    hash={"hash" in l ? l.hash : undefined}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Container>
      <div className="border-t border-border">
        <Container className="flex flex-col gap-2 py-6 font-mono text-[0.65rem] tracking-widest text-muted-foreground uppercase md:flex-row md:items-center md:justify-between">
          <span>© {new Date().getFullYear()} VZG CONSULT · Vilislav Gitsov</span>
          <span>AI Systems · Automation · Digital Products</span>
        </Container>
      </div>
    </footer>
  );
}
