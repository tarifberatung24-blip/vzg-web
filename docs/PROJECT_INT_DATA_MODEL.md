# VZG Project Intelligence — Data Model

Status: **Recommended schema for TASK-0.** No tables are created in this task.
All DDL below is a *proposal*, expressed so it can be split into ordered, idempotent
migrations. Nothing here may be applied destructively to existing data.

Conventions used throughout:

- `id uuid primary key default gen_random_uuid()`
- `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()`
- Status columns are `text` with explicit `CHECK` constraints (not Postgres enums) so
  values can evolve without `ALTER TYPE` locking. Enums are revisited only if needed.
- Every customer-scoped table carries `organization_id uuid not null references organizations(id)`.
- RLS is enabled on every table in `public`. Default is **deny** (no policy ⇒ no access).
- The service role bypasses RLS; it is used only from `*.server.ts`.

---

## 1. Identity and accounts

### profiles (exists — keep, do not drop)

Today's table stays. Add columns additively:

```
alter table profiles
  add column if not exists default_organization_id uuid references organizations(id),
  add column if not exists locale text not null default 'de',
  add column if not exists onboarded_at timestamptz;
```

`free_credits_granted` becomes legacy after migration; do not drop in the migration task.

### organizations (new)

```
id uuid pk
name text not null
legal_name text
country text not null default 'DE'
vat_id text
billing_email text
billing_address jsonb
created_by uuid references auth.users(id)
created_at, updated_at timestamptz
```

Billing is attached here, not to a user.

### organization_members (new)

```
id uuid pk
organization_id uuid not null references organizations(id) on delete cascade
user_id uuid not null references auth.users(id) on delete cascade
role text not null check (role in ('owner','admin','member')) default 'member'
status text not null check (status in ('invited','active','removed')) default 'active'
invited_by uuid, invited_at timestamptz, joined_at timestamptz
created_at, updated_at timestamptz
unique (organization_id, user_id)
```

Helper used by all org policies:

```
create or replace function is_org_member(org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from organization_members m
    where m.organization_id = org and m.user_id = auth.uid()
      and m.status = 'active'
  );
$$;
```

`security definer` is required to avoid recursive RLS evaluation on
`organization_members`; the function must have a fixed `search_path`.

### Staff / VZG admin

Roles live in **JWT `app_metadata.app_role`** (server-set, not user-editable), read via
`is_vzg_admin()`:

```
create or replace function is_vzg_admin() returns boolean
language sql stable as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'app_role') = 'vzg_admin', false);
$$;
```

Never derive admin from a table the user can write.

## 2. Credits and billing

### analysis_credits (new)

One row per organization; the row that is locked during consumption.

```
id uuid pk
organization_id uuid not null unique references organizations(id) on delete cascade
free_granted int not null default 3 check (free_granted >= 0)
free_consumed int not null default 0 check (free_consumed >= 0)
free_remaining int generated always as (greatest(free_granted - free_consumed, 0)) stored
paid_unbilled_cents int not null default 0 check (paid_unbilled_cents >= 0)
currency text not null default 'EUR'
price_per_analysis_cents int not null default 4900
created_at, updated_at timestamptz
```

### credit_transactions (new, append-only)

Source of truth for credit history. **No UPDATE/DELETE policy for any client role.**

```
id uuid pk
organization_id uuid not null references organizations(id)
analysis_id uuid references analyses(id)
kind text not null check (kind in
    ('grant','consume_free','charge_paid','refund','adjust','payment_received'))
amount_cents int not null default 0
free_delta int not null default 0
balance_after_free int
actor_user_id uuid
reason text
correlation_id uuid
created_at timestamptz not null default now()
```

### consumption function (new)

The only sanctioned path to create a full analysis:

