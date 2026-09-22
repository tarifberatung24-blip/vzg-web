import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, LegalValue } from "@/components/site/LegalPage";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/datenschutz")({
  head: () =>
    pageHead({
      title: "Datenschutzerklärung",
      description: "Datenschutzerklärung von VZG CONSULT: Verantwortlicher, Verarbeitungszwecke, Rechtsgrundlagen und Betroffenenrechte.",
      path: "/datenschutz",
    }),
  component: DatenschutzPage,
});

function DatenschutzPage() {
  return (
    <LegalPage
      title="Datenschutz"
      intro="Informationen zur Verarbeitung personenbezogener Daten gemäß Art. 13, 14 DSGVO."
    >
      <section>
        <h2>1. Verantwortlicher</h2>
        <p>
          VZG CONSULT, Vilislav Gitsov
          <br />
          Anschrift: <LegalValue />
          <br />
          E-Mail: <LegalValue />
        </p>
      </section>
      <section>
        <h2>2. Hosting und Server-Logdaten</h2>
        <p>
          Hosting-Anbieter und Serverstandort: <LegalValue />. Beim Aufruf der Website werden technisch
          notwendige Daten (IP-Adresse, Zeitpunkt, aufgerufene Seite, User-Agent) verarbeitet.
          Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO.
        </p>
      </section>
      <section>
        <h2>3. Projektanfrage-Formular</h2>
        <p>
          Bei einer Projektanfrage werden die von Ihnen eingegebenen Daten (Name, geschäftliche E-Mail,
          Unternehmen, Website, Land, optional Telefon, Projektbeschreibung, Zeitrahmen, Budgetrahmen)
          ausschließlich zur Bearbeitung Ihrer Anfrage verarbeitet. Rechtsgrundlage: Art. 6 Abs. 1 lit. b
          DSGVO (vorvertragliche Maßnahmen). Übermittlungs- und Verarbeitungsdienstleister: <LegalValue />.
          Speicherdauer: <LegalValue />.
        </p>
      </section>
      <section>
        <h2>4. VZG Project Intelligence</h2>
        <p>
          Die Nutzung der Analyse-Anwendung erfordert ein verifiziertes Geschäftskonto. Verarbeitete Daten,
          KI-Dienstleister, Zahlungsdienstleister und Speicherfristen: <LegalValue />. Die Analyse erfolgt
          KI-gestützt; Ergebnisse sind Szenarien ohne Erfolgsgarantie.
        </p>
      </section>
      <section>
        <h2>5. Webfonts</h2>
        <p>
          Diese Website lädt Schriftarten von Google Fonts. Dabei wird Ihre IP-Adresse an Google
          übermittelt. Rechtsgrundlage und ggf. Einwilligungslösung: <LegalValue />.
        </p>
      </section>
      <section>
        <h2>6. Cookies und Analyse</h2>
        <p>
          Eingesetzte Cookies, Analyse- oder Marketing-Tools: <LegalValue />.
        </p>
      </section>
      <section>
        <h2>7. Ihre Rechte</h2>
        <p>
          Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung,
          Datenübertragbarkeit und Widerspruch sowie das Recht auf Beschwerde bei einer Aufsichtsbehörde.
          Zuständige Aufsichtsbehörde: <LegalValue />.
        </p>
      </section>
      <section>
        <h2>8. Stand</h2>
        <p>
          Stand dieser Erklärung: <LegalValue />
        </p>
      </section>
    </LegalPage>
  );
}
