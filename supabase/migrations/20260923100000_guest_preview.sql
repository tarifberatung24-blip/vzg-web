-- TASK-001 — Guest Preview
--
-- NOT APPLIED by this commit. Apply deliberately, after review, against the
-- project database (project ref: kytwfxgcafgojynvjrof).
--
-- This migration is additive only: it creates one table, one rate-limit table,
-- two functions and their grants. It does not alter or drop anything that
-- exists, so it cannot break the current Lovable-built application.
--
-- It is safe to run more than once (idempotent guards throughout) so a partially
-- applied state can be retried without manual cleanup.
--
-- Security posture
--   * RLS is enabled on both tables.
--   * NO policy is granted to `anon` or `authenticated` on either table, so
--     neither role can select, insert, update or delete anything. Guest rows are
--     unreachable from a client even if the anon key is public (it is).
--   * All access is through the service role from server-only code
--     (src/lib/preview/persist.server.ts, src/lib/preview/rate-limit.server.ts).
--   * `revoke all ... from public` removes the default privileges Supabase grants
--     on new tables in the public schema.
--   * The quota functions are SECURITY DEFINER with a pinned search_path and are
--     revoked from public/anon/authenticated, then granted only to service_role.
--
-- Retention: guest_previews rows carry expires_at (default 24h) and are purged
-- by purge_expired_guest_previews(), scheduled in a later task.

begin;

-- ------------------------------------------------------------------ --
-- guest_previews: optional lineage record for a guest preview run
-- ------------------------------------------------------------------ --

create table if not exists public.guest_previews (
  id uuid primary key default gen_random_uuid(),
  -- Salted HMAC of the guest session id. Never the raw session id, and never
  -- an IP address, user agent or any device fingerprint.
  session_hash text not null,
  market text not null,
  -- The submitted idea, stored only for the retention window below.
  input_idea text not null,
  -- The validated preview result (the same shape enforced by the Zod contract).
  result jsonb not null,
  compliance_status text not null,
  provider text,
  prompt_version text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint guest_previews_compliance_status_check
    check (compliance_status in ('NO_OBVIOUS_RED_FLAG', 'POTENTIAL_REGULATORY_RISK', 'REVIEW_REQUIRED', 'BLOCKED')),
  constraint guest_previews_session_hash_len_check
    check (char_length(session_hash) between 32 and 128),
  constraint guest_previews_input_idea_len_check
    check (char_length(input_idea) between 1 and 2000),
  constraint guest_previews_expires_after_created_check
    check (expires_at > created_at)
);

comment on table public.guest_previews is
  'TASK-001 guest preview lineage. Server-only (service role); no policy for anon/authenticated. Purged after expires_at.';

create index if not exists guest_previews_expires_at_idx
  on public.guest_previews (expires_at);

create index if not exists guest_previews_session_hash_idx
  on public.guest_previews (session_hash);

alter table public.guest_previews enable row level security;

-- Supabase grants broad privileges on new public tables by default; remove them.
revoke all on table public.guest_previews from anon, authenticated, public;

-- Intentionally no policies: with RLS enabled and no policy present, every
-- anon/authenticated access is denied. Only the service role bypasses RLS.

-- ------------------------------------------------------------------ --
-- guest_rate_limits: durable abuse control
-- ------------------------------------------------------------------ --

create table if not exists public.guest_rate_limits (
  session_hash text primary key,
  window_started_at timestamptz not null default now(),
  preview_count integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint guest_rate_limits_session_hash_len_check
    check (char_length(session_hash) between 32 and 128),
  constraint guest_rate_limits_preview_count_check
    check (preview_count >= 0)
);

comment on table public.guest_rate_limits is
  'TASK-001 durable guest preview quota, keyed by salted session hash. Server-only.';

alter table public.guest_rate_limits enable row level security;
revoke all on table public.guest_rate_limits from anon, authenticated, public;

-- ------------------------------------------------------------------ --
-- Quota functions
-- ------------------------------------------------------------------ --

