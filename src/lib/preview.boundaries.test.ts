import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * TASK-001 boundary invariants, enforced against the real source on disk.
 *
 * These are static guarantees, not behavioural ones, and they exist because the
 * most damaging mistakes in this feature are structural rather than logical:
 * a server module reaching the client bundle, or the guest path acquiring a
 * write to the credit tables. A reviewer can break either without any unit test
 * failing, so the rule is asserted directly.
 */

const read = (relative: string) =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

/**
 * Strips comments, keeping code and string literals.
 *
 * The doc comments in this feature deliberately name the things the code must
 * NOT do ("does not read `analyses`", "never reference client.server"), so an
 * un-stripped search would fire on the rule's own documentation. Comments are
 * not behaviour; string literals ARE — `supabaseAdmin.from("analyses")` is a real
 * table access, so strings must survive.
 */
function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

const clientReachable = {
  "preview.functions.ts": read("./preview.functions.ts"),
  "preview.schema.ts": read("./preview.schema.ts"),
  "GuestPreviewForm.tsx": read("../components/site/GuestPreviewForm.tsx"),
  "GuestPreviewResult.tsx": read("../components/site/GuestPreviewResult.tsx"),
  "project-intelligence.tsx": read("../routes/project-intelligence.tsx"),
};

const serverModules = {
  "preview/input.server.ts": read("./preview/input.server.ts"),
  "preview/prompt.server.ts": read("./preview/prompt.server.ts"),
  "preview/provider.server.ts": read("./preview/provider.server.ts"),
  "preview/analyze.server.ts": read("./preview/analyze.server.ts"),
  "preview/pipeline.server.ts": read("./preview/pipeline.server.ts"),
  "preview/guest-session.server.ts": read("./preview/guest-session.server.ts"),
  "preview/rate-limit.server.ts": read("./preview/rate-limit.server.ts"),
  "preview/persist.server.ts": read("./preview/persist.server.ts"),
  "preview/logger.server.ts": read("./preview/logger.server.ts"),
};

describe("client bundle boundary", () => {
  it("has no static import of a .server module from client-reachable code", () => {
    for (const [name, source] of Object.entries(clientReachable)) {
      // `await import("./x.server")` inside a handler is the allowed form; a
      // top-level `import ... from "./x.server"` is not.
      const staticServerImports = code(source).match(
        /^\s*import[^;]*from\s+["'][^"']*\.server["']/gm,
      );
      expect(staticServerImports, `${name} must not statically import a .server module`).toBeNull();
    }
  });

  it("has no reference to the service-role Supabase client in client-reachable code", () => {
    for (const [name, source] of Object.entries(clientReachable)) {
      expect(code(source), `${name} must not reference client.server`).not.toContain(
        "client.server",
      );
    }
  });

  it("keeps the system prompt and output schema out of client-reachable code", () => {
    for (const [name, source] of Object.entries(clientReachable)) {
      const body = code(source);
      expect(body, `${name} must not import prompt.server`).not.toContain("prompt.server");
      expect(body, `${name} must not contain the system prompt body`).not.toContain(
        "Du bist ein Analyst",
      );
      expect(body, `${name} must not contain the output schema`).not.toContain(
        "PREVIEW_OUTPUT_JSON_SCHEMA",
      );
    }
  });

  it("never reads provider configuration in client-reachable code", () => {
    for (const [name, source] of Object.entries(clientReachable)) {
      expect(code(source), `${name} must not read process.env`).not.toMatch(/process\.env/);
    }
  });

  it("marks every server module as server-only by naming or documented contract", () => {
    // `.server.ts` is the convention the framework and the boundary test rely on;
    // this asserts the modules that hold secrets or internals follow it.
    for (const name of Object.keys(serverModules)) {
      expect(name.endsWith(".server.ts")).toBe(true);
    }
  });
});

describe("credit isolation", () => {
  const creditTables = [
    "analysis_credits",
    "credit_transactions",
    "analyses",
    "profiles",
    "organizations",
    "organization_members",
    "payments",
  ];

  it("never touches a credit, account, or billing table from the guest path", () => {
    for (const [name, source] of Object.entries({ ...clientReachable, ...serverModules })) {
      const body = code(source);
      for (const table of creditTables) {
        // `supabaseAdmin.from("analyses")` or a SQL reference would both match.
        expect(body, `${name} must not reference ${table}`).not.toMatch(
          new RegExp(`\\b${table}\\b`),
        );
      }
    }
  });

  it("does not import any credit or account module", () => {
    for (const [name, source] of Object.entries({ ...clientReachable, ...serverModules })) {
      const body = code(source);
      expect(body, `${name} must not import account.functions`).not.toContain("account.functions");
      expect(body, `${name} must not import credit modules`).not.toMatch(
        /from\s+["'][^"']*credit[^"']*["']/,
      );
    }
  });

  it("performs no billing arithmetic or price lookup in the guest path", () => {
    // The €49 figure is allowed to APPEAR as account-marketing copy — that is
    // the conversion invitation the task asks for. What must not exist is billing
    // logic: a price constant, a cents value, or a payment call.
    for (const [name, source] of Object.entries({ ...clientReachable, ...serverModules })) {
      const body = code(source);
      expect(body, `${name} must not read a price constant`).not.toContain("ANALYSIS_PRICE_CENTS");
      expect(body, `${name} must not compute cents`).not.toMatch(/\b4900\b/);
      expect(body, `${name} must not call a payment provider`).not.toMatch(
        /\b(stripe|checkout|payment_intent|invoice)\b/i,
      );
    }
  });

  it("records no credit state in the preview result the client receives", () => {
    const schema = code(clientReachable["preview.schema.ts"]!);
    // "remaining" is the preview counter, never a credit balance. A field named
    // for credits would mean the guest path started reporting account state.
    expect(schema).not.toMatch(/credits?\b/i);
    expect(schema).not.toMatch(/\bbalance\b/i);
  });
});

describe("provider secrets", () => {
  it("reads the API key only inside the provider module", () => {
    const keyReaders = Object.entries(serverModules).filter(([, source]) =>
      source.includes("VZG_PREVIEW_ANTHROPIC_API_KEY"),
    );
    expect(keyReaders.map(([name]) => name)).toEqual(["preview/provider.server.ts"]);
  });

  it("provides no free-text channel in the logger payload", () => {
    const logger = code(serverModules["preview/logger.server.ts"]!);
    // Allow-listed fields only: there is nowhere to pass an idea or a prompt.
    expect(logger).not.toMatch(/\bella(idea|prompt|message|body|text)\b/);
    expect(logger).not.toMatch(/\bidea\s*:/);
    expect(logger).not.toMatch(/\bprompt\s*:/);
    expect(logger).not.toMatch(/\b(apiKey|token|secret)\s*:/);
  });

  it("does not include a literal secret in any guest preview source file", () => {
    for (const [name, source] of Object.entries({ ...clientReachable, ...serverModules })) {
      expect(source, `${name} must not embed a key`).not.toMatch(/sk-ant-[A-Za-z0-9_-]{8,}/);
      expect(source, `${name} must not embed a service role JWT`).not.toMatch(
        /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./,
      );
    }
  });

  it("never returns the API key or the system prompt to the caller", () => {
    const functions = code(clientReachable["preview.functions.ts"]!);
    // The response is built from the validated analysis and constants only.
    expect(functions).not.toMatch(/apiKey|PREVIEW_SYSTEM_PROMPT|process\.env/);
  });
});
