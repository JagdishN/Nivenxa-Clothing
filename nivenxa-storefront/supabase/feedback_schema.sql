-- ─────────────────────────────────────────────────────────────────────────
-- NIVENXA Feedback — one shared table + storage bucket used by BOTH Chess
-- and Living (see src/lib/feedback/). Same Supabase project as schema.sql /
-- living_schema.sql — apply with:
--   npm run apply-schema -- supabase/feedback_schema.sql
--
-- All reads/writes go through the server-side secret-key client
-- (getSupabaseAdmin(), src/lib/chess/supabase.ts) — the widget itself is
-- reachable while logged out (feedback must work for an anonymous visitor),
-- so there is no per-user RLS boundary to enforce here, unlike living_*
-- tables. RLS stays off, matching schema.sql's current posture.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists feedback_items (
  id uuid primary key default gen_random_uuid(),
  app text not null check (app in ('chess', 'living')),
  category text not null check (
    category in ('bug', 'improvement', 'usability', 'feature', 'other', 'lesson_check', 'game_check', 'task_check')
  ),
  rating text check (rating in ('poor', 'okay', 'good', 'excellent')),
  comment text,
  allow_contact boolean not null default false,

  -- Identity — nullable throughout: feedback must work for a logged-out/anonymous visitor.
  user_id uuid references auth.users (id) on delete set null,
  user_email text,
  user_role text,

  -- Screen context — auto-derived from the pathname (see deriveScreenLabel in
  -- src/lib/feedback/screenLabel.ts); `context` is a free-form landing spot
  -- for richer per-screen metadata a future pass can start populating
  -- (opening slug, game id, module/action pairs, quick-check answers, ...).
  screen_label text not null,
  route text not null,
  context jsonb,

  -- Technical/device context, captured client-side at submit time.
  app_version text,
  device_type text check (device_type in ('mobile', 'tablet', 'desktop')),
  user_agent text,
  screen_width int,
  screen_height int,
  screenshot_path text,

  -- Internal triage state (set from /admin/feedback, never by the submitter).
  status text not null default 'new' check (status in ('new', 'reviewed', 'planned', 'in_progress', 'completed', 'wont_do')),
  priority text check (priority in ('low', 'medium', 'high', 'critical')),
  area text check (area in ('ui', 'ux', 'functional', 'performance', 'content')),
  owner text,
  internal_notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists feedback_items_app_idx on feedback_items (app, created_at desc);
create index if not exists feedback_items_status_idx on feedback_items (status);
create index if not exists feedback_items_screen_idx on feedback_items (app, screen_label);

insert into storage.buckets (id, name, public)
values ('feedback-screenshots', 'feedback-screenshots', false)
on conflict (id) do nothing;
-- No storage.objects policies: every read/write to this bucket goes through
-- server-side code using getSupabaseAdmin() (the upload route, the
-- dashboard's signed-URL fetch) — RLS stays default-deny, since no client
-- ever touches this bucket directly.
