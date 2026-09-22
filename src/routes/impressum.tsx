import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, LegalValue } from "@/components/site/LegalPage";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/impressum")({
  head: () => ({
    ...pageHead({
      title: "Impressum",
      description: "Impressum und Anbieterkennzeichnung von VZG CONSULT.",
      path: "/impressum",
    }),
  }),
  component: ImpressumPage,
});

function ImpressumPage() {
  return (
    <LegalPage title="Impressum" intro="Angaben gemäß § 5 DDG (ehemals § 5 TMG).">
      <section>
        <h2>Anbieter</h2>
        <p>
          VZG CONSULT
          <br />
          Vilislav Gitsov
          <br />
          Rechtsform: <LegalValue />
          <br />
          Straße und Hausnummer: <LegalValue />
          <br />
          PLZ und Ort: <LegalValue />
          <br />
          Land: <LegalValue />
        </p>
      </section>
      <section>
        <h2>Kontakt</h2>
        <p>
          Telefon: <LegalValue />
          <br />
          E-Mail: <LegalValue />
        </p>
      </section>
      <section>
        <h2>Umsatzsteuer</h2>
        <p>
          Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: <LegalValue />
        </p>
      </section>
      <section>
        <h2>Registereintrag</h2>
        <p>
          Registergericht / Registernummer (falls zutreffend): <LegalValue />
        </p>
      </section>
      <section>
        <h2>Verantwortlich für den Inhalt</h2>
        <p>
          Vilislav Gitsov, Anschrift wie oben: <LegalValue />
        </p>
      </section>
      <section>
        <h2>Streitbeilegung</h2>
        <p>
          Hinweis zur Verbraucherstreitbeilegung und EU-Streitschlichtungsplattform: <LegalValue />
        </p>
      </section>
    </LegalPage>
  );
}
