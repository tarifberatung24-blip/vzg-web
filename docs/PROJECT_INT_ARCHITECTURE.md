# VZG Project Intelligence — Architecture

Status: **Locked architecture for TASK-0.** Nothing in this document is implemented yet.
Implementers must follow the document; deviations need an explicit decision note in
`docs/PROJECT_INT_BUILD_PLAN.md`.

Audience: an implementation agent working incrementally on top of the existing
VZG CONSULT TanStack Start + Supabase application.

---

## 1. Guiding principles

1. **The database is the security boundary.** Every authorization rule must be enforced
   by RLS policies and database functions. Frontend hiding is never sufficient.
2. **Customer output and private VZG output never share a table.**
3. **Credits are money.** Consumption is transactional, append-only, and auditable.
4. **Nothing expensive runs for a guest.** Guest preview is cheap, capped, and cached.
5. **Every result is traceable.** Any claim in a report can be traced to an evidence
   record and a source.
6. **No destructive migrations.** Additive columns, back-fills, and deprecation windows.
7. **No secrets in the client bundle.** `*.server.ts` only, never imported by
   `*.functions.ts` at top level.
8. **Lovable sync stays intact.** Normal commits to a feature branch only; never rewrite
   published history.

## 2. Actors and trust zones

| Actor | Trust zone | Can reach |
| --- | --- | --- |
| Guest | anonymous, internet | `POST /api/preview/*` (rate-limited) |
| Authenticated user | Supabase JWT (verified) | own profile, own org membership |
| Business organization member | JWT + `organization_members` row | org analyses, reports, offers |
| Organization owner/admin | JWT + role `owner`/`admin` | member management, billing for the org |
| VZG admin | JWT + JWT claim `app_role = 'vzg_admin'` | internal tables, admin console |
| Service | server-only service-role key / cron secret | pipeline jobs, webhooks |

**Decision: billing is tied to the *organization*, not the user.** The required product
model ("business account", "3 analyses free", "€49 per additional analysis") is a company
relationship. A user belongs to one or more organizations; credits live on the
organization. This also prevents trivial multi-account credit farming being invisible.

## 3. Customer / private output separation

Two physically separate storage areas:

| | Customer-facing | Private VZG |
| --- | --- | --- |
| Tables | `customer_reports`, `customer_report_sections` | `internal_build_blueprints`, `internal_pricing_inputs`, `internal_notes`, `prompt_versions`, `vzg_scoring_*`, `model_runs` |
| RLS | member SELECT of own org's rows | **no policy for authenticated/anon roles at all** |
| Access | JWT with org membership | service role only, or `vzg_admin` claim |
| Generation | written by the pipeline as a projection of internal results | generated internally, never projected to customer |

Key rules:

- The private tables have RLS enabled **and zero policies** for `anon`/`authenticated`.
  That is the strongest default: no policy ⇒ no access. Only the service role bypasses.
- No view, function, or RPC exposes private columns. A view that joins internal and
  customer data must be `security_invoker = true` and must not be granted to
  `authenticated`.
- The synthesis stage writes both a customer projection and a private blueprint, in one
  transaction, from the same internal data. The customer projection is built by an
  allow-list projection function, never by "delete fields from the internal object".
- Model prompts, orchestration code, scoring weights, and research plans are server-side
  modules (`*.server.ts`) and never appear in any database row readable by a customer.

## 4. Public flow (Guest Preview)

```
Visitor
  → /project-intelligence  (marketing, existing)
  → "Idee prüfen" (new guest wizard, no account)
  → POST guest preview request (cheap path)
  → PREVIEW analysis rendered in-page (ephemeral + cached by fingerprint)
  → immediate value shown, then CTA to create Business Account
```

Guest preview characteristics:

- **Does not consume a full analysis credit.** It never writes to
  `credit_transactions` and never creates an `analyses` row in the paid lifecycle.
- Uses a single low-cost model call over a short, fixed prompt with **no external
  research** and **no long-running jobs**.
- Hard-capped: input length, one preview per idea fingerprint per time window, and a
  per-IP/per-fingerprint quota.
- Stores only a preview record (`guest_previews`) with a hashed identifier and TTL.
  No account required, minimal personal data.

Guest preview content (allow-list, all clearly labelled "vorläufig"):

