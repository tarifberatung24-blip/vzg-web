# TASK-001 — Guest Preview

Status: **implemented on `feature/project-int-guest-preview`**. This document describes what
was built, what it deliberately does not do, and what must be done before it is reachable in
production.

Related: `docs/PROJECT_INT_ARCHITECTURE.md` §5 (guest flow), `docs/PROJECT_INT_SECURITY.md`
(threat model), `docs/PROJECT_INT_BUILD_PLAN.md` (TASK-001, TASK-002, TASK-020).

---

## 1. What the feature is

A visitor who is not signed in describes a business idea and, within seconds, receives a
lightweight **preview** of how VZG Project Intelligence would evaluate it. The preview
carries enough structure to be genuinely useful, then explains the full product and invites
the visitor to create a Business Account.

The preview is a **different product** from the full analysis, not a truncated one:

| | Guest preview | Full analysis (TASK-005+) |
| --- | --- | --- |
| Research | none | source plan, evidence research, evidence ledger |
| Verification | none | independent verifier, red team |
| Market | none | market findings, competitors |
| Money | a hypothesis only | financial engine with scenarios |
| Output | one screen, 8 sections | customer report + private VZG blueprint |
| Cost | one cheap model call | multi-stage pipeline, many calls |
| Account | not required | required |

A guest preview must never consume an analysis credit. It is not part of the 3-free/€49
accounting at all — it does not read, write, or import anything from the credit or billing
domains. This is enforced structurally, not by convention: see §6.

## 2. Output contract

The model returns exactly this shape, enforced by a JSON schema passed to the provider
(`PREVIEW_OUTPUT_JSON_SCHEMA`) and re-validated with Zod on receipt (`previewAnalysisSchema`):

| Field | Purpose |
| --- | --- |
| `ideaSummary` | restates the idea in neutral terms so the visitor sees they were understood |
| `compliance.status` + `explanation` | an initial regulatory **signal** (never advice) |
| `businessModel.type` + `explanation` | how the idea most plausibly makes money |
| `monetizationHypothesis` | 1–3 hypotheses, explicitly unproven |
| `technicalFeasibility.level` + `explanation` | rough build difficulty |
| `keyRisks` | up to 4 risks, categorised |
| `validationSteps` | concrete next steps the visitor can take themselves |
| `limitations` | what this preview did not do |

`compliance.status = BLOCKED` short-circuits the response: the server sets
`blocked = true`, and the UI suppresses any optimisation or monetisation advice.

Both the analysis schema and the wire-response schema are `.strict()`. An unexpected field
is a validation failure, not something to be ignored — this is what stops a model (or a
future careless edit) from adding an internal field to the customer payload.

## 3. Deliberate non-capabilities

The system prompt forbids, and the output schema makes impossible, the following:

- **No deep research.** No search tool, no browsing, no retrieval. If a claim needs a
  source, that is the full analysis.
- **No full evidence report.** There is no evidence ledger in the guest path.
- **No internal VZG intelligence.** The model has no access to the scoring methodology,
  prompt versions, pricing inputs, or blueprints. It reasons only from the submitted idea
  and general knowledge.
- **No profit promises.** The prompt forbids forecasts and guarantees; monetisation appears
  only as an unproven hypothesis.
- **No definitive legal advice.** Compliance output is a signal with an explicit status
  vocabulary that includes `REVIEW_REQUIRED` and `BLOCKED`; the prompt requires the model
  to defer to qualified advice.
- **No claim of verification.** Canonical limitations are appended server-side and cannot be
  removed by the model.

## 4. Request pipeline

`runGuestPreviewPipeline` (in `src/lib/preview/pipeline.server.ts`) runs three steps in a
fixed order. The order is a security property:

1. **Consume quota** — before any paid work. Denied ⇒ the provider is never called.
2. **Call the provider** — only if quota was granted. Provider failures are mapped to a
   closed set of user-safe codes.
3. **Persist lineage** — only after a validated result exists. Persistence failure never
   fails the request; the response carries a transient id instead.

Every collaborator is injected, which is why the pipeline has direct test coverage without
a live HTTP request. The server function in `preview.functions.ts` is a thin wrapper: it
reads the guest session and delegates. It is deliberately thin because a `createServerFn`
cannot execute outside the Start runtime, so logic left inside it would be untestable.

