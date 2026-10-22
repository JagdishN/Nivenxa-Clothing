-- Parent/adult consent, collected once at sign-up (and once, retroactively,
-- from any existing account that predates this) — see
-- src/app/chess/_auth/ChessOtpForm.tsx and src/lib/chess/chessConsentActions.ts.
--
-- A dedicated table, not auth.users metadata — auth.users is Supabase-managed
-- and we don't write to it directly; this is a normal, queryable row we own,
-- one per account, created the moment consent is actually given (not at
-- account-row-creation time, so "no row yet" is itself the signal that an
-- existing pre-consent account still needs to see the step).
create table if not exists chess_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  account_type text not null check (account_type in ('adult', 'child')),
  consent_at timestamptz not null default now(),
  consent_policy_version text not null
);

-- ── Row Level Security ──────────────────────────────────────────────────────
-- ON, so nothing is readable with the anon key. A signed-in user can see and
-- record only their own consent row. (The app itself writes through the
-- secret-key admin client in chessConsentActions.ts, which bypasses RLS;
-- these policies are the safety net if a browser client is ever used.)
alter table chess_profiles enable row level security;

drop policy if exists chess_profiles_select_own on chess_profiles;
create policy chess_profiles_select_own on chess_profiles
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists chess_profiles_insert_own on chess_profiles;
create policy chess_profiles_insert_own on chess_profiles
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists chess_profiles_update_own on chess_profiles;
create policy chess_profiles_update_own on chess_profiles
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
