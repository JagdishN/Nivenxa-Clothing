-- Richer puzzle results: independent solve vs hint-assisted solve vs revealed solution vs skip.
-- NOT applied to any environment by this repo change. Apply to staging first
-- (npx supabase link --project-ref <STAGING_PROJECT_REF>; db push --dry-run; db push).
-- The app works without it: logPuzzleAttempt falls back to the original columns when these are missing.
-- Additive and nullable/defaulted, so existing rows and the existing `solved` column are untouched.

alter table puzzle_attempts add column if not exists outcome text
  check (outcome in ('solved', 'solved_with_hint', 'solution_viewed', 'skipped'));
alter table puzzle_attempts add column if not exists hints_used int not null default 0 check (hints_used between 0 and 3);
alter table puzzle_attempts add column if not exists wrong_attempts int not null default 0 check (wrong_attempts between 0 and 99);

comment on column puzzle_attempts.outcome is 'null on rows written before this migration';
