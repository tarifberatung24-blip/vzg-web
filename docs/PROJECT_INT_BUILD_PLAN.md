# VZG Project Intelligence — Build Plan

Status: **Locked plan for TASK-0.** These tasks are for *future* sessions. None are
implemented by TASK-0.

## How to use this document

- Work tasks in dependency order. A task is only started when all its dependencies are
  `done` and verified.
- One task = one branch = one reviewable change set. Never bundle two tasks in one branch.
- Every task must leave `tsc`, `build`, and `lint` green for the files it touches.
- Every task must include tests (Vitest for logic/DB functions, Playwright for flows) and
  must state its security constraints explicitly.
- All database changes are delivered as ordered, idempotent SQL under
  `supabase/migrations/` following `PROJECT_INT_DATA_MODEL.md` §10. Never destructive.
- Never push to `main`; never rewrite published history (Lovable sync).

Conventions used below:

- **Files** lists the primary modules affected; exact names may be refined during the
  task, but module placement (`*.server.ts` vs `*.functions.ts`) is mandatory.
- **DoD** = definition of done.

---

## TASK-001 — Guest Preview

**Objective.** Public, account-free, cheap preview of a business idea that delivers
immediate value without consuming any full-analysis credit.

**Dependencies.** None (can start first), but benefits from TASK-002 for eventual
conversion analytics.

**Files/modules affected.**
- new `src/routes/projekt-check.tsx` (public wizard, no auth)
- new `src/lib/preview.functions.ts` (public serverFn, rate-limited + capped)
- new `src/lib/preview.schema.ts` (zod input/output)
- new `src/lib/preview.server.ts` (preview prompt, single low-cost model call, server-only)
- new `supabase/migrations/0010_guests.sql` (`guest_previews`, `rate_limits`)
- `src/routes/project-intelligence.tsx` (add primary CTA into the wizard)

**Acceptance criteria.**
- A visitor with no account can submit an idea and receive a structured preview in-page.
- Preview contains exactly: initial compliance signal, basic business-model
  understanding, basic technical feasibility, key risks, monetization hypothesis.
- Preview never creates an `analyses` row and never writes a `credit_transactions` row.
- Preview is labelled as preliminary; includes disclaimers: no profit promise, no
  definitive legal advice.
- Repeating the same idea within the TTL window is served from cache without a new model
  call.
- Per-fingerprint and per-network quotas are enforced (e.g. 3/hour, 10/day) and return a
  clear 429-style result.

**Tests.**
- Unit: input validation, normalization/fingerprinting, cache-hit path, quota logic.
- Integration: quotas enforced across repeated calls; cache TTL expiry.
- Playwright: visitor completes wizard without signing in and sees all five sections.
- Negative: oversized input rejected; prompt-injection string does not change output
  shape; preview response contains no internal fields.

**Security constraints.** No account required ⇒ the endpoint is the most exposed surface.
Strict input caps; structured JSON output only; no raw IP storage (salted hash); TTL on
stored previews; no service-role key reachable from this module's client bundle; no
internal tables touched; no expensive research; hard token budget per request.

**DoD.** Wizard works for anonymous visitors; quotas and cache verified by tests; no
credit or analysis rows created; disclaimers rendered; `tsc`/`build`/`lint` green;
security review of the public endpoint recorded.

---

## TASK-002 — Organization Model

**Objective.** Introduce organizations and memberships, back-fill personal organizations
for existing users, without breaking current behaviour.

**Dependencies.** None.

**Files/modules affected.**
- new `supabase/migrations/0001_org_model.sql`
- new `supabase/migrations/0011_rls.sql` (org + membership policies)
- `src/lib/account.functions.ts` (return org context; keep `user_id` path working)
- new `src/lib/org.functions.ts` (members list, create org, invite — server)
- `src/routes/_authenticated/konto.tsx` (show organization)