1. Initial compliance signal (red/amber/green, with reasons, **not legal advice**)
2. Basic business-model understanding (problem, customer, value, revenue shape)
3. Basic technical feasibility (buildable today? which rough building blocks?)
4. Key risks (top 3–5, ranked)
5. Monetization hypothesis (plausible pricing mechanism, no numbers promised)

Guest preview must **not**:

- run expensive/deep research or generate a full evidence report
- expose VZG internal methodology, scoring, prompts, or orchestration
- promise profits, revenue, or outcomes
- give definitive legal, tax, or regulatory advice

Output is rendered as a structured preview object, not a PDF report.

## 5. Full analysis pipeline

```
INTAKE
  ↓
COMPLIANCE SCREENING          (can stop / route to manual review)
  ↓
DECOMPOSE                     (idea → claims, questions, hypotheses)
  ↓
SOURCE PLAN                   (what evidence would settle each question)
  ↓
EVIDENCE RESEARCH             (jobs, external sources)
  ↓
EVIDENCE LEDGER               (append-only claims ↔ sources)
  ↓
INDEPENDENT VERIFICATION      (separate agent, different prompt/model)
  ↓
RED TEAM                      (adversarial: attack the strongest claims)
  ↓
MARKET ANALYSIS
  ↓
BUSINESS MODEL
  ↓
FINANCIAL ENGINE              (assumptions → scenarios → calculations)
  ↓
TECHNICAL FEASIBILITY
  ↓
RISK ANALYSIS
  ↓
SYNTHESIS                     (customer projection + private blueprint)
  ↓
QUALITY GATES                 (block publish if gates fail)
  ↓
CUSTOMER REPORT               ────────────► customer_reports (member-readable)
PRIVATE VZG BUILD BLUEPRINT   ────────────► internal_build_blueprints (service-only)
```

Pipeline mechanics:

- Each stage is a row in `analysis_stage_runs` with `status`, `attempt`, `input_ref`,
  `output_ref`, `model_run_id`, timings and error.
- Stages are idempotent and resumable: a failed stage can be retried without re-running
  completed stages.
- Long stages run as **jobs** (`analysis_jobs` / cron endpoints authenticated by
  `cron-auth.ts`), not inside a user HTTP request.
- Every stage writes structured artefacts, never free-form HTML.
- Quality gates are hard blockers: a report cannot be published unless gates pass, or a
  `vzg_admin` explicitly overrides — and an override is itself auditable.

## 6. Access model (target)

| Capability | Guest | Customer (member) | Org owner | VZG admin | Service |
| --- | --- | --- | --- | --- | --- |
| Run guest preview | ✅ (quota) | ✅ | ✅ | ✅ | ✅ |
| Create full analysis | ❌ | ✅ | ✅ | ✅ | ✅ |
| Read own org analyses | ❌ | ✅ | ✅ | ✅ | ✅ |
| Read customer reports | ❌ | ✅ (own org) | ✅ | ✅ | ✅ |
| Invite/remove members | ❌ | ❌ | ✅ | ✅ | ✅ |
| Manage org billing | ❌ | ❌ | ✅ | ✅ | ✅ |
| Create offer request | ❌ | ✅ | ✅ | ✅ | ✅ |
| Read/act on offer requests | ❌ | own only | own only | ✅ | ✅ |
| Read internal blueprints | ❌ | **never** | **never** | ✅ | ✅ |
| Read pricing inputs / scoring / prompts | ❌ | **never** | **never** | ✅ | ✅ |
| Override quality gates | ❌ | ❌ | ❌ | ✅ | ✅ |

Customer must **never** access: `internal_build_blueprints`, `internal_pricing_inputs`,
system prompts, model orchestration logic, private admin notes, VZG scoring methodology,
or VZG internal project-generation logic.

Enforcement rules:

- RLS on every customer table, keyed by `organization_id` and membership via a
  `security definer` helper `is_org_member(org uuid)` (avoids recursive policy lookups).
- `is_vzg_admin()` reads `app_role` from the verified JWT (`app_metadata`), never from a
  table the user can edit.
- `app_metadata` is server-only in Supabase; never use `user_metadata` for roles.
- All writes that affect money or lifecycle go through server functions or database
  functions, never direct client `INSERT`/`UPDATE`.

## 7. Credit engine design

Requirements as agreed:

- 3 full analyses free per business organization
- every later full analysis is recorded as €49 **open** (status tracking)
- guest preview consumes nothing
- users cannot manipulate credits from the frontend
- safe under concurrent requests

Design:

