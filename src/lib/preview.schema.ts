import { z } from "zod";

/**
 * Shared, client-safe contract for the VZG Project Intelligence Guest Preview.
 *
 * Nothing in this module may reference prompts, provider configuration, API
 * keys, or internal VZG tables. It is imported by both the route component and
 * the server function, so it ships to the browser bundle.
 */

/* ------------------------------------------------------------------ *
 * Closed vocabularies
 * ------------------------------------------------------------------ */

export const MARKETS = {
  deutschland: "Deutschland",
  eu: "EU",
  oesterreich: "Österreich",
  schweiz: "Schweiz",
  international: "International",
  other: "Anderer Markt",
} as const;
export type MarketId = keyof typeof MARKETS;
export const MARKET_IDS = Object.keys(MARKETS) as [MarketId, ...MarketId[]];

export const COMPLIANCE_STATUSES = [
  "NO_OBVIOUS_RED_FLAG",
  "POTENTIAL_REGULATORY_RISK",
  "REVIEW_REQUIRED",
  "BLOCKED",
] as const;
export type ComplianceStatus = (typeof COMPLIANCE_STATUSES)[number];

export const BUSINESS_MODEL_TYPES = [
  "saas",
  "subscription",
  "transaction_fee",
  "commission",
  "one_time_sale",
  "service",
  "marketplace",
  "advertising",
  "licensing",
  "other",
] as const;
export type BusinessModelType = (typeof BUSINESS_MODEL_TYPES)[number];

export const FEASIBILITY_LEVELS = [
  "STRAIGHTFORWARD",
  "MODERATE",
  "COMPLEX",
  "HIGH_UNCERTAINTY",
] as const;
export type FeasibilityLevel = (typeof FEASIBILITY_LEVELS)[number];

export const RISK_CATEGORIES = [
  "market_demand",
  "customer_acquisition",
  "regulation",
  "technical_dependency",
  "ai_api_cost",
  "competition",
  "operations",
  "pricing",
  "data_privacy",
  "other",
] as const;
export type RiskCategory = (typeof RISK_CATEGORIES)[number];

/* ------------------------------------------------------------------ *
 * Input
 * ------------------------------------------------------------------ */

export const IDEA_MIN_LENGTH = 40;
export const IDEA_MAX_LENGTH = 2000;
export const AUDIENCE_MAX_LENGTH = 200;

export const guestPreviewInputSchema = z
  .object({
    idea: z
      .string()
      .trim()
      .min(
        IDEA_MIN_LENGTH,
        `Bitte beschreiben Sie Ihre Idee in mindestens ${IDEA_MIN_LENGTH} Zeichen.`,
      )
      .max(
        IDEA_MAX_LENGTH,
        `Bitte beschreiben Sie Ihre Idee in höchstens ${IDEA_MAX_LENGTH} Zeichen.`,
      ),
    market: z.enum(MARKET_IDS, { message: "Bitte wählen Sie einen Markt." }),
    audience: z.string().trim().max(AUDIENCE_MAX_LENGTH).optional().or(z.literal("")),
  })
  .strict();

export type GuestPreviewInput = z.infer<typeof guestPreviewInputSchema>;

/* ------------------------------------------------------------------ *
 * Provider output — strict, no extra keys tolerated
 * ------------------------------------------------------------------ */

const shortText = (max: number) => z.string().trim().min(1).max(max);

export const previewAnalysisSchema = z
  .object({
    ideaSummary: shortText(1200),
    compliance: z
      .object({
        status: z.enum(COMPLIANCE_STATUSES),
        explanation: shortText(1200),
      })
      .strict(),
    businessModel: z
      .object({
        type: z.enum(BUSINESS_MODEL_TYPES),
        explanation: shortText(1200),
      })
      .strict(),
    monetizationHypothesis: z.array(shortText(400)).min(1).max(4),
    technicalFeasibility: z
      .object({
        level: z.enum(FEASIBILITY_LEVELS),
        explanation: shortText(1200),
      })
      .strict(),
    keyRisks: z
      .array(z.object({ category: z.enum(RISK_CATEGORIES), description: shortText(400) }).strict())
      .min(1)
      .max(4),
    validationSteps: z.array(shortText(400)).min(1).max(3),
    limitations: z.array(shortText(300)).min(1).max(6),
  })
  .strict();

