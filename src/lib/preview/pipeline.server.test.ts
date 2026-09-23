import { describe, expect, it, vi } from "vitest";
import {
  CANONICAL_LIMITATIONS,
  PREVIEW_ERROR_MESSAGES,
  guestPreviewResponseSchema,
  type GuestPreviewInput,
} from "../preview.schema";
import { runGuestPreviewPipeline, type PreviewPipelineDeps } from "./pipeline.server";
import { PreviewProviderError } from "./provider.server";
import type { AnalyseOutcome } from "./analyze.server";

const input: GuestPreviewInput = {
  idea: "Wir bauen einen Marktplatz für regionale Handwerksleistungen mit Abo-Modell für Betriebe.",
  market: "deutschland",
  audience: "Handwerksbetriebe",
};

const sessionHash = "b".repeat(64);

function analysis(overrides: Record<string, unknown> = {}) {
  return {
    ideaSummary: "Marktplatz für regionale Handwerksleistungen.",
    compliance: { status: "NO_OBVIOUS_RED_FLAG" as const, explanation: "Keine Warnsignale." },
    businessModel: { type: "marketplace" as const, explanation: "Vermittlung." },
    monetizationHypothesis: ["Provision."],
    technicalFeasibility: { level: "MODERATE" as const, explanation: "Umsetzbar." },
    keyRisks: [{ category: "market_demand" as const, description: "Nachfrage unbelegt." }],
    validationSteps: ["Zehn Interviews."],
    limitations: [] as string[],
    ...overrides,
  };
}

const okAnalysis = (overrides: Record<string, unknown> = {}): AnalyseOutcome => ({
  kind: "ok",
  analysis: analysis(overrides) as never,
  providerName: "mock",
  injectionSuspected: false,
});

/** Records how each collaborator was invoked, and in what order. */
function deps(overrides: Partial<PreviewPipelineDeps> = {}) {
  const calls: string[] = [];
  const base: PreviewPipelineDeps = {
    consumeQuota: async () => {
      calls.push("consumeQuota");
      return { allowed: true, remaining: 2, mode: "process_local" };
    },
    analyse: async () => {
      calls.push("analyse");
      return okAnalysis();
    },
    persist: async () => {
      calls.push("persist");
      return {
        stored: true,
        row: { id: "11111111-1111-4111-8111-111111111111", created_at: "2026-01-01T00:00:00.000Z" },
      } as never;
    },
    resolveTtlHours: () => 24,
    log: { success: () => {}, failure: () => {} },
    newRequestId: () => "req-test",
  };
  const merged = { ...base, ...overrides };
  return { deps: merged, calls };
}

describe("runGuestPreviewPipeline — wire contract", () => {
  it("produces a response that satisfies the shared wire schema on success", async () => {
    const { deps: d } = deps();
    const response = await runGuestPreviewPipeline(input, sessionHash, d);
    const parsed = guestPreviewResponseSchema.safeParse(response);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
  });

  it("produces a response that satisfies the shared wire schema on failure", async () => {
    const { deps: d } = deps({
      consumeQuota: async () => ({
        allowed: false,
        remaining: 0,
        retryAfterSeconds: 60,
        mode: "durable",
      }),
    });
    const response = await runGuestPreviewPipeline(input, sessionHash, d);
    const parsed = guestPreviewResponseSchema.safeParse(response);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
  });

  it("rejects an internal field smuggled into the response", () => {
    // Demonstrates the schema actually guards the boundary rather than rubber-stamping.
    const response = { ok: true, internalScore: 0.9 };
    expect(guestPreviewResponseSchema.safeParse(response).success).toBe(false);
  });
});

