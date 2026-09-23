import { randomUUID } from "node:crypto";
import type { PreviewAnalysis } from "../preview.schema";

/**
 * Optional durable persistence for guest previews and the minimal retention
 * policy that comes with it.
 *
 * What is stored: a salted hash of the guest session, the market, the
 * submitted idea, the validated preview result, and an explicit `expires_at`.
 * What is never stored: IP addresses, user agents, device or browser
 * fingerprints, system prompts, provider configuration, or any credential.
 *
 * Retention: rows carry `expires_at = now() + VZG_GUEST_PREVIEW_TTL_HOURS`
 * (default 24h) and are removed by `purgeExpiredGuestPreviews`, invoked from a
 * cron endpoint in a later task. There is no indefinite retention path.
 *
 * Access: the migration grants `anon`/`authenticated` no policy at all, so guest
 * rows cannot be enumerated or read from a client, and RLS is enabled. Writes
 * go exclusively through the service role from this server-only module.
 *
 * Failure behaviour: if the database connection env is absent or the migration
 * has not been applied, persistence is skipped. The preview is still delivered
 * (nothing is simulated, nothing is faked) and the caller is told the row was
 * not stored, so the loss of lineage is visible rather than silent.
 */

export const DEFAULT_GUEST_PREVIEW_TTL_HOURS = 24;

type Sql = <T = unknown>(strings: TemplateStringsArray, ...values: unknown[]) => Promise<T[]>;

let sqlPromise: Promise<Sql | undefined> | undefined;
let recoveryPromise: Promise<void> | undefined;

function resolveUrl(): string | undefined {
  return (
    process.env["POSTGRES_URL"] ??
    process.env["DATABASE_URL"] ??
    process.env["LOVABLE_DB_MIGRATION_URL"]
  );
}

async function rediscover(): Promise<Sql | undefined> {
  const url = resolveUrl();
  if (!url) return undefined;

  try {
    const { default: postgres } = await import("postgres");
    const client = postgres(url, {
      max: 2,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    });
    return client as unknown as Sql;
  } catch {
    return undefined;
  }
}

function connect(): Promise<Sql | undefined> {
  if (!sqlPromise) {
    sqlPromise = rediscover().catch(() => undefined);
  }
  return sqlPromise;
}

/** Re-resolves the connection after a failure, at most one attempt at a time. */
async function recover(): Promise<void> {
  if (!recoveryPromise) {
    recoveryPromise = (async () => {
      sqlPromise = undefined;
      await connect();
    })().finally(() => {
      recoveryPromise = undefined;
    });
  }
  return recoveryPromise;
}

export function resolveGuestPreviewTtlHours(): number {
  const raw = process.env["VZG_GUEST_PREVIEW_TTL_HOURS"];
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 24 * 14) {
    return DEFAULT_GUEST_PREVIEW_TTL_HOURS;
  }
  return parsed;
}

export type PersistedPreviewRow = {
  id: string;
  created_at: string;
  expires_at: string;
};

export type PersistOutcome =
  | { stored: true; row: PersistedPreviewRow }
  | { stored: false; reason: "not_configured" | "unavailable" };

export type PersistPreviewArgs = {
  sessionHash: string;
  market: string;
  idea: string;
  result: PreviewAnalysis;
  complianceStatus: string;
  ttlHours: number;
};

export async function persistGuestPreview(args: PersistPreviewArgs): Promise<PersistOutcome> {
  if (!resolveUrl()) return { stored: false, reason: "not_configured" };

  const attempt = async (): Promise<PersistOutcome> => {
    const sql = await connect();
    if (!sql) return { stored: false, reason: "not_configured" };

    const rows = await sql<PersistedPreviewRow>`
      insert into public.guest_previews
        (session_hash, market, input_idea, result, compliance_status, expires_at)
      values
        (${args.sessionHash}, ${args.market}, ${args.idea},
         ${JSON.stringify(args.result)}::jsonb,
         ${args.complianceStatus},
         now() + make_interval(hours => ${args.ttlHours}))
      returning id, created_at, expires_at
    `;

    const row = rows[0];
    if (!row) throw new Error("insert returned no row");
    return { stored: true, row };
  };

  try {
    return await attempt();
  } catch (error) {
    // A missing table (migration not applied) or a transient fault both land
    // here. Retry once after reconnecting; never fail the user's request over
    // an optional lineage record.
    console.warn(
      JSON.stringify({
        scope: "guest_preview",
        level: "warn",
        message: "guest preview persistence failed; retrying once",
        reason: error instanceof Error ? error.name : "unknown",
      }),
    );

    try {
      await recover();
      return await attempt();
    } catch (retryError) {
      console.warn(
        JSON.stringify({
          scope: "guest_preview",
          level: "warn",
          message: "guest preview persistence unavailable; continuing without storage",
          reason: retryError instanceof Error ? retryError.name : "unknown",
        }),
      );
      return { stored: false, reason: "unavailable" };
    }
  }
}

/** Fallback identifier when the preview could not be persisted. */
export function transientPreviewId(): string {
  return `local_${randomUUID()}`;
}

/**
 * Deletes expired guest previews. Intended for a cron endpoint guarded by
 * `authenticateCronRequest` in a later task; not scheduled from TASK-001.
 */
export async function purgeExpiredGuestPreviews(): Promise<number> {
  const sql = await connect();
  if (!sql) return 0;
  const rows = await sql<{ id: string }>`
    delete from public.guest_previews where expires_at < now() returning id
  `;
  return rows.length;
}
