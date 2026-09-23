# VZG CONSULT — Current State Audit

Status: TASK-0 audit of `main` (audited commit: `b83b1e5` — "Added verified business accounts")
Audit branch: `feature/project-int-architecture`
Auditor: OpenHands agent, on behalf of the repository owner.

This document is a verified snapshot of what exists today. It deliberately does **not**
propose fixes; proposed fixes live in the other `PROJECT_INT_*` documents.

Claims below are labelled with an evidence class:

- **VERIFIED** — observed directly in code, in the build, or by read-only probe of the live
  Supabase project.
- **PARTIAL** — some evidence exists but the important half cannot be confirmed from this
  repository.
- **UNKNOWN** — cannot be confirmed without Supabase dashboard / SQL access. Treat as
  untrusted until verified.
- **MISSING** — no implementation exists.

Nothing is marked WORKING merely because code exists.

---

## 1. Framework and versions (VERIFIED)

| Item | Value |
| --- | --- |
| Meta-framework | TanStack Start `1.168.32` |
| Router | TanStack Router `1.170.18` (file-based routing) |
| UI | React `19.2.0`, React DOM `19.2.0` |
| Build | Vite `8.1.5`, Nitro `3.0.260603-beta` (Cloudflare worker target) |
| Styling | Tailwind CSS `4.2.1` via `@tailwindcss/vite` |
| Data fetching | TanStack Query `5.101.1` |
| Forms | react-hook-form `7.71.2` + `@hookform/resolvers` + zod `3.25.76` |
| Backend | Supabase JS `2.116.0` (Lovable Cloud managed) |
| Package manager | `bun.lock` present; `bunfig.toml` sets a 24h supply-chain guard |
| Language | TypeScript `5.8.3`, `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` |
| Hosting config | `@lovable.dev/vite-tanstack-config` wrapper; Nitro auto-detects Cloudflare |
| Lint/format | ESLint 9 flat config + Prettier |

The app is deployed as a Cloudflare worker (`nitro` generates `.output/server/wrangler.json`).

## 2. Routing architecture (VERIFIED)

File-based routes under `src/routes/`:

| Route file | URL | Notes |
| --- | --- | --- |
| `__root.tsx` | app shell | Header/Footer/Toaster, `<Outlet/>`, SEO head |
| `index.tsx` | `/` | Marketing home, Project Intelligence teaser block |
| `services.tsx` | `/services` | Marketing |
| `horizon.tsx` | `/horizon` | Marketing (HORIZON product) |
| `projects.tsx` | `/projects` | Marketing |
| `about.tsx` | `/about` | Marketing |
| `contact.tsx` | `/contact` | Inquiry form; `?intent=project-intelligence` variant |
| `project-intelligence.tsx` | `/project-intelligence` | **Marketing page only** |
| `impressum.tsx`, `datenschutz.tsx`, `agb.tsx` | legal | contain `[LEGAL DATA REQUIRED]` placeholders |
| `auth.tsx` | `/auth` | Sign-up / sign-in (client-side Supabase) |
| `_authenticated/route.tsx` | layout | `ssr: false`, redirects if no user |
| `_authenticated/konto.tsx` | `/konto` | Business account dashboard |

`src/routeTree.gen.ts` is generated; do not hand-edit.

## 3. Server / client separation (VERIFIED)

- `src/start.ts` — registers `attachSupabaseAuth` as a global `functionMiddleware`
  (attaches bearer token to serverFn RPCs on the client) and `errorMiddleware` +
  `createCsrfMiddleware` (scoped to `serverFn`) as request middleware. CSRF protection
  is present.
- `src/server.ts` — SSR error wrapper around the TanStack server entry.
- `*.functions.ts` — `createServerFn` handlers (`account.functions.ts`,
  `inquiry.functions.ts`). These are shipped in the client bundle, so they must never
  import `client.server.ts` at top level.
- `client.ts` — browser/SSR Supabase client using the **publishable** key only.
- `client.server.ts` — service-role admin client, bypasses RLS. Reads
  `SUPABASE_SERVICE_ROLE_KEY` from `process.env` (server only). Currently **imported by
  nothing** — dead code, but a future foot-gun.
- `auth-middleware.ts` — `requireSupabaseAuth` verifies the bearer JWT via
  `supabase.auth.getClaims()` and injects a **user-scoped** Supabase client plus
  `userId`/`claims` into serverFn context. RLS applies to those queries.
- `cron-auth.ts` — constant-time bearer-secret check for cron endpoints
  (`LOVABLE_CRON_SECRET`). Not currently wired to any route.

## 4. Authentication (VERIFIED, with gaps)