describe("runGuestPreviewPipeline — happy path", () => {
  it("returns an ok response with the analysis and canonical limitations", async () => {
    const { deps: d } = deps();
    const response = await runGuestPreviewPipeline(input, sessionHash, d);

    expect(response.ok).toBe(true);
    if (!response.ok) return;
    expect(response.market).toBe("deutschland");
    expect(response.blocked).toBe(false);
    expect(response.remaining).toBe(2);
    expect(response.limitations).toEqual(CANONICAL_LIMITATIONS);
  });

  it("performs quota, then provider, then persist — in that order", async () => {
    const { deps: d, calls } = deps();
    await runGuestPreviewPipeline(input, sessionHash, d);
    expect(calls).toEqual(["consumeQuota", "analyse", "persist"]);
  });

  it("substitutes canonical limitations when the model returned none", async () => {
    const { deps: d } = deps({ analyse: async () => okAnalysis({ limitations: [] }) });
    const response = await runGuestPreviewPipeline(input, sessionHash, d);
    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.analysis.limitations.length).toBeGreaterThan(0);
      expect(CANONICAL_LIMITATIONS).toContain(response.analysis.limitations[0]);
    }
  });

  it("preserves model-supplied limitations when present", async () => {
    const { deps: d } = deps({
      analyse: async () => okAnalysis({ limitations: ["Ideenspezifischer Hinweis."] }),
    });
    const response = await runGuestPreviewPipeline(input, sessionHash, d);
    expect(response.ok).toBe(true);
    if (response.ok) expect(response.analysis.limitations).toEqual(["Ideenspezifischer Hinweis."]);
  });

  it("marks a BLOCKED compliance result and still returns limitations", async () => {
    const { deps: d } = deps({
      analyse: async () =>
        okAnalysis({
          compliance: { status: "BLOCKED", explanation: "Offensichtlich unzulässiges Vorhaben." },
        }),
    });
    const response = await runGuestPreviewPipeline(input, sessionHash, d);
    expect(response.ok).toBe(true);
    if (!response.ok) return;
    expect(response.blocked).toBe(true);
    expect(response.limitations).toEqual(CANONICAL_LIMITATIONS);
  });

  it("persists the compliance status alongside the result", async () => {
    const persist = vi.fn().mockResolvedValue({
      stored: true,
      row: { id: "id", created_at: "2026-01-01T00:00:00.000Z" },
    });
    const { deps: d } = deps({ persist: persist as never });
    await runGuestPreviewPipeline(input, sessionHash, d);

    expect(persist).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionHash,
        market: "deutschland",
        complianceStatus: "NO_OBVIOUS_RED_FLAG",
        ttlHours: 24,
      }),
    );
  });

  it("falls back to a transient id when persistence is unavailable", async () => {
    const { deps: d } = deps({
      persist: async () => ({ stored: false, reason: "not_configured" }),
    });
    const response = await runGuestPreviewPipeline(input, sessionHash, d);
    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.previewId).toMatch(/^[0-9a-f-]{36}$|^[A-Za-z0-9_-]+$/);
      // A stored row would carry this exact timestamp; a transient one is "now".
      expect(response.createdAt).not.toBe("2026-01-01T00:00:00.000Z");
    }
  });

  it("returns the stored identifier when persistence succeeds", async () => {
    const { deps: d } = deps();
    const response = await runGuestPreviewPipeline(input, sessionHash, d);
    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.previewId).toBe("11111111-1111-4111-8111-111111111111");
      expect(response.createdAt).toBe("2026-01-01T00:00:00.000Z");
    }
  });

  it("forwards the injection flag to the logger, not the response", async () => {
    const success = vi.fn();
    const { deps: d } = deps({
      analyse: async () => ({ ...okAnalysis(), injectionSuspected: true }),
      log: { success, failure: () => {} },
    });
    const response = await runGuestPreviewPipeline(input, sessionHash, d);

    expect(success).toHaveBeenCalledWith(expect.objectContaining({ injectionSuspected: true }));
    expect(JSON.stringify(response)).not.toContain("injection");
  });
});

describe("runGuestPreviewPipeline — quota", () => {
  it("does not call the provider when quota is denied", async () => {
    const analyse = vi.fn();
    const { deps: d } = deps({
      consumeQuota: async () => ({
        allowed: false,
        remaining: 0,
        retryAfterSeconds: 100,
        mode: "process_local",
      }),
      analyse: analyse as never,
    });

    const response = await runGuestPreviewPipeline(input, sessionHash, d);
    expect(analyse).not.toHaveBeenCalled();
    expect(response).toMatchObject({ ok: false, code: "RATE_LIMITED", retryAfterSeconds: 100 });
  });

  it("does not persist when quota is denied", async () => {
    const persist = vi.fn();
    const { deps: d } = deps({
      consumeQuota: async () => ({ allowed: false, remaining: 0, mode: "process_local" }),
      persist: persist as never,
    });
    await runGuestPreviewPipeline(input, sessionHash, d);
    expect(persist).not.toHaveBeenCalled();
  });

  it("returns the rate-limit message, never a provider message", async () => {
    const { deps: d } = deps({
      consumeQuota: async () => ({ allowed: false, remaining: 0, mode: "process_local" }),
    });
    const response = await runGuestPreviewPipeline(input, sessionHash, d);
    expect(response).toMatchObject({ message: PREVIEW_ERROR_MESSAGES.RATE_LIMITED });
  });

  it("reports the durable mode when the database tier answered", async () => {
    const { deps: d } = deps({
      consumeQuota: async () => ({ allowed: true, remaining: 2, mode: "durable" }),
    });
    const response = await runGuestPreviewPipeline(input, sessionHash, d);
    if (response.ok) expect(response.limitMode).toBe("durable");
  });
});