- `analysis_credits` — one row per organization with `free_granted` and counters, or a
  materialized balance derived from the ledger. Prefer **ledger-derived balance** as the
  source of truth and keep an optional cached balance for reads.
- `credit_transactions` — **append-only** ledger: `organization_id`, `analysis_id`,
  `kind` (`grant`, `consume_free`, `charge_paid`, `refund`, `adjust`), `amount_cents`,
  `balance_after`, `actor`, `created_at`. Immutable via RLS (no `UPDATE`/`DELETE` policy).
- Consumption is a **single database function** `create_full_analysis(...)` executed in
  one transaction:
  1. verify caller is a member of the org (`is_org_member`)
  2. verify email confirmed
  3. `SELECT ... FOR UPDATE` on the org's credit row to serialize concurrent calls
  4. insert `analyses` + `credit_transactions` atomically
  5. return the new analysis with `billing_kind` (`frei` | `paid`) and `payment_status`
- Concurrency: the row lock in step 3 makes "two simultaneous requests both get the last
  free credit" impossible. Belt-and-braces: a unique partial index preventing more than
  `free_granted` `consume_free` rows per organization.
- Client never sends `billing_kind`, `payment_status`, or `amount_cents`. Server
  functions must not accept them as input; RLS must forbid `UPDATE` of those columns by
  `authenticated` (column-level `GRANT`/policy design).

## 8. Migration strategy from today's model

Today: `profiles` (1 row per user) + `analyses` (owned by `user_id`, with inline billing
columns). Target: organization-centric with a normalized ledger.

Non-destructive plan:

1. **Add, don't replace.** Create `organizations`, `organization_members`,
   `analysis_credits`, `credit_transactions` alongside existing tables.
2. **Back-fill.** For each existing `profiles` row, create a personal organization with
   that user as `owner`, `free_granted = free_credits_granted`. Idempotent and re-runnable.
3. **Dual-write window.** New code writes `organization_id` on `analyses` while
   `user_id` remains (nullable later). Reads prefer `organization_id`, fall back to
   `user_id` for legacy rows.
4. **Back-fill `analyses.organization_id`** from the owner's personal organization, and
   derive `credit_transactions` from existing free/paid rows so balances reconcile.
5. **Verify** reconciliation (free-used count per org equals ledger) before switching
   reads.
6. **Deprecate, then drop (later task, not TASK-0).** `analyses.user_id` and
   `profiles.free_credits_granted` become unused. Dropping them requires a separate
   approved task with a backup.

Never: rename/drop a column another agent or Lovable might still reference; never
`DROP TABLE`; never edit already-applied migrations.

Because migrations live outside the repo (Lovable Cloud), all migrations must be
delivered as **ordered, idempotent SQL files committed under `supabase/migrations/`** so
another agent (or the owner in the dashboard) can apply them deterministically. This is
an addition to the repo, not a change to Lovable's sync.

## 9. Proposed route / module layout (target, not built)

```
src/routes/
  projekt-check.tsx              guest preview wizard (public)
  _authenticated/
    konto.tsx                    existing dashboard (extend: org, credits, history)
    analysen/index.tsx           list
    analysen/$analysisId.tsx     detail (stages, status)
    reports/$reportId.tsx        customer report
    angebot.tsx                  offer request
    organisation.tsx             org settings, members, billing
  admin/                         vzg admin console (guarded)
src/lib/
  account.functions.ts           existing, extended
  credits.functions.ts           credit engine entry points (server)
  preview.functions.ts           guest preview (server, public, rate-limited)
  analysis.functions.ts          full analysis lifecycle (server)
  report.functions.ts            customer report reads
  offer.functions.ts             offer requests
  *.server.ts                    pipeline stages, providers, prompts (server-only)
supabase/migrations/             ordered SQL
```

## 10. Observability and audit

- `audit_events` — append-only, for: credit changes, billing changes, membership changes,
  admin overrides, report publication, auth anomalies. Written by server/DB functions.
- `model_runs` — one row per model call: purpose, model, prompt_version, tokens, latency,
  cost, correlation id. Private.
- Correlation id threaded from analysis → stage run → job → model run, so a customer
  report can be traced end-to-end internally without exposing internals.

## 11. Non-goals for TASK-0

No pipeline implementation, no new routes, no new tables created, no changes to existing
application behaviour. TASK-0 delivers the audit, the locked architecture, the data model,
the security model, and the task breakdown.