- Email + password only. Google/other providers are disabled in the live project
  (`external.email=true`, all others false).
- Anonymous sign-in is disabled (`anonymous_users=false`) — good.
- `mailer_autoconfirm=false` — email confirmation is genuinely required at the auth layer.
- `createAnalysis` re-checks `userData.user.email_confirmed_at` server-side before insert.
  This is a real server-side gate (VERIFIED).
- `_authenticated/route.tsx` uses `supabase.auth.getUser()` client-side and `ssr: false`;
  this is a UX redirect, **not** a security boundary. The actual boundary is RLS +
  `requireSupabaseAuth`.
- No password-reset UI, no resend-confirmation UI, no email-change flow (MISSING).
- No MFA, no session revocation, no login throttling/lockout (MISSING).
- `signUp` writes `full_name`, `company`, `country` into Supabase `user_metadata`
  (client-controlled). These are copied into `profiles` on first dashboard load. Because
  the values originate from client-supplied `user_metadata`, they must be treated as
  untrusted display data, never as authorization inputs.

## 5. Supabase integration (VERIFIED)

- Live project id: `kytwfxgcafgojynvjrof` (matches `supabase/config.toml`).
- Keys in `.env`: `SUPABASE_*` and `VITE_SUPABASE_*` — publishable key only. No service
  role key in the repo.
- Read-only probes against the live project:
  - anonymous `SELECT` on `profiles` / `analyses` → `HTTP 200 []` (RLS filters rows).
  - anonymous `INSERT` into `profiles` / `analyses` → `HTTP 401`, Postgres `42501`
    "new row violates row-level security policy". **RLS is enabled on both tables.**
  - `GET /rest/v1/` (OpenAPI) with publishable key → `401` (introspection locked down).
- Tables that exist: `public.profiles`, `public.analyses` (confirmed by probing live).
- Tables that do **not** exist (probed `404 PGRST205`): `organizations`,
  `organization_members`, `analysis_credits`, `credit_transactions`, `credit_ledger`,
  `credits`, `analysis_answers`, `analysis_reports`, `reports`, `evidence_records`,
  `customer_reports`, `internal_build_blueprints`, `payments`, `offer_requests`,
  `profiles_private`, `audit_logs`, `admin_users`, `vouchers`, `promo_codes`,
  `users`, `inquiries`, `inquiry_requests`, `leads`, `contacts`.
- `drizzle/schema.ts` is intentionally blank; `drizzle/migrations/meta/_journal.json` has
  zero entries; no `.sql` files anywhere. **All database structure is managed outside
  this repository (Lovable Cloud / Supabase dashboard).**

## 6. Database types / schema (PARTIAL)

`src/integrations/supabase/types.ts` is auto-generated and declares exactly two tables:

```
profiles(id uuid PK, email text, full_name text, company text, country text,
         free_credits_granted int, created_at timestamptz, updated_at timestamptz)

analyses(id uuid PK, user_id uuid, title text, idea text, target_group text,
         assumptions text, status text, billing_kind text, payment_status text,
         amount_cents int, created_at timestamptz, updated_at timestamptz)
```

These are plain `text`/`int` columns with **no enums and no CHECK constraints in the
generated types**. The generated types cannot show defaults, triggers, or policies —
those are **UNKNOWN** and are the single most important thing to verify before building
on top of this.

## 7. Environment handling (VERIFIED)

- `.env` is committed to Git and **not** in `.gitignore` (`.gitignore` covers logs,
  `node_modules`, `dist`, `.output`, `.wrangler`, `.dev.vars`, editor files — but not
  `.env`).
- Only publishable (anon) keys and the project id are present. No service-role key, no
  third-party API keys. Git history for `.env` shows a single commit and contains no
  service-role material.
- Server-only secrets (`SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_CRON_SECRET`,
  `INQUIRY_WEBHOOK_URL`, `LOVABLE_DB_MIGRATION_URL`) are expected from the environment
  but are **not present in the repo**. `INQUIRY_WEBHOOK_URL` is currently unset in this
  environment, so inquiries are logged and dropped (see §12).

## 8. Existing business-account implementation (PARTIAL)

`src/routes/auth.tsx` + `src/routes/_authenticated/konto.tsx` +
`src/lib/account.{schema,functions}.ts` implement:

- sign-up form (name, company, country, email, password) → `supabase.auth.signUp`
- email-confirmation interstitial
- sign-in form → `supabase.auth.signInWithPassword`
- dashboard: status, free analyses remaining, open amount, submission form, history list

