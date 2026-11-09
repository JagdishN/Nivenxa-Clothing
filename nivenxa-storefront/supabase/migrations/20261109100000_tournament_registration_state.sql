-- Optional per-event registration deadline and cancellation flag, read by the Chess home card.
-- NOT applied to any environment by this repo change (staging first). The app does not need it: every read is
-- tolerant of the columns being absent, in which case there is simply no deadline and no cancelled events.
-- The admin form does not expose these yet, so until it does they are set directly in Supabase.

alter table tournaments add column if not exists registration_deadline date;
alter table tournaments add column if not exists is_cancelled boolean not null default false;

comment on column tournaments.registration_deadline is 'Last day to register, in the event timezone (Asia/Kolkata). null = none recorded.';
comment on column tournaments.is_cancelled is 'A cancelled event is never shown as upcoming on the home card.';
