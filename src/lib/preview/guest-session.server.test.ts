import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The cookie store is the framework boundary: TanStack's `getCookie`/`setCookie`
 * require a live request context. Everything else under test is the real
 * implementation — signing, constant-time verification, and hash derivation.
 */
const cookieJar = new Map<string, string>();

vi.mock("@tanstack/react-start/server", () => ({
  getCookie: (name: string) => cookieJar.get(name),
  setCookie: (name: string, value: string) => {
    cookieJar.set(name, value);
  },
}));

const { GUEST_SESSION_COOKIE, resolveGuestSession } = await import("./guest-session.server");
const { hashGuestIdentifier } = await import("./input.server");

const envKeys = ["VZG_GUEST_SESSION_SECRET", "VZG_GUEST_PREVIEW_HASH_SALT", "NODE_ENV"] as const;
let savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  cookieJar.clear();
  savedEnv = {};
  for (const key of envKeys) savedEnv[key] = process.env[key];
  process.env["VZG_GUEST_SESSION_SECRET"] = "test-signing-secret";
  process.env["VZG_GUEST_PREVIEW_HASH_SALT"] = "test-hash-salt";
  process.env["NODE_ENV"] = "test";
});

afterEach(() => {
  for (const key of envKeys) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

/** Reads the raw cookie as the browser would see it (HttpOnly still transmits). */
function rawCookie(): string {
  return cookieJar.get(GUEST_SESSION_COOKIE) ?? "";
}

describe("resolveGuestSession", () => {
  it("mints a session on first contact and sets a cookie", () => {
    const { sessionHash, isNew } = resolveGuestSession();
    expect(isNew).toBe(true);
    expect(sessionHash).toMatch(/^[a-f0-9]{64}$/);
    expect(rawCookie()).not.toBe("");
  });

  it("reuses the same session hash across calls within a session", () => {
    const first = resolveGuestSession();
    const second = resolveGuestSession();
    expect(second.isNew).toBe(false);
    expect(second.sessionHash).toBe(first.sessionHash);
  });

  it("gives different visitors different hashes", () => {
    const first = resolveGuestSession();
    cookieJar.clear();
    const second = resolveGuestSession();
    expect(second.sessionHash).not.toBe(first.sessionHash);
  });

  it("stores only a raw session id plus signature, never the hash", () => {
    const { sessionHash } = resolveGuestSession();
    // The persisted identity is a signature over an opaque id; the derived
    // session hash must not be readable from the cookie.
    expect(rawCookie()).not.toContain(sessionHash);
  });

  it("rejects a tampered cookie and issues a fresh session", () => {
    const first = resolveGuestSession();
    const [id, signature] = rawCookie().split(".");
    // Flip the signature: an attacker cannot forge a session for a known id.
    cookieJar.set(GUEST_SESSION_COOKIE, `${id}.${"0".repeat(64)}`);

    const after = resolveGuestSession();
    expect(after.isNew).toBe(true);
    expect(after.sessionHash).not.toBe(first.sessionHash);
    expect(signature).toHaveLength(64);
  });

  it("rejects a cookie whose id was swapped while keeping a valid-looking signature", () => {
    resolveGuestSession();
    const signature = rawCookie().split(".")[1]!;
    const forgedId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
    cookieJar.set(GUEST_SESSION_COOKIE, `${forgedId}.${signature}`);

    const after = resolveGuestSession();
    // Verification fails, so a new identity is minted instead of trusting it.
    expect(after.isNew).toBe(true);
  });

  it("rejects a malformed cookie", () => {
    cookieJar.set(GUEST_SESSION_COOKIE, "not-a-cookie");
    expect(resolveGuestSession().isNew).toBe(true);

    cookieJar.set(GUEST_SESSION_COOKIE, "short.zzzz");
    expect(resolveGuestSession().isNew).toBe(true);
  });

  it("derives the stored hash with the configured salt", () => {
    const { sessionHash } = resolveGuestSession();
    const id = rawCookie().split(".")[0]!;
    expect(sessionHash).toBe(hashGuestIdentifier(id, "test-hash-salt"));
  });

  it("changes the stored hash when the salt changes, invalidating old rows", () => {
    const before = resolveGuestSession();
    process.env["VZG_GUEST_PREVIEW_HASH_SALT"] = "rotated-salt";
    const after = resolveGuestSession();
    // Same cookie, different derived hash: rotating the salt orphans prior rows.
    expect(after.sessionHash).not.toBe(before.sessionHash);
  });
});
