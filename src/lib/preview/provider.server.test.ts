import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PreviewProviderError,
  createAnthropicProvider,
  parseProviderOutput,
  resolvePreviewProvider,
  toProviderError,
} from "./provider.server";
import type { ProviderRequest } from "./input.server";

const request: ProviderRequest = {
  idea: "Ein Abo-Dienst für Wartungsprotokolle in Handwerksbetrieben.",
  marketLabel: "Deutschland",
  audience: "Handwerksbetriebe",
  injectionSuspected: false,
};

function validResult() {
  return {
    ideaSummary: "Ein Abo-Dienst für Wartungsprotokolle.",
    compliance: { status: "NO_OBVIOUS_RED_FLAG", explanation: "Keine Warnsignale." },
    businessModel: { type: "subscription", explanation: "Wiederkehrende Gebühr." },
    monetizationHypothesis: ["Monatliche Gebühr pro Betrieb."],
    technicalFeasibility: { level: "MODERATE", explanation: "Standardbausteine genügen." },
    keyRisks: [{ category: "market_demand", description: "Nachfrage unbelegt." }],
    validationSteps: ["Fünf Betriebe befragen."],
    limitations: ["Keine Recherche."],
  };
}

/** Builds an adapter whose transport is a stub, so the real code path runs. */
function adapterReturning(response: Record<string, unknown>, parsed?: unknown) {
  const parse = vi.fn().mockResolvedValue(response);
  const provider = createAnthropicProvider("sk-test-not-a-real-key", "claude-opus-5", {
    createClient: () => ({ messages: { parse } }),
    ...(parsed !== undefined ? { parseOutput: () => parsed as never } : {}),
  });
  return { provider, parse };
}

const envKeys = [
  "VZG_PREVIEW_ANTHROPIC_API_KEY",
  "VZG_PREVIEW_MODEL",
  "VZG_PREVIEW_ALLOW_MOCK",
  "NODE_ENV",
] as const;
let savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  savedEnv = {};
  for (const key of envKeys) savedEnv[key] = process.env[key];
});

