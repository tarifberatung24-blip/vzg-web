import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, LegalValue } from "@/components/site/LegalPage";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/agb")({
  head: () =>
    pageHead({
      title: "Allgemeine Geschäftsbedingungen",
      description: "Allgemeine Geschäftsbedingungen von VZG CONSULT für Beratungs-, Entwicklungs- und Analyseleistungen.",
      path: "/agb",
    }),
  component: AgbPage,
});

function AgbPage() {
  return (
    <LegalPage
      title="AGB"
      intro="Allgemeine Geschäftsbedingungen für Leistungen von VZG CONSULT gegenüber Unternehmern (B2B)."
    >
      <section>
        <h2>1. Geltungsbereich</h2>
        <p>
          Diese AGB gelten für alle Verträge zwischen VZG CONSULT (<LegalValue />) und Unternehmern im
          Sinne des § 14 BGB. Verbrauchern werden keine Leistungen angeboten.
        </p>
      </section>
      <section>
        <h2>2. Leistungen</h2>
        <p>
          Beratung, Konzeption und Entwicklung von KI-Systemen, Automatisierungen, Webanwendungen und
          Plattformen. Konkreter Leistungsumfang, Vergütung und Termine ergeben sich aus dem jeweiligen
          individuellen Angebot.
        </p>
      </section>
      <section>
        <h2>3. VZG Project Intelligence</h2>
        <ul>
          <li>Drei vollständige Analysen sind je verifiziertem Geschäftskonto kostenlos.</li>
          <li>Jede weitere vollständige Analyse kostet 49,00 € (Angabe zur Umsatzsteuer: <LegalValue />).</li>
          <li>Die Analyse ist KI-gestützt und beruht auf verfügbarer Evidenz, offengelegten Annahmen und Szenariorechnungen.</li>
          <li>Es besteht keine Garantie für geschäftlichen Erfolg; Umsatzangaben sind Szenarien, keine Zusagen.</li>
          <li>Eine Compliance-Vorprüfung ersetzt keine individuelle Rechtsberatung.</li>
        </ul>
      </section>
      <section>
        <h2>4. Vergütung und Zahlung</h2>
        <p>
          Zahlungsbedingungen, Fälligkeit und Zahlungsdienstleister: <LegalValue />.
        </p>
      </section>
      <section>
        <h2>5. Haftung</h2>
        <p>
          Haftungsregelung: <LegalValue />
        </p>
      </section>
      <section>
        <h2>6. Vertraulichkeit und Rechte</h2>
        <p>
          Regelungen zu Vertraulichkeit, Nutzungsrechten und Quellcode: <LegalValue />
        </p>
      </section>
      <section>
        <h2>7. Schlussbestimmungen</h2>
        <p>
          Anwendbares Recht, Gerichtsstand und Stand der AGB: <LegalValue />
        </p>
      </section>
    </LegalPage>
  );
}