**Acceptance criteria.**
- Every existing `profiles` row has exactly one personal organization with that user as
  `owner` (idempotent back-fill, re-runnable).
- `is_org_member()` works without RLS recursion (security definer, fixed search_path).
- A member can read their org; a non-member gets zero rows.
- Existing dashboard still loads for legacy users (dual-read: `organization_id` then
  `user_id`).

**Tests.**
- SQL/integration: back-fill produces one org per profile; running it twice changes
  nothing.
- RLS: non-member SELECT on `organizations`/`organization_members` returns empty.
- Unit: org resolution helper prefers organization context and falls back for legacy rows.

**Security constraints.** `organization_members` readable only to members of that org;
role changes only by `owner`/`admin` of the org or VZG staff; `status='removed'` rows are
not membership; no client-writable `role`.

**DoD.** Migration applied in a staging environment and re-run safely; legacy dashboard
path verified; policies documented; tests green.

---

## TASK-003 — Credit Engine

**Objective.** Server-side, transactional, auditable free/paid credit system tied to the
organization.

**Dependencies.** TASK-002.

**Files/modules affected.**
- new `supabase/migrations/0002_credits.sql`
- new `supabase/migrations/0012_functions.sql` (`create_full_analysis`, constraint triggers)
- `src/lib/account.functions.ts` (replace read-model math with ledger/credit read)
- `src/lib/credits.functions.ts` (balance read; no client-set amounts)
- `src/routes/_authenticated/konto.tsx` (show authoritative remaining credits)

**Acceptance criteria.**
- `create_full_analysis` consumes free credits up to `free_granted`, then records
  `paid`/`offen`/€49 with a `credit_transactions` row, in one transaction.
- Client cannot pass `billing_kind`, `payment_status`, or `amount_cents`.
- `getAccountOverview.freeRemaining` matches the ledger exactly.
- Ledger rows are immutable (no client UPDATE/DELETE).
- Concurrent submissions with one free credit left ⇒ exactly one free row.

**Tests.**
- DB function tests: first 3 free, 4th paid at 4900, correct ledger rows and
  `balance_after`.
- Concurrency: N parallel calls ⇒ exactly `free_granted` free rows (real DB test, not
  mocked).
- Negative: unconfirmed email rejected; non-member rejected; client-supplied billing
  fields ignored or rejected.
- Recompute test: overview counts equal ledger-derived counts for a fixture org.

**Security constraints.** `FOR UPDATE` lock; constraint trigger as second defence;
`billing_kind`/`payment_status`/`amount_cents` server-only; every consumption writes
`audit_events`; no amounts accepted from the client.

**DoD.** Ledger reconciles with existing rows after back-fill; race test passes;
policies exported and reviewed.

---

## TASK-004 — Auth Hardening

**Objective.** Close auth gaps: email confirmation strength, reset/resend flows,
throttling, and server-boundary hygiene.

**Dependencies.** TASK-002 (for org context in account flows).

**Files/modules affected.**
- new `src/routes/passwort-zuruecksetzen.tsx`, `src/routes/passwort-neu.tsx`
- `src/routes/auth.tsx` (resend confirmation, disposable-domain warning)
- `src/lib/account.functions.ts` (keep server-side `email_confirmed_at` check; tighten)
- new `src/lib/auth.server.ts` (domain checks, throttle helpers)
- `.gitignore` (add `.env`, `.env.*`), new `.env.example`
- migrate `inputValidator()` → `validator()` in touched serverFns

**Acceptance criteria.**
- Password reset works end-to-end; reset links expire.
- Resend confirmation is rate-limited per address.
- Disposable/free-mail domains flagged (soft block or explicit notice) without breaking
  legitimate business domains.
- Unconfirmed users cannot create analyses (regression test).
- `.env` no longer tracked going forward; `.env.example` documents required keys without
  values.
- Server-side verification never relies on `user_metadata` for authorization.