describe("runGuestPreviewPipeline — provider failures", () => {
  it("returns NOT_CONFIGURED without persisting when no provider exists", async () => {
    const persist = vi.fn();
    const { deps: d } = deps({
      analyse: async () => ({ kind: "not_configured" }),
      persist: persist as never,
    });

    const response = await runGuestPreviewPipeline(input, sessionHash, d);
    expect(response).toMatchObject({ ok: false, code: "NOT_CONFIGURED" });
    expect(persist).not.toHaveBeenCalled();
  });

  it.each([["PROVIDER_UNAVAILABLE"], ["PROVIDER_TIMEOUT"], ["INVALID_MODEL_OUTPUT"]] as const)(
    "maps a %s provider error to a safe client message",
    async (code) => {
      const persist = vi.fn();
      const { deps: d } = deps({
        analyse: async () => ({ kind: "provider_error", code, providerName: "anthropic" }),
        persist: persist as never,
      });

      const response = await runGuestPreviewPipeline(input, sessionHash, d);
      expect(response).toMatchObject({ ok: false, code, message: PREVIEW_ERROR_MESSAGES[code] });
      // No paid artifact should be recorded for a failed run.
      expect(persist).not.toHaveBeenCalled();
    },
  );

  it("does not leak the provider's internal error text to the client", async () => {
    const { deps: d } = deps({
      analyse: async () => {
        throw new PreviewProviderError(
          "PROVIDER_UNAVAILABLE",
          "anthropic 500: internal trace id abc",
        );
      },
    });
    // A thrown (rather than returned) provider error must still be contained.
    const response = await runGuestPreviewPipeline(input, sessionHash, d);
    expect(response.ok).toBe(false);
    expect(JSON.stringify(response)).not.toContain("internal trace id");
    expect(JSON.stringify(response)).not.toContain("anthropic 500");
  });

  it("records schema-validation failures distinctly", async () => {
    const failure = vi.fn();
    const { deps: d } = deps({
      analyse: async () => ({ kind: "provider_error", code: "INVALID_MODEL_OUTPUT" }),
      log: { success: () => {}, failure },
    });

    await runGuestPreviewPipeline(input, sessionHash, d);
    expect(failure).toHaveBeenCalledWith(
      expect.objectContaining({ schemaValidationFailed: true, errorCode: "INVALID_MODEL_OUTPUT" }),
    );
  });
});

describe("runGuestPreviewPipeline — unexpected failures", () => {
  it("returns an opaque SERVER_ERROR when persistence throws", async () => {
    const { deps: d } = deps({
      persist: async () => {
        throw new Error('relation "guest_previews" does not exist at db-prod-01');
      },
    });

    const response = await runGuestPreviewPipeline(input, sessionHash, d);
    expect(response).toMatchObject({
      ok: false,
      code: "SERVER_ERROR",
      message: PREVIEW_ERROR_MESSAGES.SERVER_ERROR,
    });
    // The database name and SQL detail must not reach the client.
    expect(JSON.stringify(response)).not.toContain("db-prod-01");
    expect(JSON.stringify(response)).not.toContain("guest_previews");
  });

  it("classifies a validation failure as INVALID_INPUT", async () => {
    const { deps: d } = deps({
      analyse: async () => {
        const error = new Error("invalid type");
        error.name = "ZodError";
        throw error;
      },
    });
    const response = await runGuestPreviewPipeline(input, sessionHash, d);
    expect(response).toMatchObject({ ok: false, code: "INVALID_INPUT" });
  });

  it("logs every failure with a stable error code", async () => {
    const failure = vi.fn();
    const { deps: d } = deps({
      analyse: async () => ({ kind: "provider_error", code: "PROVIDER_TIMEOUT" }),
      log: { success: () => {}, failure },
    });

    await runGuestPreviewPipeline(input, sessionHash, d);
    expect(failure).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "failure", errorCode: "PROVIDER_TIMEOUT" }),
    );
  });

  it("logs the success path with provider and quota mode", async () => {
    const success = vi.fn();
    const { deps: d } = deps({ log: { success, failure: () => {} } });
    await runGuestPreviewPipeline(input, sessionHash, d);
    expect(success).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "success",
        provider: "mock",
        rateLimitMode: "process_local",
      }),
    );
  });

  it("never logs the submitted idea text or the session secret", async () => {
    const records: Record<string, unknown>[] = [];
    const { deps: d } = deps({
      log: {
        success: (record) => records.push(record as Record<string, unknown>),
        failure: (record) => records.push(record as Record<string, unknown>),
      },
    });
    await runGuestPreviewPipeline(input, sessionHash, d);

    const serialized = JSON.stringify(records);
    expect(serialized).not.toContain(input.idea);
    expect(serialized).not.toContain(input.audience);
    expect(serialized).not.toContain(sessionHash);
    // The length is recorded instead, which is enough to spot abuse.
    expect(serialized).toContain(String(input.idea.length));
  });

  it("returns a usable message for every failure code the client can receive", async () => {
    const codes = ["PROVIDER_UNAVAILABLE", "PROVIDER_TIMEOUT", "INVALID_MODEL_OUTPUT"] as const;
    for (const code of codes) {
      const { deps: d } = deps({
        analyse: async () => ({ kind: "provider_error", code }),
      });
      const response = await runGuestPreviewPipeline(input, sessionHash, d);
      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.message).toBe(PREVIEW_ERROR_MESSAGES[code]);
      }
    }
  });
});
