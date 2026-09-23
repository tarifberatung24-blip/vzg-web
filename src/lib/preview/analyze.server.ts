import type { PreviewAnalysis } from "../preview.schema";
import { buildProviderRequest, type ProviderRequest } from "./input.server";
import {
  PROVIDER_TIMEOUT_MS,
  PreviewProviderError,
  resolvePreviewProvider,
  toProviderError,
} from "./provider.server";
import type { GuestPreviewInput } from "../preview.schema";

/**
 * Preview orchestration. Owns exactly one external call and no persistence.
 *
 * There is intentionally no research, no crawling, and no second model pass
 * here: the Guest Preview is a single lightweight call by definition. This is
 * also why no citations can appear — nothing is retrieved.
 */

export type AnalyseOutcome =
  | { kind: "ok"; analysis: PreviewAnalysis; providerName: string; injectionSuspected: boolean }
  | { kind: "not_configured" }
  | {
      kind: "provider_error";
      code: "PROVIDER_UNAVAILABLE" | "PROVIDER_TIMEOUT" | "INVALID_MODEL_OUTPUT";
      providerName?: string;
    };

/** Runs the provider under a hard timeout so a hung vendor cannot pin a worker. */
async function withTimeout<T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try {
    return await operation(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

export async function analyseGuestIdea(input: GuestPreviewInput): Promise<AnalyseOutcome> {
  const request: ProviderRequest = buildProviderRequest(input);

  const resolution = await resolvePreviewProvider();
  if (resolution.kind === "not_configured") {
    return { kind: "not_configured" };
  }

  const { provider } = resolution;
  try {
    const analysis = await withTimeout((signal) => provider.analyze(request, signal));
    return {
      kind: "ok",
      analysis,
      providerName: provider.name,
      injectionSuspected: request.injectionSuspected,
    };
  } catch (error) {
    const providerError = error instanceof PreviewProviderError ? error : toProviderError(error);
    return {
      kind: "provider_error",
      code: providerError.code === "NOT_CONFIGURED" ? "PROVIDER_UNAVAILABLE" : providerError.code,
      providerName: provider.name,
    };
  }
}