**Tests.**
- Integration: unconfirmed create rejected; confirmed allowed.
- Unit: disposable-domain classifier; throttle window behaviour.
- Playwright: reset flow; resend flow; signup interstitial.
- Regression: `user_metadata.app_role` has no effect on any authorization decision.

**Security constraints.** No role or privilege derived from `user_metadata`; secrets stay
in the environment; no logging of tokens or passwords; timing-safe comparisons where
relevant.

**DoD.** Flows functional; regression tests green; `.env` handled per §S3-1; security
notes recorded.

---

## TASK-005 — Intake Wizard

**Objective.** Guided, validated intake that produces a structured `intake` payload for a
full analysis.

**Dependencies.** TASK-003.

**Files/modules affected.**
- `src/routes/_authenticated/konto.tsx` → replace the single textarea with a multi-step
  wizard (or new `src/routes/_authenticated/analysen/neu.tsx`)
- new `src/lib/intake.schema.ts` (versioned questions)
- `src/lib/account.functions.ts` → delegate creation to `create_full_analysis`
- `src/lib/intake.server.ts` (normalization, prompt-safe serialization)

**Acceptance criteria.**
- Intake captures idea, target group, geography, assumptions, constraints, budget
  posture, and compliance-relevant facts, versioned via `intake.version`.
- Answers persist as `analysis_answers` rows plus a serialized `intake` JSON on
  `analyses`.
- Validation is server-side (zod) and never trusts the client for billing fields.
- The user sees, before submit, whether the run will consume a free credit or be charged
  €49 — read from the server, not computed client-side.

**Tests.**
- Unit: schema validation, versioning, serialization.
- Integration: answers + intake persisted; billing preview matches `create_full_analysis`
  outcome.
- Playwright: full wizard happy path and validation errors.

**Security constraints.** Intake text is data, never instructions (delimiting +
sanitization before any model call); no uploads in this iteration; length caps.

**DoD.** Wizard functional, answers persisted, billing preview accurate, tests green.

---

## TASK-006 — Compliance State Machine

**Objective.** Deterministic compliance screening that can block or route an analysis
before expensive work runs.

**Dependencies.** TASK-005.

**Files/modules affected.**
- new `supabase/migrations/0004_pipeline.sql` (`compliance_findings`, stage runs part)
- `src/lib/pipeline/compliance.server.ts` (rules + model-assisted classification)
- `src/lib/pipeline/stages.server.ts` (stage-run bookkeeping)

**Acceptance criteria.**
- `analyses.compliance_state` follows an explicit state machine
  (`pending → screened → blocked | cleared | manual_review`) with allowed transitions
  only.
- Findings are stored as `compliance_findings` rows with severity and
  `requires_professional_review = true` by default.
- Blocking findings stop the pipeline before evidence research.
- Output never states a legal conclusion; every finding carries a review disclaimer.

**Tests.**
- Unit: transition table (illegal transitions rejected); rule fixtures per category.
- Integration: blocked analysis produces no research jobs.
- Content test: no finding text matches a "you are legally allowed to…" pattern.

**Security constraints.** Deterministic rules run before any model call; model output is
schema-validated; findings are customer-visible only as disclaimered signals.

**DoD.** State machine implemented and tested; blocking path verified; disclaimers
rendered.

---

## TASK-007 — Research Job Engine

**Objective.** Durable, leased job queue for long-running stages.

**Dependencies.** TASK-006.

**Files/modules affected.**
- `supabase/migrations/0004_pipeline.sql` (`analysis_jobs`)
- new `src/lib/pipeline/jobs.server.ts` (enqueue, lease, complete, fail, backoff)
- new `src/routes/api/jobs/tick.ts` (cron endpoint guarded by `cron-auth.ts`)

**Acceptance criteria.**
- Jobs are leased with `lease_expires_at`; a crashed worker's job becomes claimable again
  after the lease expires.