```
create or replace function create_full_analysis(
  p_org uuid, p_title text, p_idea text, p_target_group text, p_assumptions text
) returns analyses
language plpgsql security definer set search_path = public as $$
declare
  v_credit analysis_credits;
  v_kind   text;
  v_price  int;
  v_row    analyses;
begin
  if not is_org_member(p_org) then
    raise exception 'not a member of organization';
  end if;
  if not exists (select 1 from auth.users u
                 where u.id = auth.uid() and u.email_confirmed_at is not null) then
    raise exception 'email not confirmed';
  end if;

  select * into v_credit from analysis_credits
    where organization_id = p_org for update;      -- serializes concurrent calls

  if v_credit.free_consumed < v_credit.free_granted then
    v_kind := 'frei'; v_price := 0;
    update analysis_credits
       set free_consumed = free_consumed + 1, updated_at = now()
     where id = v_credit.id;
  else
    v_kind := 'paid'; v_price := v_credit.price_per_analysis_cents;
    update analysis_credits
       set paid_unbilled_cents = paid_unbilled_cents + v_price, updated_at = now()
     where id = v_credit.id;
  end if;

  insert into analyses (user_id, organization_id, title, idea, target_group,
                        assumptions, status, billing_kind, payment_status, amount_cents)
  values (auth.uid(), p_org, p_title, p_idea, coalesce(p_target_group,''),
          coalesce(p_assumptions,''), 'eingereicht', v_kind,
          case when v_kind = 'paid' then 'offen' else 'nicht_erforderlich' end,
          v_price)
  returning * into v_row;

  insert into credit_transactions (organization_id, analysis_id,
        kind, amount_cents, free_delta, actor_user_id)
  values (p_org, v_row.id,
        case when v_kind = 'paid' then 'charge_paid' else 'consume_free' end,
        v_price, case when v_kind = 'paid' then 0 else -1 end, auth.uid());

  insert into audit_events (organization_id, actor_user_id, event_type, entity, entity_id, data)
  values (p_org, auth.uid(), 'analysis.created', 'analyses', v_row.id,
          jsonb_build_object('billing_kind', v_kind, 'amount_cents', v_price));

  return v_row;
end $$;
```

Properties: single transaction, row lock ⇒ no race, client cannot pick the billing kind,
every consumption leaves a ledger + audit row. `create_full_analysis` is granted to
`authenticated` only, and is the **only** insert path permitted on `analyses`.

Belt-and-braces constraint guaranteeing the free cap even if the function is bypassed:

```
create unique index analyses_free_cap_per_org
  on analyses (organization_id, (billing_kind))
  where billing_kind = 'frei' and status <> 'storniert'
  -- combined with a check enforced in the function; additionally enforced by
  -- constraint trigger counting free rows per org
```

(Exact mechanism: a `before insert` constraint trigger on `analyses` that rejects a
`billing_kind='frei'` row when the org already has `free_granted` free rows.)

### payments (new)

```
id uuid pk
organization_id uuid not null references organizations(id)
provider text not null                       -- e.g. 'stripe'
provider_payment_id text not null unique
amount_cents int not null check (amount_cents > 0)
currency text not null default 'EUR'
status text not null check (status in ('pending','succeeded','failed','refunded'))
analysis_id uuid references analyses(id)
raw_event jsonb
created_at timestamptz
```

Written **only** by a signed webhook handler using the service role. No client policy.

## 3. Analysis lifecycle

### analyses (exists — extend additively)

```
alter table analyses
  add column if not exists organization_id uuid references organizations(id),
  add column if not exists created_by uuid references auth.users(id),
  add column if not exists intake jsonb,
  add column if not exists compliance_state text,
  add column if not exists pipeline_state text,
  add column if not exists published_at timestamptz,
  add column if not exists correlation_id uuid default gen_random_uuid();
```

Existing `billing_kind`, `payment_status`, `amount_cents`, `status` stay. The critical
change is that **no client role may INSERT or UPDATE these**; only
`create_full_analysis` and server functions may.

### analysis_answers (new)

```
id uuid pk
analysis_id uuid not null references analyses(id) on delete cascade
question_key text not null
question_version int not null default 1
answer text
answer_json jsonb
created_at, updated_at timestamptz
unique (analysis_id, question_key)
```

### analysis_stage_runs (new)

```
id uuid pk
analysis_id uuid not null references analyses(id) on delete cascade
stage text not null check (stage in (
  'intake','compliance_screening','decompose','source_plan','evidence_research',
  'evidence_ledger','independent_verification','red_team','market_analysis',
  'business_model','financial_engine','technical_feasibility','risk_analysis',
  'synthesis','quality_gates','customer_report','internal_blueprint'))
attempt int not null default 1
status text not null check (status in ('pending','running','succeeded','failed','skipped','blocked'))
input_ref jsonb
output_ref jsonb
error text
model_run_id uuid references model_runs(id)
started_at, finished_at timestamptz
unique (analysis_id, stage, attempt)
```

