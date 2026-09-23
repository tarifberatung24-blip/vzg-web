import type { LimitMode } from "../preview.schema";
import { RATE_LIMIT_MAX_PREVIEWS, RATE_LIMIT_WINDOW_SECONDS } from "./input.server";

/**
 * Server-side abuse control for the Guest Preview.
 *
 * The authoritative decision is always made here, on the server, and never in
 * the browser. Two tiers are supported so the feature works before the durable
 * migration is applied, without pretending that a weaker tier is equivalent:
 *
 *  - `durable`: backed by `guest_rate_limits` in Postgres. Survives worker
 *    restarts and is shared across all workers. This is the intended
 *    production tier.
 *  - `process_local`: in-memory, per worker instance. It bounds abuse honestly
 *    for a single instance but is NOT a network-level throttle. When this tier
 *    is active the limitation is reported to the caller (`limitMode`) and
 *    documented, rather than being presented as a full guarantee.
 *
 * The interface is deliberately narrow so a later addition of Cloudflare
 * Turnstile, IP-based control, or a global rate limit slots in as another tier
 * without touching the server function or the UI.
 */

export type RateLimitMode = LimitMode;

export type RateLimitDecision = {
  allowed: boolean;
  /** Remaining previews in the current window after this request. */
  remaining: number;
  /** Seconds until the window resets, present only when denied. */
  retryAfterSeconds?: number;
  mode: RateLimitMode;
};

export const RATE_LIMIT_POLICY = {
  maxPreviews: RATE_LIMIT_MAX_PREVIEWS,
  windowSeconds: RATE_LIMIT_WINDOW_SECONDS,
} as const;

/* ------------------------------------------------------------------ *
 * process-local tier
 * ------------------------------------------------------------------ */

type Bucket = { count: number; windowStartedAt: number };

const buckets = new Map<string, Bucket>();

/** Drops expired buckets so the map cannot grow without bound. */
function sweep(now: number): void {
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStartedAt >= RATE_LIMIT_WINDOW_SECONDS * 1000) buckets.delete(key);
  }
}

/** Visible for tests; not used by production code paths. */
export function resetProcessLocalRateLimits(): void {
  buckets.clear();
}

function readProcessLocal(sessionHash: string): Bucket | undefined {
  const now = Date.now();
  const bucket = buckets.get(sessionHash);
  if (!bucket) return undefined;
  if (now - bucket.windowStartedAt >= RATE_LIMIT_WINDOW_SECONDS * 1000) {
    buckets.delete(sessionHash);
    return undefined;
  }
  return bucket;
}

function decideProcessLocal(sessionHash: string, dryRun: boolean): RateLimitDecision {
  const now = Date.now();
  if (buckets.size > 5000) sweep(now);

  const bucket = readProcessLocal(sessionHash);
  const used = bucket?.count ?? 0;

  if (used >= RATE_LIMIT_MAX_PREVIEWS) {
    const elapsed = bucket ? Math.floor((now - bucket.windowStartedAt) / 1000) : 0;
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(RATE_LIMIT_WINDOW_SECONDS - elapsed, 1),
      mode: "process_local",
    };
  }

  if (dryRun) {
    return { allowed: true, remaining: RATE_LIMIT_MAX_PREVIEWS - used, mode: "process_local" };
  }

  buckets.set(sessionHash, { count: used + 1, windowStartedAt: bucket?.windowStartedAt ?? now });
  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_PREVIEWS - (used + 1),
    mode: "process_local",
  };
}

/* ------------------------------------------------------------------ *
 * durable tier (optional; only used when guest_rate_limits exists)
 * ------------------------------------------------------------------ */

/**
 * Records one preview for a guest session and returns the authoritative
 * decision, using the durable table when it is present.
 *
 * Falls back to the process-local tier when the table has not been created yet,
 * so the feature remains usable and honestly labelled before TASK-002/020 apply
 * the migration.
 */
export type QuotaOptions = {
  /**
   * Reads the remaining quota without consuming one. Used only to render an
   * accurate counter before submission; the authoritative, consuming check
   * always runs on submit.
   */
  dryRun?: boolean;
};

export async function consumeGuestPreviewQuota(
  sessionHash: string,
  options: QuotaOptions = {},
): Promise<RateLimitDecision> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // The generated `Database` types only declare the TASK-0 tables. The quota
    // functions arrive with the TASK-001 migration, so this adapter is typed
    // narrowly and validated at the boundary instead of widening the global
    // Supabase types for a function that may not exist yet.
    const rpc = supabaseAdmin.rpc.bind(supabaseAdmin) as unknown as (
      fn: string,
      params: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;

    const { data, error } = await rpc(
      options.dryRun ? "peek_guest_preview_quota" : "consume_guest_preview_quota",
      {
        p_session_hash: sessionHash,
        p_max: RATE_LIMIT_MAX_PREVIEWS,
        p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
      },
    );

    if (error) throw new Error(error.message);

    const row = Array.isArray(data) ? data[0] : data;
    if (!row || typeof row !== "object") throw new Error("unexpected quota response shape");

    const typed = row as { allowed?: unknown; remaining?: unknown; retry_after_seconds?: unknown };
    if (typeof typed.allowed !== "boolean" || typeof typed.remaining !== "number") {
      throw new Error("unexpected quota response fields");
    }

    const decision: RateLimitDecision = {
      allowed: typed.allowed,
      remaining: typed.remaining,
      mode: "durable",
    };
    if (typeof typed.retry_after_seconds === "number") {
      decision.retryAfterSeconds = typed.retry_after_seconds;
    }
    return decision;
  } catch (error) {
    // A missing table (migration not applied), a missing service-role key, or a
    // transient database error all land here. Degrade to the local tier instead
    // of failing the request or silently skipping the limit.
    console.warn(
      JSON.stringify({
        scope: "guest_preview",
        level: "warn",
        message: "durable rate limit unavailable; using process-local tier",
        reason: error instanceof Error ? error.name : "unknown",
      }),
    );
    return decideProcessLocal(sessionHash, options.dryRun === true);
  }
}
