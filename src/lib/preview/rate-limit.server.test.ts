import { beforeEach, describe, expect, it } from "vitest";
import {
  RATE_LIMIT_POLICY,
  consumeGuestPreviewQuota,
  resetProcessLocalRateLimits,
} from "./rate-limit.server";

/**
 * The durable tier requires a live database, so these tests exercise the
 * process-local tier by ensuring no database connection env is present. That is
 * exactly the degradation path production takes before the migration is applied,
 * so this covers real behaviour rather than a stub.
 */
beforeEach(() => {
  resetProcessLocalRateLimits();
  delete process.env["POSTGRES_URL"];
  delete process.env["DATABASE_URL"];
  delete process.env["LOVABLE_DB_MIGRATION_URL"];
  delete process.env["SUPABASE_SERVICE_ROLE_KEY"];
});

const session = "a".repeat(64);

describe("consumeGuestPreviewQuota (process-local tier)", () => {
  it("allows exactly the policy maximum and then denies", async () => {
    for (let i = 0; i < RATE_LIMIT_POLICY.maxPreviews; i += 1) {
      const decision = await consumeGuestPreviewQuota(session);
      expect(decision.allowed).toBe(true);
      expect(decision.mode).toBe("process_local");
    }

    const denied = await consumeGuestPreviewQuota(session);
    expect(denied.allowed).toBe(false);
    expect(denied.remaining).toBe(0);
    expect(denied.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("counts down the remaining quota for the caller", async () => {
    const first = await consumeGuestPreviewQuota(session);
    const second = await consumeGuestPreviewQuota(session);
    expect(first.remaining).toBe(RATE_LIMIT_POLICY.maxPreviews - 1);
    expect(second.remaining).toBe(RATE_LIMIT_POLICY.maxPreviews - 2);
  });

  it("isolates sessions from each other", async () => {
    const other = "b".repeat(64);
    for (let i = 0; i < RATE_LIMIT_POLICY.maxPreviews; i += 1) {
      await consumeGuestPreviewQuota(session);
    }
    expect((await consumeGuestPreviewQuota(session)).allowed).toBe(false);
    expect((await consumeGuestPreviewQuota(other)).allowed).toBe(true);
  });

  it("does not consume quota on a dry run", async () => {
    const peek = await consumeGuestPreviewQuota(session, { dryRun: true });
    expect(peek.allowed).toBe(true);
    expect(peek.remaining).toBe(RATE_LIMIT_POLICY.maxPreviews);

    // A peek must not advance the counter.
    const afterPeek = await consumeGuestPreviewQuota(session, { dryRun: true });
    expect(afterPeek.remaining).toBe(RATE_LIMIT_POLICY.maxPreviews);
  });

  it("reports the correct remaining count on a dry run mid-window", async () => {
    await consumeGuestPreviewQuota(session);
    const peek = await consumeGuestPreviewQuota(session, { dryRun: true });
    expect(peek.remaining).toBe(RATE_LIMIT_POLICY.maxPreviews - 1);
  });

  it("reports denial on a dry run once exhausted, without further consuming", async () => {
    for (let i = 0; i < RATE_LIMIT_POLICY.maxPreviews; i += 1) {
      await consumeGuestPreviewQuota(session);
    }
    const peek = await consumeGuestPreviewQuota(session, { dryRun: true });
    expect(peek.allowed).toBe(false);
    expect(peek.remaining).toBe(0);
  });

  it("enforces the window length in the policy", () => {
    expect(RATE_LIMIT_POLICY.windowSeconds).toBe(24 * 60 * 60);
  });
});