afterEach(() => {
  for (const key of envKeys) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

describe("resolvePreviewProvider", () => {
  it("fails closed in production with no API key", async () => {
    delete process.env["VZG_PREVIEW_ANTHROPIC_API_KEY"];
    process.env["NODE_ENV"] = "production";
    process.env["VZG_PREVIEW_ALLOW_MOCK"] = "1";

    const resolution = await resolvePreviewProvider();
    expect(resolution.kind).toBe("not_configured");
  });

  it("fails closed outside production when the mock flag is absent", async () => {
    delete process.env["VZG_PREVIEW_ANTHROPIC_API_KEY"];
    process.env["NODE_ENV"] = "development";
    delete process.env["VZG_PREVIEW_ALLOW_MOCK"];

    const resolution = await resolvePreviewProvider();
    expect(resolution.kind).toBe("not_configured");
  });

  it("returns the mock only when both the dev check and the explicit flag hold", async () => {
    delete process.env["VZG_PREVIEW_ANTHROPIC_API_KEY"];
    process.env["NODE_ENV"] = "development";
    process.env["VZG_PREVIEW_ALLOW_MOCK"] = "1";

    const resolution = await resolvePreviewProvider();
    expect(resolution.kind).toBe("configured");
    if (resolution.kind === "configured") expect(resolution.provider.name).toBe("mock");
  });

  it("prefers the real provider when a key is present", async () => {
    process.env["VZG_PREVIEW_ANTHROPIC_API_KEY"] = "sk-test-only";
    process.env["NODE_ENV"] = "production";

    const resolution = await resolvePreviewProvider();
    expect(resolution.kind).toBe("configured");
    if (resolution.kind === "configured") expect(resolution.provider.name).toBe("anthropic");
  });

  it("never returns the key it read", async () => {
    process.env["VZG_PREVIEW_ANTHROPIC_API_KEY"] = "sk-secret-value-should-not-surface";
    const resolution = await resolvePreviewProvider();
    expect(JSON.stringify(resolution)).not.toContain("sk-secret-value-should-not-surface");
  });
});

describe("parseProviderOutput", () => {
  it("accepts a well-formed result", () => {
    expect(parseProviderOutput(validResult())).toMatchObject({ ideaSummary: expect.any(String) });
  });

  it("throws INVALID_MODEL_OUTPUT for malformed output rather than coercing it", () => {
    try {
      parseProviderOutput({ ideaSummary: "nur ein Feld" });
      throw new Error("expected a validation failure");
    } catch (error) {
      expect(error).toBeInstanceOf(PreviewProviderError);
      expect((error as PreviewProviderError).code).toBe("INVALID_MODEL_OUTPUT");
    }
  });

  it("rejects output that smuggles extra keys", () => {
    expect(() => parseProviderOutput({ ...validResult(), internalScore: 1 })).toThrow(
      PreviewProviderError,
    );
  });

  it("rejects null", () => {
    expect(() => parseProviderOutput(null)).toThrow(PreviewProviderError);
  });
});

describe("createAnthropicProvider", () => {
  it("returns the parsed analysis on success", async () => {
    const { provider } = adapterReturning({
      parsed_output: validResult(),
      stop_reason: "end_turn",
    });
    await expect(provider.analyze(request, new AbortController().signal)).resolves.toMatchObject({
      businessModel: { type: "subscription" },
    });
  });

  it("rejects a truncated response", async () => {
    const { provider } = adapterReturning({
      parsed_output: validResult(),
      stop_reason: "max_tokens",
    });
    await expect(provider.analyze(request, new AbortController().signal)).rejects.toMatchObject({
      code: "INVALID_MODEL_OUTPUT",
    });
  });

  it("rejects a refusal", async () => {
    const { provider } = adapterReturning({ parsed_output: null, stop_reason: "refusal" });
    await expect(provider.analyze(request, new AbortController().signal)).rejects.toMatchObject({
      code: "PROVIDER_UNAVAILABLE",
    });
  });

  it("rejects a response that fails schema validation", async () => {
    const { provider } = adapterReturning({ parsed_output: { unexpected: true } });
    await expect(provider.analyze(request, new AbortController().signal)).rejects.toMatchObject({
      code: "INVALID_MODEL_OUTPUT",
    });
  });

  it("turns a transport abort into PROVIDER_TIMEOUT", async () => {
    const provider = createAnthropicProvider("sk-test-not-a-real-key", "claude-opus-5", {
      createClient: () => ({
        messages: {
          parse: () => {
            const error = new Error("aborted");
            error.name = "AbortError";
            return Promise.reject(error);
          },
        },
      }),
      parseOutput: parseProviderOutput,
    });

    await expect(provider.analyze(request, new AbortController().signal)).rejects.toMatchObject({
      code: "PROVIDER_TIMEOUT",
    });
  });

  it("maps an unknown transport failure to PROVIDER_UNAVAILABLE", async () => {
    const provider = createAnthropicProvider("sk-test-not-a-real-key", "claude-opus-5", {
      createClient: () => ({
        messages: { parse: () => Promise.reject(new Error("socket hang up")) },
      }),
      parseOutput: parseProviderOutput,
    });

    await expect(provider.analyze(request, new AbortController().signal)).rejects.toMatchObject({
      code: "PROVIDER_UNAVAILABLE",
    });
  });

  it("sends the enforced JSON schema, the system prompt, and the delimited idea", async () => {
    const { provider, parse } = adapterReturning({
      parsed_output: validResult(),
      stop_reason: "end_turn",
    });
    await provider.analyze(request, new AbortController().signal);

    // The request body is an untyped SDK payload; describe only what is asserted.
    type RequestBody = {
      model: string;
      system: string;
      messages: { role: string; content: string }[];
      output_config: { format: { type: string; schema: { additionalProperties: boolean } } };
    };
    const body = parse.mock.calls[0]![0] as unknown as RequestBody;
    const userContent = body.messages[0]!.content;

    expect(body.model).toBe("claude-opus-5");
    expect(body.output_config.format.type).toBe("json_schema");
    expect(body.output_config.format.schema.additionalProperties).toBe(false);
    expect(body.system).toContain("SICHERHEIT");
    expect(userContent).toContain("VZG_UNTRUSTED_");
    expect(userContent).toContain(request.idea);
    // The API key must not be reachable from the request body.
    expect(JSON.stringify(body)).not.toContain("sk-test-not-a-real-key");
  });
});

describe("toProviderError", () => {
  it("passes through an existing provider error", () => {
    const original = new PreviewProviderError("PROVIDER_TIMEOUT", "x");
    expect(toProviderError(original)).toBe(original);
  });

  it("maps an AbortError to PROVIDER_TIMEOUT", () => {
    const error = new Error("aborted");
    error.name = "AbortError";
    expect(toProviderError(error).code).toBe("PROVIDER_TIMEOUT");
  });

  it("maps an unknown failure to PROVIDER_UNAVAILABLE", () => {
    expect(toProviderError(new Error("boom")).code).toBe("PROVIDER_UNAVAILABLE");
    expect(toProviderError("not an error").code).toBe("PROVIDER_UNAVAILABLE");
  });
});
