-- Per-user rate limit for AI move-explanation requests (/api/chess/explain-move).
-- Only meaningful for signed-in users — a guest player has no user_id to
-- key this on, so guest requests aren't limited by this table (see
-- src/lib/chess/aiRateLimit.ts).
--
-- A fixed hourly window, reset lazily on the first request after it expires
-- (no cron job needed): chess_ai_rate_limit_increment() does the read,
-- compare and increment/reset in one atomic upsert, so concurrent requests
-- from the same user can't race past the limit.

create table if not exists chess_ai_rate_limits (
  user_id uuid primary key references auth.users (id) on delete cascade,
  window_start timestamptz not null default now(),
  request_count int not null default 0
);

create or replace function chess_ai_rate_limit_increment(p_user_id uuid, p_limit int, p_window_seconds int)
returns boolean as $$
declare
  v_count int;
begin
  insert into chess_ai_rate_limits (user_id, window_start, request_count)
  values (p_user_id, now(), 1)
  on conflict (user_id) do update
    set
      window_start = case
        when now() - chess_ai_rate_limits.window_start > (p_window_seconds || ' seconds')::interval then now()
        else chess_ai_rate_limits.window_start
      end,
      request_count = case
        when now() - chess_ai_rate_limits.window_start > (p_window_seconds || ' seconds')::interval then 1
        else chess_ai_rate_limits.request_count + 1
      end
  returning request_count into v_count;
  return v_count <= p_limit;
end;
$$ language plpgsql security definer;

-- ── Row Level Security ──────────────────────────────────────────────────────
-- ON, with a read-own policy only: nothing is readable with the anon key, and
-- a signed-in user can see their own counter but can NOT write it (letting
-- users write their own rate-limit row would let them reset their limit).
-- Writes happen only through chess_ai_rate_limit_increment() below, called
-- from a Route Handler with the secret-key admin client.
alter table chess_ai_rate_limits enable row level security;

drop policy if exists chess_ai_rate_limits_select_own on chess_ai_rate_limits;
create policy chess_ai_rate_limits_select_own on chess_ai_rate_limits
  for select to authenticated using (auth.uid() = user_id);

-- The function is SECURITY DEFINER and takes a user id as an argument, so it
-- must not be callable through the public API — otherwise anyone could burn
-- another user's quota. Only the server (service role) may call it.
alter function chess_ai_rate_limit_increment(uuid, int, int) set search_path = public;
revoke all on function chess_ai_rate_limit_increment(uuid, int, int) from public, anon, authenticated;
grant execute on function chess_ai_rate_limit_increment(uuid, int, int) to service_role;