### analysis_jobs (new)

Queue for long-running work (research, verification, synthesis).

```
id uuid pk
analysis_id uuid not null references analyses(id) on delete cascade
stage text not null
status text not null check (status in ('queued','leased','running','done','failed','dead'))
priority int not null default 100
attempts int not null default 0
max_attempts int not null default 5
lease_owner text
lease_expires_at timestamptz
run_after timestamptz not null default now()
payload jsonb
last_error text
created_at, updated_at timestamptz
```

Leasing (`lease_expires_at`) makes the worker crash-safe and prevents double-processing.

### compliance_findings (new)

```
id uuid pk
analysis_id uuid not null references analyses(id) on delete cascade
category text not null            -- e.g. 'data_protection','licensing','regulated_activity'
severity text not null check (severity in ('info','low','medium','high','blocking'))
jurisdiction text                 -- ISO country/region
question text not null
finding text not null
requires_professional_review boolean not null default true
evidence_record_id uuid references evidence_records(id)
created_at timestamptz
```

No row here may be presented as legal advice; `requires_professional_review` defaults
true and the customer report must render a disclaimer whenever any finding exists.

## 4. Evidence layer

### claims (new)

```
id uuid pk
analysis_id uuid not null references analyses(id) on delete cascade
statement text not null
claim_type text not null check (claim_type in
  ('market_size','customer_problem','competition','willingness_to_pay',
   'feasibility','cost','regulation','technical','other'))
importance text not null check (importance in ('critical','high','medium','low'))
status text not null check (status in ('unverified','supported','contradicted','inconclusive'))
created_at, updated_at timestamptz
```

### sources (new)

```
id uuid pk
analysis_id uuid not null references analyses(id) on delete cascade
url text
publisher text
title text
published_at timestamptz
retrieved_at timestamptz not null default now()
source_type text check (source_type in
  ('official','academic','industry','press','vendor','community','other'))
content_hash text                -- dedupe / integrity
excerpt text
created_at timestamptz
```

`sources` may be shared across analyses in a later iteration via an `evidence_cache`
table; keep it per-analysis initially for isolation and simplicity.

### evidence_records (new, append-only)

```
id uuid pk
analysis_id uuid not null references analyses(id) on delete cascade
claim_id uuid references claims(id) on delete cascade
source_id uuid references sources(id)
direction text not null check (direction in ('supports','contradicts','neutral'))
strength text not null check (strength in ('weak','moderate','strong'))
notes text
recorded_by text not null check (recorded_by in ('research','human','verifier'))
created_at timestamptz
```

Append-only: no `UPDATE`/`DELETE` policy for any client role.

### verification_results (new)

```
id uuid pk
analysis_id uuid not null references analyses(id) on delete cascade
claim_id uuid not null references claims(id) on delete cascade
verdict text not null check (verdict in ('supported','partially_supported','refuted','unverifiable'))
confidence numeric(3,2) check (confidence between 0 and 1)
method text not null
notes text
verifier_model_run_id uuid references model_runs(id)
created_at timestamptz
unique (analysis_id, claim_id)
```

### contradictions (new)

```
id uuid pk
analysis_id uuid not null references analyses(id) on delete cascade
claim_a uuid references claims(id), claim_b uuid references claims(id)
description text not null
resolution text check (resolution in ('unresolved','resolved_a','resolved_b','resolved_both'))
resolution_notes text
created_at, updated_at timestamptz
```

## 5. Analysis outputs (customer side)

### market_findings (new)

```
id uuid pk, analysis_id uuid not null references analyses(id) on delete cascade
finding_type text check (finding_type in
  ('market_size','growth','segmentation','trend','barrier','channel'))
statement text not null, magnitude text, confidence text,
evidence_record_id uuid references evidence_records(id), created_at
```

### competitors (new)

```
id uuid pk, analysis_id uuid not null references analyses(id) on delete cascade
name text not null, url text, positioning text, strengths text, weaknesses text,
pricing_note text, evidence_record_id uuid references evidence_records(id), created_at
```