### Failure codes

| Code | Meaning | Retried by client? |
| --- | --- | --- |
| `INVALID_INPUT` | payload failed validation | no |
| `RATE_LIMITED` | session quota exhausted | after `retryAfterSeconds` |
| `NOT_CONFIGURED` | no provider configured | no |
| `PROVIDER_UNAVAILABLE` | provider transport failure | yes |
| `PROVIDER_TIMEOUT` | provider exceeded the deadline | yes |
| `INVALID_MODEL_OUTPUT` | response was truncated, refused, or failed schema | yes |
| `SERVER_ERROR` | anything else; opaque by design | yes |

Messages come from `PREVIEW_ERROR_MESSAGES` and never include provider text, SQL detail, or
stack traces.

## 5. Abuse control

Policy: **3 previews per guest session per 24 hours** (`RATE_LIMIT_POLICY`).

Two tiers, and the active tier is reported to the caller rather than hidden:

- `durable` — `guest_rate_limits` in Postgres, incremented inside a
  `SELECT … FOR UPDATE` transaction so concurrent requests on the same session cannot both
  pass as the last allowed preview. This is the intended production tier.
- `process_local` — in-memory, per worker. Honest for one instance, **not** a network-level
  throttle. Active until the migration is applied.

The decision is always made on the server. The browser cannot influence the limit: the
session hash comes from a signed HttpOnly cookie, and the limit and window are arguments
supplied by server code, not by the request.

`getGuestPreviewState` reads the counter with `dryRun: true`, so loading the page cannot
consume a preview. The displayed number is advisory; the authoritative check runs on submit.

Residual gap: a visitor who clears cookies or uses a different browser gets a new session.
Session-scoped limiting is therefore a cost control, not an anti-fraud control. Closing this
needs a network-level signal (Turnstile or IP) and is listed as a mitigation to add in
TASK-020. Per the repository convention, no IP address is currently stored or logged.

## 6. What is enforced, and how

| Requirement | Enforcement | Where |
| --- | --- | --- |
| Guest cannot consume an analysis credit | guest path contains no reference to any credit/account/billing table or module | `src/lib/preview.boundaries.test.ts` |
| Server internals never reach the browser | no static `.server` import in client-reachable files; verified against the real build output | boundary test + build check below |
| Response cannot carry an internal field | `.strict()` Zod schema validated on the client | `guestPreviewResponseSchema` |
| Quota cannot be set by the client | server-side decision; session id from signed cookie | `guest-session.server.ts`, `rate-limit.server.ts` |
| Guest rows are not readable from a browser | RLS enabled, **no policy for `anon`/`authenticated`** | migration §7 |
| Quota functions are not callable from a browser | `SECURITY DEFINER`, revoked from `public`/`anon`/`authenticated`, granted to `service_role` only | migration §7 |
| Idea text and session id never logged | allow-listed log payload with no free-text channel | `logger.server.ts`, asserted in pipeline tests |
| Limitations cannot be softened by the model | appended server-side, minimum one entry enforced by schema | pipeline |

The boundary tests read the source files and strip comments before asserting, because the
doc comments deliberately name the forbidden identifiers. They fail if someone adds a
static server import, references `client.server`, reads `process.env`, or mentions any
credit/account table in the guest path.

### Build-output verification

`npm run build` was run and the emitted client bundle searched for server-only strings:

```
VZG_UNTRUSTED                    → 0 client files
PREVIEW_SYSTEM_PROMPT            → 0 client files
VZG_PREVIEW_ANTHROPIC_API_KEY    → 0 client files
consume_guest_preview_quota      → 0 client files
guest_rate_limits / guest_previews → 0 client files
```

The same strings are present in `.output/server`. The client chunk for
`preview.functions.ts` contains only RPC stubs. Re-run this check after any change to the
imports in `preview.functions.ts` or the route file.

## 7. Database migration

`supabase/migrations/20260923100000_guest_preview.sql` — **written but not applied.**

Additive and idempotent. It creates `guest_previews` and `guest_rate_limits`, enables RLS on
both, adds **no policies** for `anon`/`authenticated`, revokes the default Supabase grants,
and creates `consume_guest_preview_quota`, `peek_guest_preview_quota`, and
`purge_expired_guest_previews` as `SECURITY DEFINER` with a pinned `search_path`, granted
only to `service_role`.