- Retries use bounded backoff with `max_attempts`; exhausted jobs become `dead` and are
  alerted on.
- The tick endpoint rejects requests without a valid cron secret (constant-time compare)
  and is idempotent per lease.
- No job runs inside a user HTTP request.

**Tests.**
- Integration: enqueue → lease → complete; lease expiry → reclaim; attempts exhaustion →
  dead.
- Security: tick without/with wrong secret ⇒ 401.
- Concurrency: two workers cannot both hold the same lease.

**Security constraints.** Cron endpoint server-only; service role used only inside
`*.server.ts`; job payloads contain no secrets; errors stored without stack traces that
leak credentials.

**DoD.** Jobs processed reliably; lease and retry semantics proven by tests; cron endpoint
authenticated.

---

## TASK-008 — Evidence Ledger

**Objective.** Append-only, citable evidence record linking claims to sources.

**Dependencies.** TASK-007.

**Files/modules affected.**
- `supabase/migrations/0005_evidence.sql`
- new `src/lib/pipeline/evidence.server.ts` (claim/source/record writers)
- `src/lib/pipeline/research.server.ts` (source discovery + retrieval)

**Acceptance criteria.**
- Every claim in a downstream report has ≥1 `evidence_records` row or an explicit
  `inconclusive` verdict.
- Evidence rows are append-only (no client UPDATE/DELETE).
- Sources store `retrieved_at`, `publisher`, `source_type`, `content_hash`, and excerpt;
  duplicates by `content_hash` are detected.
- Retrieval is rate-limited per domain and respects robots/ToS constraints chosen by VZG.

**Tests.**
- Unit: dedupe by hash; direction/strength validation.
- Integration: a report cannot be synthesized with an unsupported critical claim (gate
  from TASK-014/015).
- Security: anonymous/authenticated cannot insert or read raw excerpts belonging to
  another org.

**Security constraints.** Excerpts are private to the analysis; source text is treated as
data (no instruction following); no secrets or credentials stored in `sources`.

**DoD.** Ledger append-only and queryable; coverage check for critical claims enforced;
tests green.

---

## TASK-009 — Independent Verifier

**Objective.** Independently re-check each critical claim with a separate
prompt/model pass and record a verdict.

**Dependencies.** TASK-008.

**Files/modules affected.**
- `supabase/migrations/0005_evidence.sql` (`verification_results`, `contradictions`)
- new `src/lib/pipeline/verifier.server.ts`

**Acceptance criteria.**
- Every `critical`/`high` importance claim has exactly one `verification_results` row.
- Verifier prompt and model differ from the researcher's; the verifier does not receive
  the researcher's conclusion as trusted input.
- Verdict + confidence recorded; `refuted` claims cannot silently remain `supported` in
  the ledger path used for the report.
- Contradictions between claims are recorded in `contradictions`, with unresolved ones
  surfaced to red team.

**Tests.**
- Unit: coverage check (all critical claims verified); confidence bounds.
- Integration: a refuted claim changes the downstream claim status.
- Adversarial fixture: verifier rejects an injection attempt inside an excerpt.

**Security constraints.** Verifier output is schema-validated; verifier cannot query
internal tables; independence enforced structurally (separate prompt version + model).

**DoD.** Verification coverage enforced; refutation propagates; tests green.

---

## TASK-010 — Red Team

**Objective.** Adversarial pass that attacks the strongest claims and the financial model
before synthesis.

**Dependencies.** TASK-009.

**Files/modules affected.**
- `supabase/migrations/0005_evidence.sql` (red-team findings: reuse `contradictions` +
  `risk_items`, or add a `red_team_findings` table if separation is clearer)
- new `src/lib/pipeline/redteam.server.ts`

**Acceptance criteria.**
- Red team produces ≥1 challenge per critical claim and per headline financial assumption.
- Unresolved high-severity challenges block publication via quality gates.
- Output records which claims survived and which were weakened.
- Red team cannot see the private blueprint (it challenges customer claims, not internal
  plans).

