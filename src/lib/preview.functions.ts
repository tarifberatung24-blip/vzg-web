import { createServerFn } from "@tanstack/react-start";
import {
  guestPreviewInputSchema,
  PREVIEW_ERROR_MESSAGES,
  type GuestPreviewDistribution,
  type GuestPreviewResponse,
} from "./preview.schema";

/**
 * Public (unauthenticated) server functions for the Guest Preview.
 *
 * This module ships to the client bundle. It must never import a `.server`
 * module at top level, never read provider configuration, and never reference
 * `client.server` directly — all of that lives behind dynamic imports inside
 * the `.server` modules it calls.
 *
 * This feature deliberately has NO interaction with the credit system: it does
 * not read or write `analyses`, `profiles`, or any future credit table, and it
 * creates no €49 billing state. See docs/GUEST_PREVIEW.md.
 */

/* ------------------------------------------------------------------ *
 * State (preview counts / limit mode)
 * ------------------------------------------------------------------ */

const emptyState: GuestPreviewDistribution = {
  remaining: null,
  limitMode: null,
  configured: false,
};

export const getGuestPreviewState = createServerFn({ method: "GET" }).handler(
  async (): Promise<GuestPreviewDistribution> => {
    const [{ resolveGuestSession }, { consumeGuestPreviewQuota }, { resolvePreviewProvider }] =
      await Promise.all([
        import("./preview/guest-session.server"),
        import("./preview/rate-limit.server"),
        import("./preview/provider.server"),
      ]);

    // A missing provider key is a configuration fact the UI must be honest
    // about, so it is surfaced rather than discovered on submit.
    const resolution = await resolvePreviewProvider();
    if (resolution.kind === "not_configured") return emptyState;

    try {
      // A dry run reads the counter without consuming it, so merely loading the
      // page cannot burn a guest's quota.
      const { sessionHash } = resolveGuestSession();
      const decision = await consumeGuestPreviewQuota(sessionHash, { dryRun: true });
      return { remaining: decision.remaining, limitMode: decision.mode, configured: true };
    } catch {
      // Reading the counter must never break page rendering. The authoritative
      // check still runs on submit, so a failure here only costs accuracy of the
      // displayed number.
      return { remaining: null, limitMode: null, configured: true };
    }
  },
);

/* ------------------------------------------------------------------ *
 * Preview execution
 * ------------------------------------------------------------------ */

export const runGuestPreview = createServerFn({ method: "POST" })
  .validator((data: unknown) => guestPreviewInputSchema.parse(data))
  .handler(async ({ data }): Promise<GuestPreviewResponse> => {
    // Both imports are dynamic and live inside the handler, so neither the
    // session module nor the pipeline enters the client bundle. The pipeline
    // itself owns the quota/provider/persist sequencing and is covered directly
    // by tests, because a server function needs the Start runtime to execute.
    const [{ resolveGuestSession }, { runGuestPreviewPipeline, createDefaultDeps }] =
      await Promise.all([
        import("./preview/guest-session.server"),
        import("./preview/pipeline.server"),
      ]);

    try {
      const { sessionHash } = resolveGuestSession();
      return await runGuestPreviewPipeline(data, sessionHash, createDefaultDeps());
    } catch (error) {
      // `resolveGuestSession` can fail if the request context is unavailable.
      // The pipeline already handles its own failures, so reaching here means
      // the request never started; return the safest generic message.
      console.error(
        JSON.stringify({
          scope: "guest_preview",
          level: "error",
          stage: "session",
          reason: error instanceof Error ? error.name : "unknown",
        }),
      );
      return { ok: false, code: "SERVER_ERROR", message: PREVIEW_ERROR_MESSAGES.SERVER_ERROR };
    }
  });