Evidence class: the UI and the serverFn plumbing are real (VERIFIED). Whether the
*account model* behaves correctly depends on database-side behaviour that cannot be seen
from the repo (PARTIAL/UNKNOWN).

## 9. Analysis-credit implementation (PARTIAL — key finding)

`createAnalysis` (VERIFIED) does exactly one thing before insert: it checks
`email_confirmed_at`. It does **not** count prior analyses, does **not** compare against
`free_credits_granted`, and does **not** set `billing_kind`, `payment_status`, or
`amount_cents`. The code comment claims "the database decides whether it consumes one of
the free credits or is billed at 49,00 €" — but **no trigger, function, or default is
present anywhere in this repository**. `ANALYSIS_PRICE_CENTS = 4900` and
`FREE_ANALYSES = 3` are declared in `account.schema.ts` but `ANALYSIS_PRICE_CENTS` is
never used server-side; `FREE_ANALYSES` is only used as a *display fallback* when
`profiles.free_credits_granted` is null.

Free-credit remaining is computed in `getAccountOverview` as
`freeTotal - count(analyses where billing_kind='frei' and status != 'storniert')`.
This is a **read-model calculation in application code, not a credit ledger**, and it
depends entirely on `billing_kind` having been set correctly at insert time by something
outside the repo.

⇒ **Free-analysis enforcement is UNKNOWN and must be treated as unenforced until proven
otherwise.** This is the highest-priority item in this audit.

## 10. Current €49 status logic (VERIFIED as "tracking only")

- €49 appears in `agb.tsx`, `auth.tsx`, `index.tsx`, `project-intelligence.tsx` as
  marketing copy, and in `konto.tsx` as a label.
- There is **no payment provider integration, no checkout, no webhook, no invoice
  generation, no `payments` table**. `payment_status` values used by the UI are
  `nicht_erforderlich`, `offen`, `bezahlt`; only `offen` is produced by any code in the
  repo (and even that only via a database default).
- €49 is therefore **status tracking only**. No money can move today.

## 11. Existing Project Intelligence UI (PARTIAL)

- `/project-intelligence` is a **static marketing page**: 11 declared dimensions, a
  4-step process, pricing box, and a transparency disclaimer that internal methodology is
  confidential. There is **no analysis application, no wizard, no output artefact**.
- `/contact?intent=project-intelligence` shows a "Frühzugang" (early-access) variant that
  posts an inquiry. Its own copy says "Die interaktive Anwendung wird derzeit
  vorbereitet" — i.e. the product does not exist yet.
- `/auth` and `/konto` are the only functional, data-backed parts of the product.
- Guest preview: **MISSING**.

## 12. Forms and server functions (VERIFIED)

| Function | File | Auth | Validation | Persistence |
| --- | --- | --- | --- | --- |
| `getAccountOverview` | `account.functions.ts` | `requireSupabaseAuth` | n/a (GET) | lazily inserts `profiles` |
| `createAnalysis` | `account.functions.ts` | `requireSupabaseAuth` | zod `analysisSchema` | inserts `analyses` |
| `submitInquiry` | `inquiry.functions.ts` | **none (public)** | zod `inquirySchema` | forwards to `INQUIRY_WEBHOOK_URL` or logs |

- `inquiry.functions.ts` is an unauthenticated POST endpoint. With `INQUIRY_WEBHOOK_URL`
  unset it returns `{ok:true, delivered:false}` and only `console.info`s — i.e. **contact
  requests are silently accepted and lost**. There is no rate limit and no CAPTCHA.
- Both serverFns use the deprecated `createServerFn().inputValidator()` (build warning).
  Cosmetic today, but it will break on a future TanStack major.

## 13. Security model (summary — full detail in `PROJECT_INT_SECURITY.md`)

Present and good: RLS enabled on both tables; email confirmation enforced at both auth
and application layers; CSRF middleware on serverFns; JWT verification server-side
(`getClaims`); service-role key kept out of the client bundle; constant-time secret
comparison for cron auth; no secrets leaked in git history.

Absent or unverifiable: any real credit/billing enforcement; per-organization billing;
atomic credit consumption; payment verification; admin role separation; audit logging;
rate limiting; CAPTCHA on the public inquiry endpoint; column-level protection of billing
fields; test coverage.

## 14. Current navigation and account pages (VERIFIED)

Header nav: Leistungen, HORIZON, Project Intelligence, Projekte, Über VZG, plus a
"Projekt besprechen" CTA to `/contact`. There is **no visible link to `/auth` or
`/konto`** in the header or footer — the account area is reachable only by direct URL.
This is a product gap, not a bug.

Legal pages contain unresolved `[LEGAL DATA REQUIRED]` placeholders for address, email,
hosting provider, payment processor, retention periods, etc.