### financial_assumptions / financial_scenarios / financial_calculations (new)

```
financial_assumptions
  id, analysis_id, key text, label text, value numeric, unit text,
  basis text, is_driver boolean default false, confidence text,
  evidence_record_id, created_at
  unique (analysis_id, key)

financial_scenarios
  id, analysis_id, name text check (name in ('konservativ','mittel','optimistisch')),
  notes text, created_at
  unique (analysis_id, name)

financial_calculations
  id, analysis_id, scenario_id references financial_scenarios, metric text,
  period_index int, value numeric, formula_ref text, created_at
```

Every number in a customer report must be traceable to an assumption with a stated
basis. Scenarios are always labelled scenarios, never forecasts.

### technical_findings / risk_items (new)

```
technical_findings
  id, analysis_id, area text, statement text, complexity text
    check (complexity in ('low','medium','high','very_high')),
  buildable_today boolean, key_dependencies text, evidence_record_id, created_at

risk_items
  id, analysis_id, category text, description text,
  likelihood text check (likelihood in ('low','medium','high')),
  impact text check (impact in ('low','medium','high')),
  mitigation text, is_critical boolean default false,
  claim_id uuid references claims(id), created_at
```

## 6. Customer reports

### customer_reports (new)

```
id uuid pk
analysis_id uuid not null unique references analyses(id) on delete cascade
organization_id uuid not null references organizations(id)
title text not null
summary text
status text not null check (status in ('draft','quality_blocked','published','withdrawn'))
version int not null default 1
quality_gate_report jsonb
published_at timestamptz
created_at, updated_at timestamptz
```

### customer_report_sections (new)

```
id uuid pk
report_id uuid not null references customer_reports(id) on delete cascade
section_key text not null
position int not null
title text not null
body_md text not null
citations jsonb not null default '[]'::jsonb
created_at
unique (report_id, section_key)
```

Customer access: `customer_reports` / `customer_report_sections` are readable by
`is_org_member(organization_id)` **only when `status = 'published'`**. Drafts and
quality-blocked reports are service/admin only.

## 7. Private VZG tables (never customer-readable)

### internal_build_blueprints (new)

```
id uuid pk, analysis_id uuid not null references analyses(id) on delete cascade
architecture_md text, module_plan jsonb, delivery_plan jsonb,
effort_estimate jsonb, assumptions jsonb, created_at, updated_at
```

### internal_pricing_inputs (new)

```
id uuid pk, analysis_id uuid references analyses(id) on delete cascade
cost_lines jsonb, margin_model jsonb, rate_card jsonb, notes text,
created_at, updated_at
```

### internal_notes (new)

```
id uuid pk, analysis_id uuid references analyses(id) on delete cascade
author uuid references auth.users(id), body_md text, created_at
```

### prompt_versions (new)

```
id uuid pk, key text not null, version int not null, body text not null,
model_hint text, created_at timestamptz, created_by uuid
unique (key, version)
```

### model_runs (new)

```
id uuid pk, analysis_id uuid references analyses(id), stage text, purpose text,
model text, prompt_version_id uuid references prompt_versions(id),
input_tokens int, output_tokens int, latency_ms int, cost_cents int,
correlation_id uuid, created_at
```

### vzg_scoring_rubrics (new)

```
id uuid pk, key text not null, version int not null, definition jsonb not null,
created_at, unique (key, version)
```

**RLS rule for all §7 tables:** `enable row level security` and create **no policies**
for `anon`/`authenticated`. Reads happen through server functions using the service role
or via `is_vzg_admin()`-gated policies if ever needed from the admin console.

## 8. Offers, audit, guests

### offer_requests (new)

```
id uuid pk, organization_id uuid not null references organizations(id)
analysis_id uuid references analyses(id)
created_by uuid references auth.users(id)
message text, scope_hint text,
status text not null check (status in
  ('submitted','in_review','quoted','accepted','declined','withdrawn')) default 'submitted',
internal_state text            -- admin-only column, protected by column grants
created_at, updated_at
```

`internal_state` is written only by admin/service. If column grants prove awkward,
move it to `internal_offer_notes` in the private zone instead.