**Tests.**
- Unit: challenge generation coverage; blocking rule.
- Integration: an intentionally fragile fixture analysis fails the gate.
- Security: red-team pass cannot read internal tables.

**Security constraints.** Adversarial content is data; schema-validated; no internal data
in scope.

**DoD.** Red team gates publication; fixtures prove blocking; tests green.

---

## TASK-011 — Market Intelligence

**Objective.** Produce market findings and competitor set from the evidence ledger.

**Dependencies.** TASK-010.

**Files/modules affected.**
- `supabase/migrations/0006_analysis_outputs.sql` (`market_findings`, `competitors`)
- new `src/lib/pipeline/market.server.ts`

**Acceptance criteria.**
- Every `market_findings` and `competitors` row references an evidence record (or is
  explicitly marked as an assumption, never as a finding).
- Market size statements carry confidence and are presented as ranges/estimates, never as
  facts.
- Competitor rows include positioning and at least one substantive strength/weakness.

**Tests.**
- Unit: evidence linkage required; assumption vs finding classification.
- Integration: a finding without evidence is rejected.
- Content: no absolute market-size claim without a confidence label.

**Security constraints.** Source-derived content is data; no internal methodology text in
outputs.

**DoD.** Outputs evidence-linked; tests green.

---

## TASK-012 — Financial Engine

**Objective.** Turn assumptions into transparent, traceable scenarios and calculations.

**Dependencies.** TASK-011.

**Files/modules affected.**
- `supabase/migrations/0006_analysis_outputs.sql` (`financial_assumptions`,
  `financial_scenarios`, `financial_calculations`)
- new `src/lib/pipeline/financial.server.ts` (calculation code, deterministic)

**Acceptance criteria.**
- Every calculation references a `formula_ref` and only assumptions present in
  `financial_assumptions`.
- Three scenarios (`konservativ`, `mittel`, `optimistisch`) exist, each labelled as a
  scenario, never a forecast or promise.
- Changing one assumption re-computes dependents deterministically (pure functions).
- No calculation reads client-supplied numbers.

**Tests.**
- Unit: formula correctness with fixture assumptions; determinism (same input ⇒ same
  output).
- Integration: unknown assumption key rejected; scenario set complete.
- Content: outputs contain no guaranteed-revenue phrasing.

**Security constraints.** Calculations are server-side pure functions; assumptions carry
`basis`; no external calls in the calculation step.

**DoD.** Deterministic, traceable scenarios; tests green.

---

## TASK-013 — Technical Feasibility

**Objective.** Assess buildability today, complexity, and dependencies.

**Dependencies.** TASK-012.

**Files/modules affected.**
- `supabase/migrations/0006_analysis_outputs.sql` (`technical_findings`)
- new `src/lib/pipeline/technical.server.ts`

**Acceptance criteria.**
- Each finding states area, complexity, `buildable_today`, and key dependencies.
- Claims about feasibility reference evidence or are marked as expert assumptions.
- Output asserts no delivery date or guaranteed capability.

**Tests.**
- Unit: complexity enum validation; evidence/assumption classification.
- Content: no unconditional "this is easy/cheap to build" phrasing.

**Security constraints.** No internal implementation playbook leaks into
`technical_findings` (that belongs to TASK-016).

**DoD.** Findings complete and disclaimered; tests green.

---

## TASK-014 — Risk Engine

**Objective.** Aggregate ranked risk items from evidence, verification, red team, market,
financial, and technical stages.

**Dependencies.** TASK-013.

**Files/modules affected.**
- `supabase/migrations/0006_analysis_outputs.sql` (`risk_items`)
- new `src/lib/pipeline/risk.server.ts`

**Acceptance criteria.**
- Risks are aggregated and de-duplicated across stages; each has likelihood, impact, and
  mitigation.
