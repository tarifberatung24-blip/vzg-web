import {
  CANONICAL_LIMITATIONS,
  PREVIEW_ERROR_MESSAGES,
  type GuestPreviewInput,
  type GuestPreviewResponse,
  type PreviewErrorCode,
} from "../preview.schema";
import type { AnalyseOutcome } from "./analyze.server";
import { analyseGuestIdea } from "./analyze.server";
import { newRequestId, logPreviewFailure, logPreviewSuccess } from "./logger.server";
import type { PersistOutcome, PersistPreviewArgs } from "./persist.server";
import {
  persistGuestPreview,
  resolveGuestPreviewTtlHours,
  transientPreviewId,
} from "./persist.server";
import type { RateLimitDecision } from "./rate-limit.server";
import { consumeGuestPreviewQuota } from "./rate-limit.server";

/**
 * The Guest Preview request pipeline, with its side effects injected.
 *
 * Every collaborator is a parameter so the whole decision path — quota, provider
 * outcome, persistence result, and the exact response body — can be exercised in
 * a test without a live HTTP request or a cookie store. The server function in
 * `preview.functions.ts` supplies the real dependencies; tests supply the same
 * real modules, or a stub for the one boundary they cannot reach.
 *
 * The order of operations is a security property, not a style choice:
 *   1. consume quota   — before any paid work
 *   2. call provider   — only if quota was granted
 *   3. persist lineage — after a validated result exists
 * A failure at any step returns a safe message and never leaks internals.
 */

export type PreviewPipelineDeps = {
  consumeQuota: (sessionHash: string) => Promise<RateLimitDecision>;
  analyse: (input: GuestPreviewInput) => Promise<AnalyseOutcome>;
  persist: (args: PersistPreviewArgs) => Promise<PersistOutcome>;
  resolveTtlHours: () => number;
  log: {
    success: typeof logPreviewSuccess;
    failure: typeof logPreviewFailure;
  };
  newRequestId: () => string;
};

export function createDefaultDeps(): PreviewPipelineDeps {
  return {
    consumeQuota: (sessionHash) => consumeGuestPreviewQuota(sessionHash),
    analyse: (input) => analyseGuestIdea(input),
    persist: (args) => persistGuestPreview(args),
    resolveTtlHours: resolveGuestPreviewTtlHours,
    log: { success: logPreviewSuccess, failure: logPreviewFailure },
    newRequestId,
  };
}

/** Error codes that are configuration facts rather than faults. */
const EXPECTED_ERROR_CODES: ReadonlySet<PreviewErrorCode> = new Set([
  "RATE_LIMITED",
  "NOT_CONFIGURED",
]);

export async function runGuestPreviewPipeline(
  input: GuestPreviewInput,
  sessionHash: string,
  deps: PreviewPipelineDeps = createDefaultDeps(),
): Promise<GuestPreviewResponse> {
  const requestId = deps.newRequestId();
  const startedAt = Date.now();
  const baseLog = { requestId, stage: "guest_preview" } as const;
  const inputLength = input.idea.length;

  try {
    const decision = await deps.consumeQuota(sessionHash);

    if (!decision.allowed) {
      deps.log.failure({
        ...baseLog,
        outcome: "failure",
        errorCode: "RATE_LIMITED",
        latencyMs: Date.now() - startedAt,
        rateLimitDecision: "denied",
        rateLimitMode: decision.mode,
        inputLength,
      });
      return {
        ok: false,
        code: "RATE_LIMITED",
        message: PREVIEW_ERROR_MESSAGES.RATE_LIMITED,
        ...(decision.retryAfterSeconds !== undefined
          ? { retryAfterSeconds: decision.retryAfterSeconds }
          : {}),
      };
    }

    const outcome = await deps.analyse(input);

    if (outcome.kind === "not_configured") {
      deps.log.failure({
        ...baseLog,
        outcome: "failure",
        errorCode: "NOT_CONFIGURED",
        latencyMs: Date.now() - startedAt,
        rateLimitDecision: "allowed",
        rateLimitMode: decision.mode,
        inputLength,
      });
      return { ok: false, code: "NOT_CONFIGURED", message: PREVIEW_ERROR_MESSAGES.NOT_CONFIGURED };
    }

    if (outcome.kind === "provider_error") {
      deps.log.failure({
        ...baseLog,
        outcome: "failure",
        errorCode: outcome.code,
        latencyMs: Date.now() - startedAt,
        ...(outcome.providerName ? { provider: outcome.providerName } : {}),
        schemaValidationFailed: outcome.code === "INVALID_MODEL_OUTPUT",
        rateLimitDecision: "allowed",
        rateLimitMode: decision.mode,
        inputLength,
      });
      return { ok: false, code: outcome.code, message: PREVIEW_ERROR_MESSAGES[outcome.code] };
    }

    const ttlHours = deps.resolveTtlHours();
    const stored = await deps.persist({
      sessionHash,
      market: input.market,
      idea: input.idea,
      result: outcome.analysis,
      complianceStatus: outcome.analysis.compliance.status,
      ttlHours,
    });

    const blocked = outcome.analysis.compliance.status === "BLOCKED";

    deps.log.success({
      ...baseLog,
      outcome: "success",
      latencyMs: Date.now() - startedAt,
      provider: outcome.providerName,
      rateLimitDecision: "allowed",
      rateLimitMode: decision.mode,
      inputLength,
      injectionSuspected: outcome.injectionSuspected,
    });

    return {
      ok: true,
      previewId: stored.stored ? stored.row.id : transientPreviewId(),
      createdAt: stored.stored ? stored.row.created_at : new Date().toISOString(),
      market: input.market,
      blocked,
      // Canonical limitations are appended server-side so a model cannot soften
      // or omit the disclaimers, and a BLOCKED response keeps them too.
      analysis: {
        ...outcome.analysis,
        limitations: outcome.analysis.limitations.length
          ? outcome.analysis.limitations
          : CANONICAL_LIMITATIONS.slice(0, 3),
      },
      limitations: CANONICAL_LIMITATIONS,
      remaining: decision.remaining,
      limitMode: decision.mode,
    };
  } catch (error) {
    const code: PreviewErrorCode = isValidationError(error) ? "INVALID_INPUT" : "SERVER_ERROR";
    deps.log.failure({
      ...baseLog,
      outcome: "failure",
      errorCode: code,
      latencyMs: Date.now() - startedAt,
      ...(code === "INVALID_INPUT" ? { schemaValidationFailed: true } : {}),
    });
    return { ok: false, code, message: PREVIEW_ERROR_MESSAGES[code] };
  }
}

/**
 * Detects the validation failure without importing Zod's class here, so the
 * pipeline stays decoupled from the validation library.
 */
function isValidationError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: unknown }).name === "ZodError"
  );
}

export { EXPECTED_ERROR_CODES };