export type PreviewAnalysis = z.infer<typeof previewAnalysisSchema>;

/* ------------------------------------------------------------------ *
 * Server-decided values
 * ------------------------------------------------------------------ */

export const PREVIEW_ERROR_CODES = [
  "INVALID_INPUT",
  "RATE_LIMITED",
  "NOT_CONFIGURED",
  "PROVIDER_UNAVAILABLE",
  "PROVIDER_TIMEOUT",
  "INVALID_MODEL_OUTPUT",
  "SERVER_ERROR",
] as const;

export type PreviewErrorCode = (typeof PREVIEW_ERROR_CODES)[number];

/** How the abuse limit is currently enforced. */
export const LIMIT_MODES = ["durable", "process_local"] as const;
export type LimitMode = (typeof LIMIT_MODES)[number];

/* ------------------------------------------------------------------ *
 * Wire result
 * ------------------------------------------------------------------ */

/** User-safe German message per failure mode. Never contains internal detail. */
export const PREVIEW_ERROR_MESSAGES: Record<PreviewErrorCode, string> = {
  INVALID_INPUT: "Bitte prüfen Sie Ihre Angaben und versuchen Sie es erneut.",
  RATE_LIMITED:
    "Sie haben das kostenlose Vorprüfungs-Kontingent für diese Sitzung aufgebraucht. Bitte versuchen Sie es später erneut.",
  NOT_CONFIGURED:
    "Die Vorprüfung ist derzeit nicht verfügbar. Bitte versuchen Sie es später erneut.",
  PROVIDER_UNAVAILABLE:
    "Die Vorprüfung ist derzeit nicht verfügbar. Bitte versuchen Sie es später erneut.",
  PROVIDER_TIMEOUT: "Die Vorprüfung hat zu lange gedauert. Bitte versuchen Sie es erneut.",
  INVALID_MODEL_OUTPUT:
    "Die Vorprüfung konnte nicht ausgewertet werden. Bitte versuchen Sie es erneut.",
  SERVER_ERROR: "Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.",
};

/**
 * Runtime schemas for the wire response.
 *
 * These exist because the response crosses the server/client boundary: a static
 * type disappears at runtime, so nothing would catch a handler accidentally
 * returning an internal field. Parsing on the client turns that class of mistake
 * into a visible failure instead of a silent leak.
 */
export const guestPreviewSuccessSchema = z
  .object({
    ok: z.literal(true),
    previewId: z.string().min(1).max(128),
    createdAt: z.string().min(1).max(64),
    market: z.enum(MARKET_IDS),
    /** True when compliance screening returned BLOCKED — no optimisation advice is shown. */
    blocked: z.boolean(),
    analysis: previewAnalysisSchema,
    /** Canonical limitations, always appended server-side and never model-controlled. */
    limitations: z.array(z.string().min(1).max(400)).min(1).max(10),
    /** Remaining previews in the current 24h window, as decided by the server. */
    remaining: z.number().int().min(0).max(100),
    /** How the abuse limit is currently enforced; surfaced for transparency in tests. */
    limitMode: z.enum(LIMIT_MODES),
  })
  .strict();

export const guestPreviewFailureSchema = z
  .object({
    ok: z.literal(false),
    code: z.enum(PREVIEW_ERROR_CODES),
    message: z.string().min(1).max(400),
    /** Present for RATE_LIMITED so the UI can be accurate rather than guessing. */
    retryAfterSeconds: z.number().int().min(1).max(604800).optional(),
  })
  .strict();