### audit_events (new, append-only)

```
id uuid pk, organization_id uuid references organizations(id),
actor_user_id uuid, actor_role text, event_type text not null,
entity text, entity_id uuid, data jsonb not null default '{}'::jsonb,
ip_hash text, user_agent text, created_at timestamptz not null default now()
```

Readable by members only for their own org (optional) and by admins. Never writable by
any client role.

### guest_previews (new)

```
id uuid pk
fingerprint_hash text not null          -- hash of normalized idea + salt; no raw IP stored
request_hash text not null              -- dedupe key for identical requests
payload jsonb not null                  -- sanitized intake
result jsonb not null                   -- preview output
model_run_id uuid references model_runs(id)
expires_at timestamptz not null         -- TTL, e.g. 24h
created_at timestamptz not null default now()
```

Guest writes go through a server function with the service role; **no client policy**
on this table. Guest abuse control lives in a `rate_limits` table or in the server
function using a rolling window keyed by `fingerprint_hash` and a coarse network hash.

### rate_limits (new, optional)

```
id uuid pk, bucket text not null, key_hash text not null,
window_start timestamptz not null, count int not null default 0,
unique (bucket, key_hash, window_start)
```

## 9. Key indexes

```
organization_members(user_id) where status = 'active'
analyses(organization_id, created_at desc)
analyses(user_id, created_at desc)              -- legacy path
analysis_jobs(status, run_after) where status in ('queued','leased')
credit_transactions(organization_id, created_at desc)
evidence_records(claim_id)
verification_results(analysis_id)
risk_items(analysis_id) where is_critical
customer_reports(organization_id, published_at desc)
audit_events(organization_id, created_at desc)
guest_previews(request_hash)
guest_previews(expires_at)
```

## 10. Migration order (each its own SQL file, idempotent, additive)

1. `0001_org_model.sql` — `organizations`, `organization_members`, `is_org_member`,
   `is_vzg_admin`, back-fill one personal org per existing profile.
2. `0002_credits.sql` — `analysis_credits`, `credit_transactions`, seed credit rows from
   `free_credits_granted`, back-fill ledger rows from existing `analyses`.
3. `0003_analysis_lifecycle.sql` — add `organization_id`, `correlation_id`, `intake`,
   `compliance_state`, `pipeline_state` to `analyses`; back-fill `organization_id`.
4. `0004_pipeline.sql` — `analysis_answers`, `analysis_stage_runs`, `analysis_jobs`,
   `compliance_findings`.
5. `0005_evidence.sql` — `claims`, `sources`, `evidence_records`,
   `verification_results`, `contradictions`.
6. `0006_analysis_outputs.sql` — `market_findings`, `competitors`,
   `financial_assumptions`, `financial_scenarios`, `financial_calculations`,
   `technical_findings`, `risk_items`.
7. `0007_reports.sql` — `customer_reports`, `customer_report_sections`.
8. `0008_private.sql` — `internal_build_blueprints`, `internal_pricing_inputs`,
   `internal_notes`, `prompt_versions`, `model_runs`, `vzg_scoring_rubrics`
   (RLS on, no policies).
9. `0009_offers_payments_audit.sql` — `offer_requests`, `payments`, `audit_events`.
10. `0010_guests.sql` — `guest_previews`, `rate_limits`.
11. `0011_rls.sql` — all policies for customer tables, in one reviewable file.
12. `0012_functions.sql` — `create_full_analysis`, constraint triggers, `updated_at`
    triggers.

Every file must be re-runnable (`if not exists`, `on conflict do nothing`, guarded
back-fills) so a partially applied migration can be safely retried.

## 11. Deliberate divergences from the requested list

The requested list is implemented in full with these notes:

- `analysis_credits` is kept as a **cached counter row for locking**, while
  `credit_transactions` remains the **source of truth**. The requested list implies both;
  this document states explicitly which one wins.
- `sources` is per-analysis rather than global, to avoid cross-tenant leakage of an
  evidence cache in the first iteration. A shared cache is a later optimization with its
  own RLS review.
- `internal_state` on `offer_requests` is called out as a risk; the safer alternative
  (`internal_offer_notes` in the private zone) is preferred if column grants are not
  available in the managed environment.
