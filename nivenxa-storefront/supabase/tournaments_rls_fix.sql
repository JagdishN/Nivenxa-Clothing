-- Fixes a gap discovered 2026-10-01: RLS was enabled on `tournaments` at
-- some point after schema.sql was written (that file never enables RLS on
-- this table, and the code in src/lib/chess/supabase.ts still comments
-- "RLS is currently OFF on every table"), with no policies attached. That
-- silently made every row invisible to the publishable/anon key the public
-- /chess/tournaments page reads with — confirmed directly: a publishable-key
-- query with zero filters returned 0 rows while the same query with the
-- secret key returned the real data. The page has likely been showing no
-- tournaments at all for a while, independent of any application-level
-- filter logic.
--
-- Restores the behavior the application code already assumes: public read
-- access for anyone (the app's own `verified`/`is_nivenxa_organized`
-- filters are the real display boundary, same as before — this does not
-- change that), writes restricted to the secret/service-role key, which is
-- the only key every write path (admin pages, scripts/add-nivenxa-tournament.ts)
-- already uses.
alter table tournaments enable row level security;

drop policy if exists tournaments_public_read on tournaments;
create policy tournaments_public_read on tournaments for select
  using (true);

drop policy if exists tournaments_service_write on tournaments;
create policy tournaments_service_write on tournaments for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
