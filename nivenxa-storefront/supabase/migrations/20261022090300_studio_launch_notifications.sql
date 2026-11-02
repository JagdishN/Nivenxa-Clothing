-- "Notify me" requests for coming-soon Studio products (e.g. the A-line
-- Kurta Set). An email address is the only personal data stored.
--
-- NOT a marketing list: rows are used once, to send a single launch
-- notification for the product the person asked about, and are then deleted
-- (see studio_purge_launch_notifications below and the Studio Privacy Policy,
-- sections 1, 2 and 7). Nothing here is ever joined to a newsletter.
--
-- RLS is ON with no policies: the browser (publishable key) can neither read
-- nor write this table. Only the secret-key admin client used by the
-- /api/studio/notify Route Handler and scripts/purge-launch-notifications.ts
-- touches it.

create table if not exists studio_launch_notifications (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  product_id text not null,
  created_at timestamptz not null default now(),
  -- Set by whoever sends the launch email; a row with notified_at is purged
  -- on the next cleanup run.
  notified_at timestamptz,
  unique (email, product_id)
);

create index if not exists studio_launch_notifications_created_at_idx
  on studio_launch_notifications (created_at);

alter table studio_launch_notifications enable row level security;

-- ── Rate limit: a fixed window per hashed client IP ─────────────────────────
-- Same lazy-reset approach as chess_ai_rate_limit_increment(): one atomic
-- upsert does the read, compare and increment/reset, so concurrent requests
-- can't race past the limit. Only a SHA-256 hash of the IP is stored.
create table if not exists studio_notify_rate_limits (
  ip_hash text primary key,
  window_start timestamptz not null default now(),
  request_count int not null default 0
);

alter table studio_notify_rate_limits enable row level security;

create or replace function studio_notify_rate_limit_increment(p_ip_hash text, p_limit int, p_window_seconds int)
returns boolean as $$
declare
  v_count int;
begin
  insert into studio_notify_rate_limits (ip_hash, window_start, request_count)
  values (p_ip_hash, now(), 1)
  on conflict (ip_hash) do update
    set
      window_start = case
        when now() - studio_notify_rate_limits.window_start > (p_window_seconds || ' seconds')::interval then now()
        else studio_notify_rate_limits.window_start
      end,
      request_count = case
        when now() - studio_notify_rate_limits.window_start > (p_window_seconds || ' seconds')::interval then 1
        else studio_notify_rate_limits.request_count + 1
      end
  returning request_count into v_count;
  return v_count <= p_limit;
end;
$$ language plpgsql security definer;

-- ── Retention ───────────────────────────────────────────────────────────────
-- Privacy Policy section 7: launch notification requests are "deleted once
-- we've sent the notification, or after 12 months if the product hasn't
-- launched". Run via `npm run purge-launch-notifications` (see scripts/).
create or replace function studio_purge_launch_notifications()
returns int as $$
declare
  v_deleted int;
begin
  delete from studio_launch_notifications
  where notified_at is not null
     or created_at < now() - interval '12 months';
  get diagnostics v_deleted = row_count;

  -- Rate-limit rows older than a day carry no value either.
  delete from studio_notify_rate_limits where window_start < now() - interval '1 day';

  return v_deleted;
end;
$$ language plpgsql security definer;

-- ── Function permissions ────────────────────────────────────────────────────
-- Both functions are SECURITY DEFINER. They must not be callable through the
-- public API: anyone could otherwise run the purge, or exhaust a rate limit.
-- Only the server (service role) may call them. The two tables above have RLS
-- ON with no policies, so the anon and authenticated roles can read nothing.
alter function studio_notify_rate_limit_increment(text, int, int) set search_path = public;
alter function studio_purge_launch_notifications() set search_path = public;
revoke all on function studio_notify_rate_limit_increment(text, int, int) from public, anon, authenticated;
revoke all on function studio_purge_launch_notifications() from public, anon, authenticated;
grant execute on function studio_notify_rate_limit_increment(text, int, int) to service_role;
grant execute on function studio_purge_launch_notifications() to service_role;