- Critical risks are flagged (`is_critical`) and referenced by quality gates.
- Every risk links to a claim or an evidence record where possible.

**Tests.**
- Unit: aggregation/dedupe; ranking; critical flag rules.
- Integration: a red-team challenge surfaces as a critical risk.

**Security constraints.** No internal scoring weights exposed in risk output.

**DoD.** Ranked risk set produced and linked; tests green.

---

## TASK-015 — Customer Report

**Objective.** Assemble the customer-facing report through an allow-list projection, then
publish through quality gates.

**Dependencies.** TASK-014.

**Files/modules affected.**
- `supabase/migrations/0007_reports.sql` (`customer_reports`,
  `customer_report_sections`)
- new `src/lib/pipeline/report.server.ts` (projection builder, `customer_report` stage)
- new `src/lib/report.functions.ts` (member reads)
- new `src/routes/_authenticated/reports/$reportId.tsx`

**Acceptance criteria.**
- Report is built by an explicit allow-list of fields/sections — never by deleting keys
  from an internal object.
- Only `status='published'` reports are readable by members; drafts and quality-blocked
  reports are service/admin only.
- Citations in sections resolve to `sources`/`evidence_records` owned by the same
  analysis.
- Report renders the required disclaimers (no profit promise, no legal advice, scenarios
  are scenarios).
- A report cannot be published while any quality gate fails.

**Tests.**
- Unit: projection allow-list (asserting a canary internal field never appears).
- Integration: publish blocked when gates fail; member read of a draft denied.
- Playwright: member views a published report with citations and disclaimers.
- Negative: another org's report id ⇒ 404/denied.

**Security constraints.** Two-trust-zone separation validated by test; no internal table
referenced by any member-facing query; report content is sanitized (Markdown rendered
with a safe renderer, no raw HTML).

**DoD.** Published reports correct and isolated; canary test green; disclaimers present.

---

## TASK-016 — Private VZG Build Blueprint

**Objective.** Generate the internal blueprint (architecture, module plan, delivery plan,
effort estimate) that is never customer-accessible.

**Dependencies.** TASK-015 (shares synthesis inputs; internal side of the split output).

**Files/modules affected.**
- `supabase/migrations/0008_private.sql` (`internal_build_blueprints`,
  `internal_pricing_inputs`, `internal_notes`, `prompt_versions`, `model_runs`,
  `vzg_scoring_rubrics` — RLS on, **no client policies**)
- new `src/lib/pipeline/blueprint.server.ts`
- new `src/lib/admin/blueprint.functions.ts` (admin-gated reads)

**Acceptance criteria.**
- Blueprint written in the same synthesis transaction as the customer report.
- `internal_build_blueprints` and friends return **zero rows** for anonymous and for any
  authenticated non-admin token.
- No customer-facing query, view, or RPC references these tables.
- `model_runs` captures model, prompt version, tokens, latency, cost, correlation id.

**Tests.**
- RLS: authenticated customer SELECT on every private table ⇒ denied/empty (explicit
  test per table).
- Unit: synthesis writes both outputs atomically; failure in one rolls back both.
- Grep/lint test: no member-facing module imports the private read helpers.

**Security constraints.** Deny-by-default RLS with no client policies; service role only
inside `*.server.ts`; prompts stored with versions and never exposed.

**DoD.** Private isolation proven by tests; atomic synthesis verified.

---

## TASK-017 — Offer Request

**Objective.** Let a customer request an implementation offer tied to a published
analysis, with an admin-side workflow.

**Dependencies.** TASK-016.

**Files/modules affected.**
- `supabase/migrations/0009_offers_payments_audit.sql` (`offer_requests`)
- new `src/lib/offer.functions.ts`
- new `src/routes/_authenticated/angebot.tsx`

**Acceptance criteria.**
- A member can create an offer request for an analysis in their own org only.
- Members see only their org's requests; status transitions by admins only.
- Any internal/administrative notes live in the private zone, not in a member-readable
  column.