export const guestPreviewResponseSchema = z.discriminatedUnion("ok", [
  guestPreviewSuccessSchema,
  guestPreviewFailureSchema,
]);

export type GuestPreviewSuccess = z.infer<typeof guestPreviewSuccessSchema>;
export type GuestPreviewFailure = z.infer<typeof guestPreviewFailureSchema>;
export type GuestPreviewResponse = z.infer<typeof guestPreviewResponseSchema>;

/**
 * Server-decided state shown before the first submit so the UI can be accurate
 * instead of guessing. `remaining === null` means the server could not read the
 * counter; the authoritative check still runs on submit.
 */
export const guestPreviewDistributionSchema = z
  .object({
    remaining: z.number().int().min(0).max(100).nullable(),
    limitMode: z.enum(LIMIT_MODES).nullable(),
    /** False when no AI provider is configured — the UI shows a maintenance notice. */
    configured: z.boolean(),
  })
  .strict();

export type GuestPreviewDistribution = z.infer<typeof guestPreviewDistributionSchema>;

/* ------------------------------------------------------------------ *
 * Uptime-vs-cost note is documented in docs/GUEST_PREVIEW.md.
 * ------------------------------------------------------------------ */

export const COMPLIANCE_LABELS: Record<ComplianceStatus, string> = {
  NO_OBVIOUS_RED_FLAG: "Keine offensichtlichen Warnsignale",
  POTENTIAL_REGULATORY_RISK: "Mögliche regulatorische Berührung",
  REVIEW_REQUIRED: "Rechtliche Prüfung erforderlich",
  BLOCKED: "Nicht bewertbar",
};

export const FEASIBILITY_LABELS: Record<FeasibilityLevel, string> = {
  STRAIGHTFORWARD: "Direkt umsetzbar",
  MODERATE: "Moderat",
  COMPLEX: "Komplex",
  HIGH_UNCERTAINTY: "Hohe Unsicherheit",
};

export const BUSINESS_MODEL_LABELS: Record<BusinessModelType, string> = {
  saas: "SaaS",
  subscription: "Abo / Subscription",
  transaction_fee: "Transaktionsgebühr",
  commission: "Provision",
  one_time_sale: "Einmalverkauf",
  service: "Dienstleistung",
  marketplace: "Marktplatz",
  advertising: "Werbung",
  licensing: "Lizenzierung",
  other: "Andere Struktur",
};

export const RISK_LABELS: Record<RiskCategory, string> = {
  market_demand: "Marktnachfrage",
  customer_acquisition: "Kundengewinnung",
  regulation: "Regulierung",
  technical_dependency: "Technische Abhängigkeit",
  ai_api_cost: "KI-/API-Kosten",
  competition: "Wettbewerb",
  operations: "Betrieb",
  pricing: "Preisgestaltung",
  data_privacy: "Daten & Datenschutz",
  other: "Sonstiges Risiko",
};

export const COMPLIANCE_TONE: Record<ComplianceStatus, "safe" | "caution" | "review" | "blocked"> =
  {
    NO_OBVIOUS_RED_FLAG: "safe",
    POTENTIAL_REGULATORY_RISK: "caution",
    REVIEW_REQUIRED: "review",
    BLOCKED: "blocked",
  };

/** Canonical limitations text. Server-controlled so a model cannot soften it. */
export const CANONICAL_LIMITATIONS: string[] = [
  "Dies ist eine unverbindliche Vorprüfung, nicht die vollständige Project-Intelligence-Analyse.",
  "Es wurde keine externe Recherche durchgeführt: keine Quellen, keine Wettbewerbsanalyse, keine Marktzahlen.",
  "Umsätze, Marktgrößen und Erfolgsaussichten werden nicht garantiert und nicht prognostiziert.",
  "Die Compliance-Prüfung ist eine Vorprüfung und keine Rechtsberatung.",
  "Eine belastbare Bewertung mit Belegen erfordert die vollständige Analyse.",
];

export function formatMarket(id: MarketId): string {
  return MARKETS[id];
}