-- Consumes one preview from the caller's window and reports the decision.
-- All three parameters are server-supplied: a guest cannot influence the limit
-- or the window, because there is no client-reachable grant on this function.
create or replace function public.consume_guest_preview_quota(
  p_session_hash text,
  p_max integer default 3,
  p_window_seconds integer default 86400
)
returns table (allowed boolean, remaining integer, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.guest_rate_limits%rowtype;
  v_now timestamptz := now();
  v_elapsed numeric;
begin
  if p_session_hash is null or char_length(p_session_hash) < 32 then
    raise exception 'invalid session hash';
  end if;
  if p_max is null or p_max < 1 or p_max > 100 then
    raise exception 'invalid max';
  end if;
  if p_window_seconds is null or p_window_seconds < 60 or p_window_seconds > 604800 then
    raise exception 'invalid window';
  end if;

  select * into v_row
  from public.guest_rate_limits
  where session_hash = p_session_hash
  for update;

  if not found then
    insert into public.guest_rate_limits (session_hash, window_started_at, preview_count, updated_at)
    values (p_session_hash, v_now, 1, v_now);
    return query select true, (p_max - 1), null::integer;
    return;
  end if;

  v_elapsed := extract(epoch from (v_now - v_row.window_started_at));

  -- Window expired: start a fresh one.
  if v_elapsed >= p_window_seconds then
    update public.guest_rate_limits
       set window_started_at = v_now, preview_count = 1, updated_at = v_now
     where session_hash = p_session_hash;
    return query select true, (p_max - 1), null::integer;
    return;
  end if;

  if v_row.preview_count >= p_max then
    return query select false, 0, greatest(ceil(p_window_seconds - v_elapsed)::integer, 1);
    return;
  end if;

  update public.guest_rate_limits
     set preview_count = v_row.preview_count + 1, updated_at = v_now
   where session_hash = p_session_hash;

  return query select true, (p_max - v_row.preview_count - 1), null::integer;
end;
$$;

-- Reads the quota without consuming one. Used only to render an accurate
-- counter before submission; the consuming path above remains authoritative.
create or replace function public.peek_guest_preview_quota(
  p_session_hash text,
  p_max integer default 3,
  p_window_seconds integer default 86400
)
returns table (allowed boolean, remaining integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.guest_rate_limits%rowtype;
  v_elapsed numeric;
begin
  if p_session_hash is null or char_length(p_session_hash) < 32 then
    raise exception 'invalid session hash';
  end if;

  select * into v_row
  from public.guest_rate_limits
  where session_hash = p_session_hash;

  if not found then
    return query select true, p_max;
    return;
  end if;

  v_elapsed := extract(epoch from (now() - v_row.window_started_at));
  if v_elapsed >= p_window_seconds then
    return query select true, p_max;
    return;
  end if;

  if v_row.preview_count >= p_max then
    return query select false, 0;
    return;
  end if;

  return query select true, (p_max - v_row.preview_count);
end;
$$;

-- Removes expired guest previews. Called by a cron endpoint in a later task.
create or replace function public.purge_expired_guest_previews()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_deleted integer;
begin
  with removed as (
    delete from public.guest_previews where expires_at < now() returning id
  )
  select count(*) into v_deleted from removed;
  return coalesce(v_deleted, 0);
end;
$$;

-- Only the service role may call these. There is no path for anon/authenticated.
revoke all on function public.consume_guest_preview_quota(text, integer, integer) from public, anon, authenticated;
revoke all on function public.peek_guest_preview_quota(text, integer, integer) from public, anon, authenticated;
revoke all on function public.purge_expired_guest_previews() from public, anon, authenticated;

grant execute on function public.consume_guest_preview_quota(text, integer, integer) to service_role;
grant execute on function public.peek_guest_preview_quota(text, integer, integer) to service_role;
grant execute on function public.purge_expired_guest_previews() to service_role;

revoke all on table public.guest_previews from public, anon, authenticated;
revoke all on table public.guest_rate_limits from public, anon, authenticated;

grant select, insert, delete on table public.guest_previews to service_role;
grant select, insert, update, delete on table public.guest_rate_limits to service_role;

commit;
