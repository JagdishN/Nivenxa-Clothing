-- Makes feedback private. feedback_items was created with row-level security OFF, which means anyone holding the
-- public (publishable) key that ships in the website could read, add or delete rows through Supabase's REST API.
-- With RLS on and no policies, only the server (service-role key) can touch the table, which is how the app and
-- /admin/feedback already access it, so nothing in the app changes.
-- NOT applied by this repo change. Run it yourself (staging first):
--   npm run apply-schema -- supabase/migrations/20261116100000_feedback_items_rls.sql   (or the Supabase SQL editor)

alter table feedback_items enable row level security;
