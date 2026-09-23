import type { PreviewAnalysis } from "../preview.schema";
import type { PreviewAnalysisProvider, ProviderRequest } from "./provider.server";

/**
 * Deterministic development/test provider.
 *
 * Activation requires BOTH `NODE_ENV !== "production"` AND
 * `VZG_PREVIEW_ALLOW_MOCK === "1"` (see `resolvePreviewProvider`), so it cannot
 * be reached in production by a single mistake.
 *
 * It never calls the network, never invents sources, and returns output that
 * satisfies `previewAnalysisSchema` exactly.
 */
export function createMockProvider(): PreviewAnalysisProvider {
  return {
    name: "mock",
    analyze(request: ProviderRequest): Promise<PreviewAnalysis> {
      const analysis: PreviewAnalysis = {
        ideaSummary: `Das Konzept beschreibt ein Vorhaben im Markt ${request.marketLabel}, das als digitales Produkt oder Dienstleistung aufgebaut werden soll. Die Angaben der Person bilden die einzige Grundlage dieser Vorprüfung.`,
        compliance: {
          status: "NO_OBVIOUS_RED_FLAG",
          explanation:
            "Auf Grundlage Ihrer Angaben wurden in dieser Vorprüfung keine offensichtlichen regulatorischen Warnsignale erkannt. Diese Einschätzung ist unverbindlich und ersetzt keine Rechtsberatung.",
        },
        businessModel: {
          type: "saas",
          explanation:
            "Die Beschreibung deutet auf eine wiederkehrend genutzte Softwareleistung hin, die als Abonnement angeboten werden kann.",
        },
        monetizationHypothesis: [
          "Monatliches Abonnement pro nutzendem Unternehmen.",
          "Staffelung nach Nutzungsumfang oder Anzahl der Arbeitsplätze.",
          "Optionale Einrichtungs- und Integrationsleistung als Einmalposten.",
        ],
        technicalFeasibility: {
          level: "MODERATE",
          explanation:
            "Die Umsetzung wirkt mit heutigen Standardbausteinen realistisch, setzt aber eine belastbare Daten- und Prozessgrundlage voraus.",
        },
        keyRisks: [
          {
            category: "market_demand",
            description:
              "Ob der beschriebene Bedarf dauerhaft zahlungsbereit ist, lässt sich ohne Marktbelege nicht beurteilen.",
          },
          {
            category: "customer_acquisition",
            description:
              "Die Gewinnung erster Unternehmen kann mehr Aufwand erfordern als die eigentliche Entwicklung.",
          },
          {
            category: "operations",
            description:
              "Der laufende Betrieb verursacht wiederkehrende Kosten und bindet Betreuungszeit.",
          },
        ],
        validationSteps: [
          "Führen Sie fünf Interviews mit Unternehmen, die das Problem heute manuell lösen.",
          "Bitten Sie zwei davon um eine schriftliche Absichtserklärung mit Preisvorstellung.",
          "Testen Sie die Nachfrage mit einer einfachen Landingpage vor jeder Entwicklung.",
        ],
        limitations: [
          "Unverbindliche Vorprüfung auf Basis Ihrer Angaben.",
          "Keine externe Recherche, keine Quellen und keine Wettbewerbsanalyse.",
          "Keine Umsatzprognose und keine Erfolgsgarantie.",
        ],
      };

      return Promise.resolve(analysis);
    },
  };
}
