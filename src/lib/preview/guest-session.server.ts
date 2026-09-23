import { createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { hashGuestIdentifier } from "./input.server";

/**
 * Privacy-minimised guest session.
 *
 * What is used: one opaque random session id (a UUID), stored in a signed,
 * HttpOnly, SameSite=Lax cookie. It carries no personal data, no device
 * identifiers and no browser fingerprint. Nothing is derived from the request
 * (no IP, no user agent, no headers).
 *
 * What is persisted server-side: only a salted HMAC of the session id. The raw
 * session id never leaves the cookie, and the hash cannot be reversed to it.
 *
 * Retention: the cookie has a bounded lifetime and every persisted per-session
 * artefact carries an explicit expiry (see docs/GUEST_PREVIEW.md).
 */

export const GUEST_SESSION_COOKIE = "vzg_guest_sid";
/** Cookie and session lifetime. */
export const GUEST_SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;

const COOKIE_NAME_PATTERN = /^[a-f0-9-]{16,64}$/i;

/** Process-stable fallback secret, used only when the env secret is missing. */
let ephemeralSecret: string | undefined;
let warnedAboutEphemeralSecret = false;

function resolveSigningSecret(): string {
  const configured = process.env["VZG_GUEST_SESSION_SECRET"];
  if (configured) return configured;

  if (!ephemeralSecret) ephemeralSecret = randomBytes(32).toString("hex");
  if (!warnedAboutEphemeralSecret) {
    warnedAboutEphemeralSecret = true;
    // Deliberately does not log the value.
    console.warn(
      JSON.stringify({
        scope: "guest_preview",
        level: "warn",
        message:
          "VZG_GUEST_SESSION_SECRET is not set; using a per-process ephemeral secret. Set it in production so guest sessions survive worker restarts.",
      }),
    );
  }
  return ephemeralSecret;
}

/** Salt used to derive the persisted session hash. */
function resolveHashSalt(): string {
  return process.env["VZG_GUEST_PREVIEW_HASH_SALT"] ?? resolveSigningSecret();
}

function sign(rawId: string): string {
  return createHmac("sha256", resolveSigningSecret()).update(rawId).digest("hex");
}

function encodeCookieValue(rawId: string): string {
  return `${rawId}.${sign(rawId)}`;
}

/** Verifies the signature with a constant-time comparison. */
function decodeCookieValue(value: string): string | undefined {
  const separator = value.lastIndexOf(".");
  if (separator <= 0) return undefined;

  const rawId = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  if (!COOKIE_NAME_PATTERN.test(rawId)) return undefined;
  if (!/^[a-f0-9]{64}$/i.test(signature)) return undefined;

  const expected = Buffer.from(sign(rawId), "hex");
  const provided = Buffer.from(signature, "hex");
  if (expected.length !== provided.length) return undefined;
  if (!timingSafeEqual(expected, provided)) return undefined;

  return rawId;
}

function isProduction(): boolean {
  return process.env["NODE_ENV"] === "production";
}

/**
 * Returns the guest session hash for this request, minting a new session when
 * none is present or the existing cookie fails verification.
 *
 * The returned hash is the only guest identifier this feature persists.
 */
export function resolveGuestSession(): { sessionHash: string; isNew: boolean } {
  const existing = getCookie(GUEST_SESSION_COOKIE);
  const verified = existing ? decodeCookieValue(existing) : undefined;

  const rawId = verified ?? randomUUID();
  const isNew = verified === undefined;

  if (isNew) {
    setCookie(GUEST_SESSION_COOKIE, encodeCookieValue(rawId), {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction(),
      path: "/",
      maxAge: GUEST_SESSION_MAX_AGE_SECONDS,
    });
  }

  return { sessionHash: hashGuestIdentifier(rawId, resolveHashSalt()), isNew };
}