- The existing generic inquiry form remains functional (inquiry delivery fix tracked in
  TASK-022).

**Tests.**
- Unit: status transition table; org scoping.
- Integration: member cannot read another org's request; member cannot change status.
- Playwright: request submitted from a published report.

**Security constraints.** No member-writable admin/status fields; internal notes private.

**DoD.** Offer flow works and is org-isolated; tests green.

---

## TASK-018 — Billing

**Objective.** Add real payment for paid analyses (€49), replacing status-only tracking.

**Dependencies.** TASK-017 and a decided payment provider.

**Files/modules affected.**
- `supabase/migrations/0009_offers_payments_audit.sql` (`payments`)
- new `supabase/migrations/00xx_billing_fn.sql` (settlement function, `payment_received`
  ledger entries)
- new `src/lib/billing.server.ts` (provider client, signature verification)
- new `src/routes/api/webhooks/payment.ts` (signed webhook, service role)
- new `src/routes/_authenticated/organisation.tsx` (billing UI)

**Acceptance criteria.**
- Checkout is created server-side for the org and a specific analysis/amount; the client
  cannot set the amount.
- Webhook verifies signature, matches amount/currency/org, is idempotent on
  `provider_payment_id`, and only then writes a `payments` row plus a
  `payment_received` ledger entry and updates `payment_status='bezahlt'`.
- Forged or replayed webhooks are rejected; failed payments do not change state.
- Org owners can see outstanding balance; members cannot change billing data.

**Tests.**
- Unit: signature verification; amount mismatch rejection; idempotency.
- Integration: forged payload ⇒ 4xx and no state change; duplicate event ⇒ single effect.
- E2E (test mode): checkout → webhook → analysis marked paid, ledger consistent.

**Security constraints.** Webhook is the only writer of `payments`; service role only;
no card data stored; all money mutations audited.

**DoD.** End-to-end paid flow verified in provider test mode; ledger reconciles; tests
green.

---

## TASK-019 — Admin Console

**Objective.** Server-guarded console for VZG staff: analyses, stage runs, quality-gate
overrides, offers, credits, blueprint access.

**Dependencies.** TASK-018.

**Files/modules affected.**
- new `src/routes/admin/*` (guarded)
- new `src/lib/admin/admin.functions.ts` (every handler re-verifies `is_vzg_admin()`)
- `src/routes/admin/route.tsx` (`beforeLoad` server-side admin check)

**Acceptance criteria.**
- Unauthenticated, non-admin, and non-confirmed users are denied on every admin route and
  server function (verified server-side, not client-side).
- Quality-gate override is possible, requires a reason, and writes an `audit_events` row.
- Staff can read private tables; customers still cannot.
- All admin mutations are audited with actor, entity, and before/after summary.

**Tests.**
- Security: non-admin calls to each admin serverFn ⇒ denied.
- Audit: override creates an audit row with reason.
- Isolation: customer token cannot read private tables even with an admin URL.

**Security constraints.** Roles from `app_metadata`/service-only table only; never
`user_metadata`; admin actions audited; no admin capability inferred client-side.

**DoD.** Console functional; denial tests green; overrides audited.

---

## TASK-020 — Security Hardening

**Objective.** Consolidate and verify all security controls end-to-end.

**Dependencies.** TASK-019.

**Files/modules affected.**
- `supabase/migrations/0011_rls.sql` (final policy review/exports)
- `eslint.config.js` (restricted imports for `client.server`)
- CI config (lint, typecheck, build, secret scan, bundle check)
- `docs/PROJECT_INT_SECURITY.md` (append verification evidence)

**Acceptance criteria.**
- Full RLS policy export reviewed; deny-by-default confirmed.
- Anonymous and cross-tenant probes documented with actual responses.
- Built client bundle verified to contain no service-role string.
- Billing-column tamper test: authenticated UPDATE rejected.
- Private-table probe as customer ⇒ zero rows, per table.
- Guest rate limits and public serverFn limits verified.
- Secret scanning in CI; `.env` no longer tracked.

