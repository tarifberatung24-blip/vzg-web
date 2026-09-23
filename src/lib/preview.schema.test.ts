import { describe, expect, it } from "vitest";
import {
  CANONICAL_LIMITATIONS,
  IDEA_MAX_LENGTH,
  IDEA_MIN_LENGTH,
  guestPreviewInputSchema,
  previewAnalysisSchema,
} from "./preview.schema";

/** A valid analysis used as the baseline; individual tests mutate one field. */
function validAnalysis() {
  return {
    ideaSummary: "Ein Marktplatz für regionale Handwerksleistungen.",
    compliance: {
      status: "NO_OBVIOUS_RED_FLAG" as const,
      explanation: "Keine offensichtlichen regulatorischen Warnsignale erkennbar.",
    },
    businessModel: {
      type: "marketplace" as const,
      explanation: "Vermittlung zwischen Nachfrage und Anbietern.",
    },
    monetizationHypothesis: ["Provision pro vermittelter Leistung."],
    technicalFeasibility: {
      level: "MODERATE" as const,
      explanation: "Mit Standardbausteinen umsetzbar.",
    },
    keyRisks: [{ category: "market_demand" as const, description: "Nachfrage unbelegt." }],
    validationSteps: ["Zehn Interviews führen."],
    limitations: ["Keine Recherche durchgeführt."],
  };
}

describe("guestPreviewInputSchema", () => {
  const valid = { idea: "a".repeat(IDEA_MIN_LENGTH), market: "deutschland" as const };

  it("accepts a minimal valid submission", () => {
    expect(guestPreviewInputSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an idea shorter than the minimum", () => {
    const result = guestPreviewInputSchema.safeParse({ ...valid, idea: "zu kurz" });
    expect(result.success).toBe(false);
  });

  it("rejects an idea longer than the maximum", () => {
    const result = guestPreviewInputSchema.safeParse({
      ...valid,
      idea: "a".repeat(IDEA_MAX_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown market", () => {
    expect(guestPreviewInputSchema.safeParse({ ...valid, market: "atlantis" }).success).toBe(false);
  });

  it("rejects unknown fields rather than ignoring them", () => {
    // A smuggled field such as a client-supplied credit count must not pass.
    const result = guestPreviewInputSchema.safeParse({
      ...valid,
      credits: 9999,
      isAdmin: true,
    });
    expect(result.success).toBe(false);
  });

  it("allows an absent or empty audience but rejects one over the limit", () => {
    expect(guestPreviewInputSchema.safeParse({ ...valid, audience: "" }).success).toBe(true);
    expect(guestPreviewInputSchema.safeParse({ ...valid, audience: undefined }).success).toBe(true);
    expect(guestPreviewInputSchema.safeParse({ ...valid, audience: "x".repeat(201) }).success).toBe(
      false,
    );
  });

  it("trims surrounding whitespace before applying the length rules", () => {
    const padded = `   ${"a".repeat(IDEA_MIN_LENGTH)}   `;
    const result = guestPreviewInputSchema.safeParse({ ...valid, idea: padded });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.idea).toHaveLength(IDEA_MIN_LENGTH);
  });

  it("rejects a non-string idea", () => {
    expect(guestPreviewInputSchema.safeParse({ ...valid, idea: 42 }).success).toBe(false);
  });
});

describe("previewAnalysisSchema", () => {
  it("accepts a well-formed analysis", () => {
    expect(previewAnalysisSchema.safeParse(validAnalysis()).success).toBe(true);
  });

  it("rejects an out-of-vocabulary compliance status", () => {
    const analysis = validAnalysis();
    const result = previewAnalysisSchema.safeParse({
      ...analysis,
      compliance: { ...analysis.compliance, status: "ABSOLUTELY_FINE" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects an out-of-vocabulary business model type", () => {
    const analysis = validAnalysis();
    const result = previewAnalysisSchema.safeParse({
      ...analysis,
      businessModel: { ...analysis.businessModel, type: "crypto_yield" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects an out-of-vocabulary risk category", () => {
    const analysis = validAnalysis();
    const result = previewAnalysisSchema.safeParse({
      ...analysis,
      keyRisks: [{ category: "vibes", description: "x" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects extra top-level keys a model might add", () => {
    const result = previewAnalysisSchema.safeParse({
      ...validAnalysis(),
      internalScore: 0.97,
      systemPrompt: "leak",
    });
    expect(result.success).toBe(false);
  });

  it("rejects extra nested keys", () => {
    const analysis = validAnalysis();
    const result = previewAnalysisSchema.safeParse({
      ...analysis,
      compliance: { ...analysis.compliance, internalWeighting: 3 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty risk list", () => {
    expect(previewAnalysisSchema.safeParse({ ...validAnalysis(), keyRisks: [] }).success).toBe(
      false,
    );
  });

  it("rejects an oversize risk list", () => {
    const analysis = validAnalysis();
    const result = previewAnalysisSchema.safeParse({
      ...analysis,
      keyRisks: Array.from({ length: 5 }, () => ({
        category: "market_demand",
        description: "x",
      })),
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty idea summary", () => {
    expect(previewAnalysisSchema.safeParse({ ...validAnalysis(), ideaSummary: "" }).success).toBe(
      false,
    );
  });

  it("rejects a missing required field", () => {
    const { monetizationHypothesis: _omitted, ...incomplete } = validAnalysis();
    expect(previewAnalysisSchema.safeParse(incomplete).success).toBe(false);
  });
});

describe("CANONICAL_LIMITATIONS", () => {
  it("states that no research was performed and no outcome is promised", () => {
    const text = CANONICAL_LIMITATIONS.join(" ").toLowerCase();
    expect(text).toContain("keine externe recherche");
    expect(text).toContain("nicht garantiert");
    expect(text).toContain("keine rechtsberatung");
  });
});
