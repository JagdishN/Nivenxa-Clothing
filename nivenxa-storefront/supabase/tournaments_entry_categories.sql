-- Adds two columns the card redesign needs as real, structured data rather
-- than text buried inside `format`/`payment_note` (where "Entry Fee" and
-- "Categories" had been folded in as a stopgap when the tournament was
-- first added) — see src/app/chess/tournaments/TournamentListing.tsx's
-- card redesign, 2026-10-01.
alter table tournaments add column if not exists entry_fee text;
alter table tournaments add column if not exists categories text;