**Tests.** The complete launch checklist from `PROJECT_INT_SECURITY.md` executed and
recorded, plus regression tests for every S1/S2 item.

**Security constraints.** This task is itself the control; no fix may be made silently
without a test.

**DoD.** Checklist fully executed with evidence; all S1/S2 items closed or explicitly
accepted with an owner and expiry date.

---

## TASK-021 — QA / E2E

**Objective.** Establish automated quality gates and end-to-end coverage of the whole
product.

**Dependencies.** TASK-020.

**Files/modules affected.**
- new `vitest.config.ts`, `playwright.config.ts`
- new `src/**/*.test.ts`, `e2e/*.spec.ts`
- `package.json` scripts (`test`, `test:e2e`, `typecheck`)
- CI workflow

**Acceptance criteria.**
- `lint`, `typecheck`, `build`, unit, and E2E all run in CI and are required.
- Existing lint debt cleared: 371 formatting errors fixed by Prettier, the single
  `prefer-const` fixed in coordination with Lovable; 6 `react-refresh` warnings either
  resolved or explicitly accepted.
- E2E covers: guest preview → signup → confirm → 3 free → 4th paid → report → offer.
- RLS test suite runs against a real database with multiple identities.

**Tests.** The suite itself; plus a deliberate-failure check to prove CI blocks on red.

**Security constraints.** Test fixtures must not use real customer data; test secrets in
CI only.

**DoD.** CI green from a clean checkout; coverage thresholds agreed and met.

---

## TASK-022 — Production Readiness

**Objective.** Ship safely: observability, ops, legal, and resilience.

**Dependencies.** TASK-021.

**Files/modules affected.**
- monitoring/alerting configuration
- `src/lib/inquiry.functions.ts` (durable fallback persistence + rate limit + CAPTCHA)
- legal pages (`impressum`, `datenschutz`, `agb`) — resolve `[LEGAL DATA REQUIRED]`
- runbooks under `docs/ops/`

**Acceptance criteria.**
- Inquiry submissions are never silently dropped (durable store + retry/monitoring).
- Alerts on: job queue depth, dead jobs, model spend, credit anomalies, webhook failures,
  auth anomaly volume.
- Legal pages complete (address, email, hosting, processors, retention, payment provider,
  supervisory authority, Google-Fonts consent decision).
- Backups and a tested restore path for the Supabase project.
- Rollback plan documented; feature flags for guest preview and paid analyses.

**Tests.** Restore drill; alert firing test; inquiry-retention test; smoke tests in
production.

**Security constraints.** No secrets in logs; retention enforced; DSGVO processor list
accurate.

**DoD.** Launch checklist signed off; runbooks published; alerts verified by a controlled
trigger.

---

## Implementation order summary

```
TASK-001  Guest Preview        (independent; may run in parallel with 002)
TASK-002  Organization Model
TASK-003  Credit Engine
TASK-004  Auth Hardening
TASK-005  Intake Wizard
TASK-006  Compliance State Machine
TASK-007  Research Job Engine
TASK-008  Evidence Ledger
TASK-009  Independent Verifier
TASK-010  Red Team
TASK-011  Market Intelligence
TASK-012  Financial Engine
TASK-013  Technical Feasibility
TASK-014  Risk Engine
TASK-015  Customer Report
TASK-016  Private VZG Build Blueprint
TASK-017  Offer Request
TASK-018  Billing
TASK-019  Admin Console
TASK-020  Security Hardening
TASK-021  QA / E2E
TASK-022  Production Readiness
```

Critical path: TASK-002 → 003 → 005 → 006 → 007 → 008 → 009 → 010 → 015 → 020.
Guest preview (TASK-001) is the highest-value early deliverable and has no dependencies.
