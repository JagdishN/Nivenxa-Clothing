-- Privacy Policy consent, tracked on living_memberships rather than a new
-- table — every user already has exactly one membership row (unique
-- user_id), so this is a straight column addition, not a new relation.
-- Nullable: existing memberships keep consent_at = null, which is exactly
-- the signal requireMembership() uses to show the one-time notice once,
-- on next sign-in (see src/lib/living/auth.ts).
alter table living_memberships add column if not exists consent_at timestamptz;
alter table living_memberships add column if not exists consent_policy_version text;

-- living_memberships' own UPDATE policy is admin-only (an Owner/Treasurer
-- can't update their own row directly) — this SECURITY DEFINER function is
-- the narrow, self-scoped exception, same pattern as
-- living_join_apartment()/living_create_apartment() elsewhere in this
-- schema: it can only ever touch the calling user's own row (auth.uid()),
-- never anyone else's.
create or replace function living_record_consent(p_policy_version text) returns void
language plpgsql security definer as $$
begin
  update living_memberships
  set consent_at = now(), consent_policy_version = p_policy_version
  where user_id = auth.uid();
end;
$$;

-- Harden the function: pin search_path and make it callable only by signed-in
-- users (anon has no auth.uid(), so it would be a no-op anyway). The two new
-- columns inherit living_memberships' existing Row Level Security — no new
-- table, so no new policy is needed.
alter function living_record_consent(text) set search_path = public;
revoke all on function living_record_consent(text) from public, anon;
grant execute on function living_record_consent(text) to authenticated;