To apply, from a machine with database access:

```bash
psql "$LOVABLE_DB_MIGRATION_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20260923100000_guest_preview.sql
```

Verify afterwards:

```sql
select relname, relrowsecurity from pg_class
 where relname in ('guest_previews','guest_rate_limits');       -- both: true

select count(*) from pg_policies
 where tablename in ('guest_previews','guest_rate_limits');      -- both: 0

select has_function_privilege('anon',
  'public.consume_guest_preview_quota(text,integer,integer)', 'execute');  -- false
```

Before applying, confirm that `POSTGRES_URL` (or `DATABASE_URL`) is set in the runtime
environment. Without it the application runs correctly but with the weaker quota tier and
no lineage storage — the preview itself still works.

Scheduling `purge_expired_guest_previews` is a later task; until then precedence is not a
data-loss risk because the rows are only lineage, not authoritative state. It is a
retention obligation, so it should not be deferred past TASK-020.

## 8. Configuration

| Variable | Required | Purpose |
| --- | --- | --- |
| `VZG_PREVIEW_ANTHROPIC_API_KEY` | production | provider credential; read only in `provider.server.ts` |
| `VZG_PREVIEW_MODEL` | no | model id; defaults to a current Claude model |
| `VZG_GUEST_SESSION_SECRET` | production | signs the guest cookie |
| `VZG_GUEST_PREVIEW_HASH_SALT` | production | derives the stored session hash; rotating it orphans prior rows |
| `VZG_GUEST_PREVIEW_TTL_HOURS` | no | lineage retention, default 24, capped at 14 days |
| `VZG_PREVIEW_ALLOW_MOCK` | never in production | enables the deterministic mock provider outside production |
| `POSTGRES_URL` / `DATABASE_URL` | for durable tier | direct Postgres connection |

The provider resolution **fails closed**: with no key, the feature returns `NOT_CONFIGURED`
in production. The mock provider requires both a non-production `NODE_ENV` **and** an
explicit `VZG_PREVIEW_ALLOW_MOCK=1`, so it cannot be enabled by environment drift alone.

If `VZG_GUEST_SESSION_SECRET` is unset, a per-process random secret is generated and a
warning is logged (never the value). Guest sessions then do not survive a worker restart,
which weakens quota enforcement to per-worker. Set the secret in production.

Cost note: each guest preview is one `max_tokens: 4000` call with a bounded input
(≤2000-char idea). At 3 previews per session, worst-case spend per visitor is bounded and
small. Because the durable tier is not yet applied, a distributed visitor can multiply this
by clearing cookies — the practical reason to add Turnstile in TASK-020.

## 9. Testing

`npx vitest run` — 116 tests across 8 files, all passing.

Focused on:

- the pipeline decision path: ordering, every failure code, no persistence on failure,
  no provider call when rate-limited, no log line containing the idea or session hash
- schema strictness at both the model boundary and the wire boundary
- prompt-injection handling: the marker list, and that a payload cannot forge the fence
  (the delimiters are derived from the payload itself, so a guess at the fence is wrong)
- guest session signing: tampering, id swapping, salt rotation
- provider resolution fail-closed rules, truncation, refusal, and transport error mapping
- structural invariants: server/client boundary, credit isolation, no embedded secrets

Not covered, by design and stated plainly: the durable quota tier and the migration itself
require a live database, and the real Anthropic call requires a key. Both are verified by
inspection and documented here rather than being simulated.

## 10. Known gaps and follow-ups

| Gap | Impact | Task |
| --- | --- | --- |
| Durable quota tier not active | cookie-clearing multiplies spend | TASK-002 |
| No network-level abuse signal | bot abuse possible | TASK-020 |
| Purge job not scheduled | lineage retained past TTL | TASK-020 |
| No CAPTCHA | scripted abuse possible | TASK-020 |
| Preview not linked to a later account | visitor must resubmit after signup | TASK-002/TASK-005 |
| No E2E browser test | UI wiring verified manually | TASK-021 |
| `npm run lint` fails repo-wide | pre-existing Prettier errors, not from this work | coordinate with Lovable |

The last row is pre-existing: lint reports 422 errors across untouched files, and
`AGENTS.md` already documents this. The files added here are Prettier-clean and ESLint-clean.