## 15. Findings matrix

| Area | Status | Evidence |
| --- | --- | --- |
| Marketing site (home, services, horizon, projects, about, legal shell) | **WORKING** | VERIFIED (build + code) |
| SEO head / structured data / per-route metadata | **WORKING** | VERIFIED |
| CSRF protection on serverFns | **WORKING** | VERIFIED (`start.ts`) |
| JWT verification + user-scoped Supabase in serverFns | **WORKING** | VERIFIED (`auth-middleware.ts`) |
| RLS enabled on `profiles`, `analyses` | **WORKING** | VERIFIED (live 401 on anon insert) |
| Email signup / signin | **WORKING** | VERIFIED (code + live auth settings) |
| Email confirmation enforced | **WORKING** | VERIFIED (`mailer_autoconfirm=false` + server check) |
| Business account dashboard | **WORKING** | VERIFIED (code; data path depends on RLS policies) |
| Submission history list | **WORKING** | VERIFIED |
| Free-credit enforcement (3 free analyses) | **UNKNOWN → treat as MISSING** | No enforcement in repo; DB side unverifiable |
| €49 billing | **MOCK** | Status-string only; no payment provider |
| Race-condition safety on credit consumption | **MISSING** | No locking/atomicity |
| Organization model | **MISSING** | Table absent (live 404) |
| Credit ledger / transactions | **MISSING** | Tables absent |
| Guest preview analysis | **MISSING** | No route, no function |
| Full analysis pipeline (research → report) | **MISSING** | No stages, no jobs, no tables |
| Private VZG blueprint / internal isolation | **MISSING** | No tables, no policy |
| Offer request workflow | **PARTIAL** | Only a generic contact form |
| Payment integration | **MISSING** | No provider, no webhook |
| Admin console / roles | **MISSING** | No role table, no claims check |
| Audit logging | **MISSING** | None |
| Rate limiting / abuse protection | **MISSING** | None |
| Inquiry delivery | **BROKEN** | `INQUIRY_WEBHOOK_URL` unset → requests dropped |
| Automated tests | **MISSING** | No test runner, no specs |
| `.env` hygiene | **SECURITY RISK (low)** | `.env` tracked, not gitignored |
| Billing columns writable by client? | **SECURITY RISK (unknown, high impact)** | RLS policy unknown; no column grants visible |
| Unauthenticated public serverFn | **SECURITY RISK (medium)** | `submitInquiry`, no rate limit |

## 16. Remaining unknowns (must be resolved in Supabase dashboard)

1. Actual RLS **policies** on `profiles` and `analyses` (SELECT/INSERT/UPDATE/DELETE, per
   role, `USING`/`WITH CHECK` expressions). Anon insert is blocked; nothing else is proven.
2. Whether authenticated users may `UPDATE` their own `analyses` row — and if so, whether
   `billing_kind`, `payment_status`, `amount_cents` are writable by them (credit/payment
   manipulation vector).
3. Defaults, triggers, and CHECK constraints on `analyses` and `profiles` — specifically
   what sets `billing_kind`, `payment_status`, `amount_cents`, and `status`.
4. Whether any function/trigger counts prior analyses when assigning free vs paid.
5. Whether `profiles.free_credits_granted` is server-controlled or user-writable.
6. Email templates / SMTP provider and whether confirmation emails are actually delivered.
7. Storage buckets and their policies (none referenced in code).
8. Whether Lovable Cloud exposes environment secrets to the worker at runtime
   (`SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_CRON_SECRET`).
9. Deployment settings (custom domain, preview/production split) and whether `/konto` is
   intended to be publicly linked.

## 17. Test / build results

See §"Test & Build Results" in the final report; raw results:

- `npm install` — success (exit 0).
- `npx tsc --noEmit` — **success, 0 errors**.
- `npm run build` — **success, exit 0** (2063 modules; Nitro/Cloudflare worker output).
  Warnings: two deprecation notices for `inputValidator()`, one chunk-size warning, one
  `inlineDynamicImports` warning.
- `npm run lint` — **FAIL, exit 1: 378 problems (372 errors, 6 warnings)**. 371 of the
  errors are `prettier/prettier` formatting; 1 is a genuine `prefer-const` error in
  `src/integrations/supabase/previewAuthStorage.ts:38`; 6 are `react-refresh`
  warnings about non-component exports.
- Automated tests — **none exist**.

This means the repository currently cannot pass its own `lint` gate. Note that
`previewAuthStorage.ts` is a generated Lovable file; fixing the `prefer-const` there
should be coordinated with Lovable rather than done silently.
