import type { PreviewAnalysis } from "../preview.schema";
import { previewAnalysisSchema } from "../preview.schema";
import type { ProviderRequest } from "./input.server";

export type { ProviderRequest };

/**
 * Provider abstraction for the Guest Preview.
 *
 * Application logic depends only on `PreviewAnalysisProvider`. Vendor coupling
 * lives in the adapter implementations below (and in future adapters), so the
 * feature can be moved between vendors without touching the server function,
 * the route, or the schema.
 *
 * Secrets: adapter configuration is read from `process.env` at call time and is
 * never returned, logged, or serialised. No provider module may be imported by a
 * route file or a `*.functions.ts` module.
 */

export type ProviderFailureCode =
  "NOT_CONFIGURED" | "PROVIDER_UNAVAILABLE" | "PROVIDER_TIMEOUT" | "INVALID_MODEL_OUTPUT";

export class PreviewProviderError extends Error {
  readonly code: ProviderFailureCode;

  constructor(code: ProviderFailureCode, message: string) {
    super(message);
    this.name = "PreviewProviderError";
    this.code = code;
  }
}

export type PreviewAnalysisProvider = {
  /** Stable, non-secret identifier for logs. */
  readonly name: string;
  analyze(request: ProviderRequest, signal: AbortSignal): Promise<PreviewAnalysis>;
};

/** Milliseconds before a provider call is aborted. */
export const PROVIDER_TIMEOUT_MS = 45_000;

/**
 * Validates provider output. Malformed output fails closed: there is no
 * partial-trust path and no "best effort" coercion.
 */
export function parseProviderOutput(raw: unknown): PreviewAnalysis {
  const result = previewAnalysisSchema.safeParse(raw);
  if (!result.success) {
    throw new PreviewProviderError(
      "INVALID_MODEL_OUTPUT",
      "Provider output failed schema validation.",
    );
  }
  return result.data;
}

/** Normalises provider transport failures into `PreviewProviderError`. */
export function toProviderError(error: unknown): PreviewProviderError {
  if (error instanceof PreviewProviderError) return error;
  if (error instanceof Error && error.name === "AbortError") {
    return new PreviewProviderError("PROVIDER_TIMEOUT", "Provider call timed out.");
  }
  if (error instanceof Error && error.name === "TimeoutError") {
    return new PreviewProviderError("PROVIDER_TIMEOUT", "Provider call timed out.");
  }
  return new PreviewProviderError("PROVIDER_UNAVAILABLE", "Provider call failed.");
}

/* ------------------------------------------------------------------ *
 * Anthropic adapter
 * ------------------------------------------------------------------ */

const ANTHROPIC_DEFAULT_MODEL = "claude-opus-5";

type AnthropicLikeResponse = {
  parsed_output?: unknown;
  stop_reason?: string | null;
};

type AnthropicFactory = (options: { apiKey: string; maxRetries: number }) => unknown;

export type AnthropicProviderTestHooks = {
  /**
   * Test seam. Lets a test exercise the adapter's full code path — timeout,
   * refusal, truncation, and schema enforcement — against a client stub instead
   * of the live network. Production never passes this argument.
   */
  createClient?: AnthropicFactory;
  parseOutput?: (raw: unknown) => PreviewAnalysis;
};

export function createAnthropicProvider(
  apiKey: string,
  model: string,
  hooks: AnthropicProviderTestHooks = {},
): PreviewAnalysisProvider {
  return {
    name: "anthropic",
    async analyze(request, signal) {
      // Imported lazily so the SDK stays out of the module graph until a
      // configured provider is actually invoked, and so it can never be
      // pulled into the client bundle.
      const { buildPreviewUserBlock, PREVIEW_SYSTEM_PROMPT, PREVIEW_OUTPUT_JSON_SCHEMA } =
        await import("./prompt.server");
      const { jsonSchemaOutputFormat } = await import("@anthropic-ai/sdk/helpers/json-schema");

      const createClient: AnthropicFactory =
        hooks.createClient ??
        (await import("@anthropic-ai/sdk").then(
          ({ default: Anthropic }) =>
            (options) =>
              new Anthropic(options),
        ));

      const parseOutput = hooks.parseOutput ?? parseProviderOutput;

      const client = createClient({ apiKey, maxRetries: 1 }) as {
        messages: {
          parse: (
            body: Record<string, unknown>,
            options: { signal: AbortSignal },
          ) => Promise<AnthropicLikeResponse>;
        };
      };

      // Transport failures are normalised here so every caller sees the same
      // closed set of codes, whichever entry point invoked the adapter.
      let response: AnthropicLikeResponse;
      try {
        response = (await client.messages.parse(
          {
            model,
            max_tokens: 4000,
            system: PREVIEW_SYSTEM_PROMPT,
            messages: [{ role: "user", content: buildPreviewUserBlock(request) }],
            output_config: { format: jsonSchemaOutputFormat(PREVIEW_OUTPUT_JSON_SCHEMA) },
          },
          { signal },
        )) as AnthropicLikeResponse;
      } catch (error) {
        throw toProviderError(error);
      }

      if (response.stop_reason === "max_tokens") {
        // Truncated output cannot be trusted to be complete.
        throw new PreviewProviderError("INVALID_MODEL_OUTPUT", "Provider response was truncated.");
      }
      if (response.stop_reason === "refusal") {
        throw new PreviewProviderError("PROVIDER_UNAVAILABLE", "Provider declined the request.");
      }
      return parseOutput(response.parsed_output);
    },
  };
}

/* ------------------------------------------------------------------ *
 * Provider resolution — fail closed
 * ------------------------------------------------------------------ */

export type ProviderResolution =
  | { kind: "configured"; provider: PreviewAnalysisProvider }
  | { kind: "not_configured"; reason: string };

/**
 * Resolves the preview provider from server-side configuration.
 *
 * Production behaviour: return `not_configured` so the caller fails closed with a
 * user-safe message. A deterministic mock is available **only** when
 * `NODE_ENV !== "production"` and `VZG_PREVIEW_ALLOW_MOCK === "1"`, which makes
 * accidental production activation require two independent misconfigurations.
 */
export async function resolvePreviewProvider(): Promise<ProviderResolution> {
  const apiKey = process.env["VZG_PREVIEW_ANTHROPIC_API_KEY"];
  const model = process.env["VZG_PREVIEW_MODEL"] ?? ANTHROPIC_DEFAULT_MODEL;

  if (apiKey) {
    return { kind: "configured", provider: createAnthropicProvider(apiKey, model) };
  }

  if (process.env["NODE_ENV"] !== "production" && process.env["VZG_PREVIEW_ALLOW_MOCK"] === "1") {
    const { createMockProvider } = await import("./mock-provider.server");
    return { kind: "configured", provider: createMockProvider() };
  }

  return {
    kind: "not_configured",
    reason: apiKey ? "unspecified" : "VZG_PREVIEW_ANTHROPIC_API_KEY is not set",
  };
}
