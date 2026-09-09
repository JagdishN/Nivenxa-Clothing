-- ─────────────────────────────────────────────────────────────────────────
-- Nivenxa Living — Apartment maintenance & water billing schema
--
-- Same manual-apply pattern as schema.sql (no CLI/migration tooling in this
-- project yet) — run once by hand in the Supabase SQL Editor.
--
-- Unlike chess (schema.sql), RLS is ON here from the first row: this app
-- holds real per-tenant financial data for unrelated apartment buildings.
-- Every table is scoped to the caller's own apartment via the
-- living_my_apartment_id()/living_my_role() helper functions below — both
-- security definer, so they can read living_memberships without being
-- subject to the very RLS policies that reference them (an ordinary,
-- RLS-filtered subquery on living_memberships would only ever see rows the
-- caller already has access to, which is circular for a table whose whole
-- job is to define that access).
--
-- Every user has AT MOST ONE membership (living_memberships.user_id is
-- unique) — the spec scopes each account to exactly one Apartment (Owners
-- additionally to exactly one Flat). That's what makes
-- living_my_apartment_id() a plain scalar lookup rather than a set.
-- ─────────────────────────────────────────────────────────────────────────

-- ─── Apartments, flats, membership ─────────────────────────────────────

create table if not exists living_apartments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  admin_contact text not null,
  -- Shown to the Admin at creation, shared by them outside the app
  -- (WhatsApp, in person) so an Owner can find their Apartment at signup.
  join_code text not null unique,
  flat_split text not null default 'equal' check (flat_split in ('equal', 'weighted')),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

-- The Admin's own intended flat count, set at creation and editable later —
-- the Setup page's "X / flat_count" display and add/upload cap are both
-- against THIS, not a hardcoded platform number. 30 is only the ceiling on
-- what this value itself can be (enforced in the RPC/edit action, not a
-- DB constraint — see living_create_apartment). `if not exists` + the
-- backfill below make this safe to re-run against an already-seeded database.
alter table living_apartments add column if not exists flat_count int not null default 0;
-- The backfill (flat_count = current actual flat count, for any row still
-- at the 0 default) runs further down, right after living_flats is created
-- — it doesn't exist yet at this point on a fresh database.

-- Overrides the divisor used for EQUAL-split common costs (maintenance line
-- items and the water-supply/tanker pool) — null means "divide by the
-- actual number of flat rows," same as before this column existed. Real
-- buildings don't always want that: a flat with two water meters is still
-- one billable unit, and some rooms/areas in the flats table might not be
-- one either — rather than try to model every such case, the Admin can
-- just say what the divisor should be. Deliberately NOT required to equal
-- flats.length — collections then won't exactly equal spend, and that's
-- the Admin's own informed tradeoff, not a bug.
alter table living_apartments add column if not exists shared_cost_divisor int;

create table if not exists living_flats (
  id uuid primary key default gen_random_uuid(),
  apartment_id uuid not null references living_apartments (id) on delete cascade,
  flat_no text not null,
  owner_name text,
  -- Email or phone, matched against a signing-up Owner's own auth identity
  -- to auto-attach them without an Admin approval step — see
  -- living_join_apartment() below.
  owner_contact text,
  -- Only read when the apartment's flat_split is 'weighted'.
  sq_ft numeric,
  share_override numeric,
  created_at timestamptz not null default now(),
  unique (apartment_id, flat_no)
);

-- Not every row in this table is a billable residential unit: a shared/common
-- meter (e.g. flat_no 'common') needs a row to hold its own readings but
-- should never get a personal bill or count toward the equal-split divisor.
alter table living_flats add column if not exists excluded_from_billing boolean not null default false;
-- A flat with a second water meter (a merged/combined unit, same owner as
-- another flat) points here instead of getting its own standalone bill —
-- its metered water charge is added into the target flat's, and it's
-- dropped from per-flat billing views (see getBillableFlats() in queries.ts).
alter table living_flats add column if not exists merged_into_flat_id uuid references living_flats (id) on delete set null;

create index if not exists living_flats_apartment_id_idx on living_flats (apartment_id);

-- Backfill for living_apartments.flat_count (added above) — only touches
-- rows still at the 0 default, so an Admin's own later edit is never
-- overwritten by re-running this file.
update living_apartments la set flat_count = (select count(*) from living_flats f where f.apartment_id = la.id) where la.flat_count = 0;

create table if not exists living_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  apartment_id uuid not null references living_apartments (id) on delete cascade,
  role text not null check (role in ('admin', 'treasurer', 'owner')),
  -- Set for role = 'owner' only; a flat can be claimed by at most one member.
  flat_id uuid references living_flats (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (flat_id)
);

create index if not exists living_memberships_apartment_id_idx on living_memberships (apartment_id);

-- Admins are capped at 3 per apartment (Treasurer/Owner uncapped) — a
-- business rule, not an access-control rule, so it's a trigger rather than
-- an RLS policy.
create or replace function living_enforce_admin_cap() returns trigger
language plpgsql as $$
begin
  if new.role = 'admin' then
    if (select count(*) from living_memberships
        where apartment_id = new.apartment_id and role = 'admin' and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)) >= 3 then
      raise exception 'an apartment can have at most 3 admins';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists living_memberships_admin_cap on living_memberships;
create trigger living_memberships_admin_cap
  before insert or update on living_memberships
  for each row execute function living_enforce_admin_cap();

create table if not exists living_flat_claims (
  id uuid primary key default gen_random_uuid(),
  apartment_id uuid not null references living_apartments (id) on delete cascade,
  flat_id uuid not null references living_flats (id) on delete cascade,
  requested_by uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users (id)
);

create index if not exists living_flat_claims_apartment_id_idx on living_flat_claims (apartment_id, status);

-- ─── Maintenance ────────────────────────────────────────────────────────

-- `month` is the period's START date — despite the name, it's no longer
-- required to be the first of a calendar month or to span exactly one.
-- Some apartments bill maintenance every 2, 3, or 6 months on their own
-- cycle (e.g. a "September" bill covering Aug 1 - Aug 31 expenses); the
-- Admin picks period_start (stored as `month`, for minimal disruption to
-- everything already querying/ordering by that column) and period_end
-- explicitly when starting a new one. "The current period" is simply the
-- most recently started row (see getCurrentMaintenancePeriod() in
-- queries.ts) — not a lookup by today's calendar month.
create table if not exists living_maintenance_months (
  id uuid primary key default gen_random_uuid(),
  apartment_id uuid not null references living_apartments (id) on delete cascade,
  month date not null, -- period start
  -- [{ description, amount, comment, category }]
  line_items jsonb not null default '[]',
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  unique (apartment_id, month)
);

-- Water/tanker costs used to live here as `water_tanker_items` — moved to
-- living_water_supply_costs below (water supply is now part of the water
-- bill, not the common-maintenance split; see that table's own comment).
-- `if exists` makes this safe to re-run against a database that already
-- dropped it.
alter table living_maintenance_months drop column if exists water_tanker_items;

-- Period end date — added after `month` already existed as a plain
-- calendar-month anchor, so existing rows get backfilled to the last day
-- of that month (a real period, just one that happens to be exactly one
-- calendar month long) rather than left null.
alter table living_maintenance_months add column if not exists period_end date;
update living_maintenance_months set period_end = (month + interval '1 month' - interval '1 day')::date where period_end is null;
alter table living_maintenance_months alter column period_end set not null;

create index if not exists living_maintenance_months_apartment_id_idx on living_maintenance_months (apartment_id, month);

-- One row per flat per maintenance period — advance payment, late fee, and
-- the balance still outstanding from before this period, all Admin-entered.
-- previous_due is now auto-suggested (see startPeriodAction) from the prior
-- period's own total_due minus living_payments recorded against it, but
-- stays a plain editable column — the Admin can always override it. Feeds
-- directly into computeBillForFlat()'s total_due: maintenance + water +
-- late_fee + previous_due - advance_payment.
create table if not exists living_flat_ledger (
  id uuid primary key default gen_random_uuid(),
  apartment_id uuid not null references living_apartments (id) on delete cascade,
  maintenance_month_id uuid not null references living_maintenance_months (id) on delete cascade,
  flat_id uuid not null references living_flats (id) on delete cascade,
  advance_payment numeric not null default 0,
  late_fee numeric not null default 0,
  previous_due numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (maintenance_month_id, flat_id)
);

create index if not exists living_flat_ledger_period_idx on living_flat_ledger (maintenance_month_id);

drop policy if exists living_flat_ledger_select on living_flat_ledger;
create policy living_flat_ledger_select on living_flat_ledger for select
  using (apartment_id = living_my_apartment_id());
drop policy if exists living_flat_ledger_write on living_flat_ledger;
create policy living_flat_ledger_write on living_flat_ledger for all
  using (apartment_id = living_my_apartment_id() and living_my_role() in ('admin', 'treasurer'))
  with check (apartment_id = living_my_apartment_id() and living_my_role() in ('admin', 'treasurer'));

alter table living_flat_ledger enable row level security;

-- One row per actual payment received from a flat, against a specific
-- maintenance period — a flat can have several in one period (partial
-- payments over time). Sum of these against a period is that period's
-- "amount paid"; computeBillForFlat() derives payment_status/balance_remaining
-- from it, and starting a new period auto-suggests that new period's
-- previous_due from what's left unpaid on the one before it.
create table if not exists living_payments (
  id uuid primary key default gen_random_uuid(),
  apartment_id uuid not null references living_apartments (id) on delete cascade,
  maintenance_month_id uuid not null references living_maintenance_months (id) on delete cascade,
  flat_id uuid not null references living_flats (id) on delete cascade,
  amount numeric not null check (amount > 0),
  payment_date date not null default current_date,
  method text not null default 'other' check (method in ('cash', 'upi', 'bank_transfer', 'cheque', 'other')),
  reference_note text,
  recorded_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists living_payments_period_idx on living_payments (maintenance_month_id);
create index if not exists living_payments_flat_idx on living_payments (flat_id, payment_date desc);

drop policy if exists living_payments_select on living_payments;
create policy living_payments_select on living_payments for select
  using (apartment_id = living_my_apartment_id());
drop policy if exists living_payments_write on living_payments;
create policy living_payments_write on living_payments for all
  using (apartment_id = living_my_apartment_id() and living_my_role() in ('admin', 'treasurer'))
  with check (apartment_id = living_my_apartment_id() and living_my_role() in ('admin', 'treasurer'));

alter table living_payments enable row level security;

-- ─── Water ──────────────────────────────────────────────────────────────

create table if not exists living_water_readings (
  id uuid primary key default gen_random_uuid(),
  apartment_id uuid not null references living_apartments (id) on delete cascade,
  flat_id uuid not null references living_flats (id) on delete cascade,
  month date not null,
  previous_reading numeric,
  current_reading numeric,
  source_image text, -- Phase 1: unused (manual entry); column exists for Phase 2 OCR
  owner_note text,
  flagged boolean not null default false,
  flagged_note text,
  flagged_since date,
  -- { raised_by, reason, raised_at, status: open|reviewed|resolved, admin_response } or null.
  -- Owner-raised, separate from `flagged` (which is Admin-raised). Mutated
  -- only through living_raise_dispute()/living_resolve_dispute() below, not
  -- directly — see the note on column-level access at the bottom of this file.
  dispute jsonb,
  extraction_confidence numeric, -- Phase 2 (OCR); unused in Phase 1
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (apartment_id, flat_id, month)
);

create index if not exists living_water_readings_apartment_month_idx on living_water_readings (apartment_id, month);
create index if not exists living_water_readings_flat_idx on living_water_readings (flat_id, month desc);

create table if not exists living_slab_configs (
  id uuid primary key default gen_random_uuid(),
  apartment_id uuid not null references living_apartments (id) on delete cascade,
  effective_from date not null, -- applies going forward only; history stays untouched
  base_rate_per_1000l numeric not null,
  -- [{ from_liters, to_liters (null = unbounded), rate_multiplier }]
  slabs jsonb not null,
  grace_period_days int not null default 15,
  escalation_cadence text not null default 'monthly' check (escalation_cadence in ('weekly', 'monthly')),
  escalation_multiplier numeric not null default 2,
  rise_threshold_percent numeric not null default 20,
  notify_admin_at_streak int not null default 3,
  created_at timestamptz not null default now(),
  unique (apartment_id, effective_from)
);

create index if not exists living_slab_configs_apartment_id_idx on living_slab_configs (apartment_id, effective_from desc);

-- Versioned tanker rates, same effective_from pattern as living_slab_configs
-- — configured once by the Admin, not re-typed every month. Private tankers
-- come in 3 sizes (5k/10k/25k); government tankers come in 2 (5k/10k only —
-- no 25k government option). Majeera has no rate here at all — its amount
-- is entered fresh each month directly (see living_water_supply_costs), not
-- multiplied by anything.
create table if not exists living_tanker_rates (
  id uuid primary key default gen_random_uuid(),
  apartment_id uuid not null references living_apartments (id) on delete cascade,
  effective_from date not null,
  rate_small_5000l numeric not null default 0,
  rate_large_10000l numeric not null default 0,
  rate_xlarge_25000l numeric not null default 0,
  rate_govt_small_5000l numeric not null default 0,
  rate_govt_large_10000l numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (apartment_id, effective_from)
);

-- Replaces the single rate_govt_tanker column with the small/large split
-- above — safe to re-run against an already-seeded database. `create table
-- if not exists` above is a no-op on a table that already exists, so the
-- new columns need their own explicit `add column if not exists` too, not
-- just the old one's removal.
alter table living_tanker_rates add column if not exists rate_govt_small_5000l numeric not null default 0;
alter table living_tanker_rates add column if not exists rate_govt_large_10000l numeric not null default 0;
alter table living_tanker_rates drop column if exists rate_govt_tanker;

create index if not exists living_tanker_rates_apartment_id_idx on living_tanker_rates (apartment_id, effective_from desc);

-- One row per Apartment per month — NOT per flat, unlike living_water_readings.
-- This is the apartment-wide water-supply spend (tankers + Majeera) for the
-- month; computeBillForFlat() splits its total the same equal/weighted way
-- maintenance is split, then adds each flat's share on top of that flat's
-- own metered water charge. Deliberately separate from living_maintenance_months
-- — per the Admin's own framing, this is part of the WATER bill, not common
-- maintenance, even though it's still an apartment-wide (not per-flat) cost.
create table if not exists living_water_supply_costs (
  id uuid primary key default gen_random_uuid(),
  apartment_id uuid not null references living_apartments (id) on delete cascade,
  month date not null,
  small_tanker_count int not null default 0,
  large_tanker_count int not null default 0,
  xlarge_tanker_count int not null default 0,
  govt_small_tanker_count int not null default 0,
  govt_large_tanker_count int not null default 0,
  -- Government norm: 500L/day supplied per Majeera connection — this count
  -- times 500 times the days in the month is how many litres Majeera is
  -- assumed to have supplied, used only to suggest a base water rate (see
  -- suggestedBaseRatePer1000L in billing.ts) — never billed on its own.
  majeera_connection_count int not null default 0,
  majeera_amount numeric not null default 0,
  majeera_extra_enabled boolean not null default true,
  majeera_extra_amount numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (apartment_id, month)
);

alter table living_water_supply_costs add column if not exists majeera_connection_count int not null default 0;

-- Replaces the single govt_tanker_count column with the small/large split
-- above — safe to re-run against an already-seeded database (see the same
-- note on living_tanker_rates above for why these need an explicit add).
alter table living_water_supply_costs add column if not exists govt_small_tanker_count int not null default 0;
alter table living_water_supply_costs add column if not exists govt_large_tanker_count int not null default 0;
alter table living_water_supply_costs drop column if exists govt_tanker_count;

create index if not exists living_water_supply_costs_apartment_month_idx on living_water_supply_costs (apartment_id, month);

-- ─── Documents ──────────────────────────────────────────────────────────

create table if not exists living_bill_documents (
  id uuid primary key default gen_random_uuid(),
  apartment_id uuid not null references living_apartments (id) on delete cascade,
  month date not null,
  label text not null,
  category text,
  file_path text not null, -- key in the `living-documents` Storage bucket
  uploaded_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists living_bill_documents_apartment_month_idx on living_bill_documents (apartment_id, month);

-- ─── Access-control helpers ─────────────────────────────────────────────

create or replace function living_my_apartment_id() returns uuid
language sql stable security definer set search_path = public as $$
  select apartment_id from living_memberships where user_id = auth.uid() limit 1
$$;

create or replace function living_my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from living_memberships where user_id = auth.uid() limit 1
$$;

create or replace function living_owner_flat_id() returns uuid
language sql stable security definer set search_path = public as $$
  select flat_id from living_memberships where user_id = auth.uid() and role = 'owner' limit 1
$$;

create or replace function living_apartment_has_members(target_apartment_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from living_memberships where apartment_id = target_apartment_id)
$$;

-- ─── RLS ────────────────────────────────────────────────────────────────

alter table living_apartments enable row level security;
alter table living_flats enable row level security;
alter table living_memberships enable row level security;
alter table living_flat_claims enable row level security;
alter table living_maintenance_months enable row level security;
alter table living_water_readings enable row level security;
alter table living_slab_configs enable row level security;
alter table living_tanker_rates enable row level security;
alter table living_water_supply_costs enable row level security;
alter table living_bill_documents enable row level security;

-- Every policy below is preceded by `drop policy if exists` — `create
-- policy` has no `if not exists` form, so without this, re-running this
-- file by hand a second time (e.g. after tweaking something) would fail on
-- the first policy it hits instead of applying cleanly like the `create
-- table if not exists` statements above it.

-- living_apartments — read: any member, or the creator before their first
-- membership row exists (the create-apartment flow inserts the apartment
-- row first). Write: created_by can insert; only an admin can update.
drop policy if exists living_apartments_select on living_apartments;
create policy living_apartments_select on living_apartments for select
  using (id = living_my_apartment_id() or created_by = auth.uid());
drop policy if exists living_apartments_insert on living_apartments;
create policy living_apartments_insert on living_apartments for insert
  with check (created_by = auth.uid());
drop policy if exists living_apartments_update on living_apartments;
create policy living_apartments_update on living_apartments for update
  using (id = living_my_apartment_id() and living_my_role() = 'admin');

-- living_flats — read: any member. Write: admin only (per the spec's role
-- capability table — "set up apartment & flats" is Admin-only).
drop policy if exists living_flats_select on living_flats;
create policy living_flats_select on living_flats for select
  using (apartment_id = living_my_apartment_id());
drop policy if exists living_flats_write on living_flats;
create policy living_flats_write on living_flats for all
  using (apartment_id = living_my_apartment_id() and living_my_role() = 'admin')
  with check (apartment_id = living_my_apartment_id() and living_my_role() = 'admin');

-- living_memberships — read: any member of the same apartment. Insert has
-- two legitimate shapes: (a) a brand-new creator attaching themselves as
-- the apartment's first admin, (b) an existing admin adding someone else
-- (e.g. approving a claim). Update/delete (role changes, removal): admin only.
drop policy if exists living_memberships_select on living_memberships;
create policy living_memberships_select on living_memberships for select
  using (apartment_id = living_my_apartment_id());
drop policy if exists living_memberships_insert_self_admin on living_memberships;
create policy living_memberships_insert_self_admin on living_memberships for insert
  with check (
    user_id = auth.uid()
    and role = 'admin'
    and exists (select 1 from living_apartments a where a.id = apartment_id and a.created_by = auth.uid())
    and not living_apartment_has_members(apartment_id)
  );
drop policy if exists living_memberships_insert_by_admin on living_memberships;
create policy living_memberships_insert_by_admin on living_memberships for insert
  with check (apartment_id = living_my_apartment_id() and living_my_role() = 'admin');
drop policy if exists living_memberships_update on living_memberships;
create policy living_memberships_update on living_memberships for update
  using (apartment_id = living_my_apartment_id() and living_my_role() = 'admin');
drop policy if exists living_memberships_delete on living_memberships;
create policy living_memberships_delete on living_memberships for delete
  using (apartment_id = living_my_apartment_id() and living_my_role() = 'admin');

-- living_flat_claims — no direct insert/update policy at all: rows are only
-- ever written through living_join_apartment()/living_approve_claim() below
-- (both security definer), so RLS on this table only needs to gate reads.
drop policy if exists living_flat_claims_select on living_flat_claims;
create policy living_flat_claims_select on living_flat_claims for select
  using (requested_by = auth.uid() or (apartment_id = living_my_apartment_id() and living_my_role() = 'admin'));

-- living_maintenance_months — read: any member. Write: admin or treasurer
-- (Treasurer's spec capability is narrower — category-tagging only — but
-- Phase 1 doesn't split that out at the row level; full write access for
-- both, documented here as a deliberate simplification).
drop policy if exists living_maintenance_months_select on living_maintenance_months;
create policy living_maintenance_months_select on living_maintenance_months for select
  using (apartment_id = living_my_apartment_id());
drop policy if exists living_maintenance_months_write on living_maintenance_months;
create policy living_maintenance_months_write on living_maintenance_months for all
  using (apartment_id = living_my_apartment_id() and living_my_role() in ('admin', 'treasurer'))
  with check (apartment_id = living_my_apartment_id() and living_my_role() in ('admin', 'treasurer'));

-- living_water_readings — read: admin/treasurer see the whole apartment; an
-- Owner sees only their own flat's rows. Direct write (readings, flags):
-- admin only. The `dispute` and `owner_note` fields are never written
-- through this policy at all — only through the security-definer functions
-- below, which check the caller owns that specific flat before touching
-- just that one field (Postgres RLS has no column-level granularity, so
-- this is the substitute: no owner UPDATE policy on the table, only narrow
-- RPCs).
drop policy if exists living_water_readings_select on living_water_readings;
create policy living_water_readings_select on living_water_readings for select
  using (
    apartment_id = living_my_apartment_id()
    and (living_my_role() in ('admin', 'treasurer') or flat_id = living_owner_flat_id())
  );
drop policy if exists living_water_readings_admin_write on living_water_readings;
create policy living_water_readings_admin_write on living_water_readings for all
  using (apartment_id = living_my_apartment_id() and living_my_role() = 'admin')
  with check (apartment_id = living_my_apartment_id() and living_my_role() = 'admin');

-- living_slab_configs — read: any member (an Owner's bill view needs the
-- rates to explain a water charge). Write: admin only.
drop policy if exists living_slab_configs_select on living_slab_configs;
create policy living_slab_configs_select on living_slab_configs for select
  using (apartment_id = living_my_apartment_id());
drop policy if exists living_slab_configs_write on living_slab_configs;
create policy living_slab_configs_write on living_slab_configs for all
  using (apartment_id = living_my_apartment_id() and living_my_role() = 'admin')
  with check (apartment_id = living_my_apartment_id() and living_my_role() = 'admin');

-- living_tanker_rates — read: any member. Write: admin only.
drop policy if exists living_tanker_rates_select on living_tanker_rates;
create policy living_tanker_rates_select on living_tanker_rates for select
  using (apartment_id = living_my_apartment_id());
drop policy if exists living_tanker_rates_write on living_tanker_rates;
create policy living_tanker_rates_write on living_tanker_rates for all
  using (apartment_id = living_my_apartment_id() and living_my_role() = 'admin')
  with check (apartment_id = living_my_apartment_id() and living_my_role() = 'admin');

-- living_water_supply_costs — read: any member (an Owner's water-bill
-- breakdown needs it). Write: admin only, same as living_water_readings.
drop policy if exists living_water_supply_costs_select on living_water_supply_costs;
create policy living_water_supply_costs_select on living_water_supply_costs for select
  using (apartment_id = living_my_apartment_id());
drop policy if exists living_water_supply_costs_write on living_water_supply_costs;
create policy living_water_supply_costs_write on living_water_supply_costs for all
  using (apartment_id = living_my_apartment_id() and living_my_role() = 'admin')
  with check (apartment_id = living_my_apartment_id() and living_my_role() = 'admin');

-- living_bill_documents — read: any member. Write: admin or treasurer.
drop policy if exists living_bill_documents_select on living_bill_documents;
create policy living_bill_documents_select on living_bill_documents for select
  using (apartment_id = living_my_apartment_id());
drop policy if exists living_bill_documents_write on living_bill_documents;
create policy living_bill_documents_write on living_bill_documents for all
  using (apartment_id = living_my_apartment_id() and living_my_role() in ('admin', 'treasurer'))
  with check (apartment_id = living_my_apartment_id() and living_my_role() in ('admin', 'treasurer'));

-- ─── RPCs ───────────────────────────────────────────────────────────────
-- Multi-step or cross-user operations that don't map to a single
-- RLS-checked row write. All security definer, all re-check authorization
-- explicitly inside the function body rather than relying on the table
-- policies above (which mostly don't apply to these paths at all).

create or replace function living_generate_join_code() returns text
language plpgsql as $$
declare
  v_code text;
  v_exists boolean;
begin
  loop
    v_code := upper(substr(md5(random()::text), 1, 4) || '-' || substr(md5(random()::text), 1, 4));
    select exists (select 1 from living_apartments where join_code = v_code) into v_exists;
    exit when not v_exists;
  end loop;
  return v_code;
end;
$$;

-- Creates the Apartment and attaches the caller as its first Admin,
-- atomically — two separate inserts from the client would otherwise race
-- against living_apartment_has_members() for a caller creating more than
-- one apartment concurrently (not a real scenario, but this closes it).
create or replace function living_create_apartment(
  p_name text, p_address text, p_admin_contact text, p_flat_split text default 'equal', p_flat_count int default 1
)
returns living_apartments
language plpgsql security definer set search_path = public as $$
declare
  v_apartment living_apartments%rowtype;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if exists (select 1 from living_memberships where user_id = auth.uid()) then
    raise exception 'this account already belongs to an apartment';
  end if;
  if p_flat_count < 1 or p_flat_count > 30 then
    raise exception 'flat count must be between 1 and 30';
  end if;

  insert into living_apartments (name, address, admin_contact, join_code, flat_split, flat_count, created_by)
  values (p_name, p_address, p_admin_contact, living_generate_join_code(), coalesce(p_flat_split, 'equal'), p_flat_count, auth.uid())
  returning * into v_apartment;

  insert into living_memberships (user_id, apartment_id, role) values (auth.uid(), v_apartment.id, 'admin');

  return v_apartment;
end;
$$;

-- Owner self-serve join: matches the flat's owner_contact against the
-- caller's own auth identity for immediate attach; otherwise queues a
-- living_flat_claims row for Admin approval (setup workflow step 3).
create or replace function living_join_apartment(p_join_code text, p_flat_no text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_apartment_id uuid;
  v_flat living_flats%rowtype;
  v_user_email text;
  v_user_phone text;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if exists (select 1 from living_memberships where user_id = auth.uid()) then
    raise exception 'this account already belongs to an apartment';
  end if;

  select id into v_apartment_id from living_apartments where join_code = upper(p_join_code);
  if v_apartment_id is null then raise exception 'invalid join code'; end if;

  select * into v_flat from living_flats where apartment_id = v_apartment_id and flat_no = p_flat_no;
  if v_flat.id is null then raise exception 'flat % not found in this apartment', p_flat_no; end if;
  if exists (select 1 from living_memberships where flat_id = v_flat.id) then
    raise exception 'that flat is already claimed';
  end if;

  select email, phone into v_user_email, v_user_phone from auth.users where id = auth.uid();

  if v_flat.owner_contact is not null and v_flat.owner_contact in (v_user_email, v_user_phone) then
    insert into living_memberships (user_id, apartment_id, role, flat_id) values (auth.uid(), v_apartment_id, 'owner', v_flat.id);
    return jsonb_build_object('status', 'attached');
  else
    insert into living_flat_claims (apartment_id, flat_id, requested_by) values (v_apartment_id, v_flat.id, auth.uid());
    return jsonb_build_object('status', 'pending');
  end if;
end;
$$;

create or replace function living_approve_claim(p_claim_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_claim living_flat_claims%rowtype;
begin
  if living_my_role() <> 'admin' then raise exception 'only an admin can approve flat claims'; end if;

  select * into v_claim from living_flat_claims where id = p_claim_id and apartment_id = living_my_apartment_id() and status = 'pending';
  if v_claim.id is null then raise exception 'claim not found'; end if;

  insert into living_memberships (user_id, apartment_id, role, flat_id) values (v_claim.requested_by, v_claim.apartment_id, 'owner', v_claim.flat_id);
  update living_flat_claims set status = 'approved', decided_at = now(), decided_by = auth.uid() where id = p_claim_id;
end;
$$;

create or replace function living_reject_claim(p_claim_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if living_my_role() <> 'admin' then raise exception 'only an admin can reject flat claims'; end if;
  update living_flat_claims set status = 'rejected', decided_at = now(), decided_by = auth.uid()
    where id = p_claim_id and apartment_id = living_my_apartment_id() and status = 'pending';
end;
$$;

-- Owner-only, one field: raises or overwrites their own flat's open dispute
-- for a given reading. Never touches previous_reading/current_reading/flagged.
create or replace function living_raise_dispute(p_reading_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare v_flat_id uuid;
begin
  select flat_id into v_flat_id from living_water_readings where id = p_reading_id;
  if v_flat_id is null or v_flat_id <> living_owner_flat_id() then raise exception 'not authorized'; end if;

  update living_water_readings
    set dispute = jsonb_build_object('raised_by', auth.uid(), 'reason', p_reason, 'raised_at', now(), 'status', 'open', 'admin_response', null),
        updated_at = now()
    where id = p_reading_id;
end;
$$;

-- Admin/treasurer-only: respond to a dispute, without touching the reading itself.
create or replace function living_resolve_dispute(p_reading_id uuid, p_status text, p_admin_response text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if living_my_role() not in ('admin', 'treasurer') then raise exception 'not authorized'; end if;
  if p_status not in ('open', 'reviewed', 'resolved') then raise exception 'invalid status'; end if;
  if not exists (select 1 from living_water_readings where id = p_reading_id and apartment_id = living_my_apartment_id()) then
    raise exception 'not found';
  end if;

  update living_water_readings
    set dispute = dispute || jsonb_build_object('status', p_status, 'admin_response', p_admin_response),
        updated_at = now()
    where id = p_reading_id;
end;
$$;

-- Owner-only, one field: their own free-text context note on their own reading.
create or replace function living_set_reading_note(p_reading_id uuid, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare v_flat_id uuid;
begin
  select flat_id into v_flat_id from living_water_readings where id = p_reading_id;
  if v_flat_id is null or v_flat_id <> living_owner_flat_id() then raise exception 'not authorized'; end if;

  update living_water_readings set owner_note = p_note, updated_at = now() where id = p_reading_id;
end;
$$;

-- ─── Storage — bill/payment documents ──────────────────────────────────
-- Private bucket; objects are stored at `${apartment_id}/${filename}`, so
-- storage.foldername(name)[1] is the tenant boundary, same as apartment_id
-- everywhere else in this file. Access goes through short-lived signed URLs
-- generated server-side (lib/living/documents.ts) — the bucket itself is
-- never public.

insert into storage.buckets (id, name, public)
values ('living-documents', 'living-documents', false)
on conflict (id) do nothing;

drop policy if exists living_documents_select on storage.objects;
create policy living_documents_select on storage.objects for select
  using (bucket_id = 'living-documents' and (storage.foldername(name))[1] = living_my_apartment_id()::text);

drop policy if exists living_documents_insert on storage.objects;
create policy living_documents_insert on storage.objects for insert
  with check (
    bucket_id = 'living-documents'
    and (storage.foldername(name))[1] = living_my_apartment_id()::text
    and living_my_role() in ('admin', 'treasurer')
  );

-- ─── Operational registers (Admin/Treasurer-only, not Owner-facing) ────────
-- Pending works, inventory, and service providers — none of this affects
-- billing math; it's the Admin/Treasurer's own operational record-keeping,
-- so unlike living_flat_ledger/living_payments (which Owners can read their
-- own numbers from), select here is admin/treasurer only, same as write.

-- A work item or cost identified but not yet folded into any published
-- maintenance line item — the `reason` free-text is deliberately open-ended
-- ("waiting on quotes", "deferred to next cycle", "budget not approved yet")
-- rather than a fixed enum, since the actual reasons vary too much to
-- usefully constrain. Resolving one is a manual call, not automatic —
-- there's no attempt to detect "this got added to maintenance," since a
-- resolved item might also just get dropped entirely.
create table if not exists living_pending_items (
  id uuid primary key default gen_random_uuid(),
  apartment_id uuid not null references living_apartments (id) on delete cascade,
  description text not null,
  amount numeric not null default 0,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'resolved')),
  raised_at date not null default current_date,
  resolved_at timestamptz,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists living_pending_items_apartment_idx on living_pending_items (apartment_id, status);

drop policy if exists living_pending_items_select on living_pending_items;
create policy living_pending_items_select on living_pending_items for select
  using (apartment_id = living_my_apartment_id() and living_my_role() in ('admin', 'treasurer'));
drop policy if exists living_pending_items_write on living_pending_items;
create policy living_pending_items_write on living_pending_items for all
  using (apartment_id = living_my_apartment_id() and living_my_role() in ('admin', 'treasurer'))
  with check (apartment_id = living_my_apartment_id() and living_my_role() in ('admin', 'treasurer'));

alter table living_pending_items enable row level security;

create table if not exists living_inventory_items (
  id uuid primary key default gen_random_uuid(),
  apartment_id uuid not null references living_apartments (id) on delete cascade,
  item_name text not null,
  quantity numeric not null default 1,
  unit text,
  location text,
  notes text,
  purchased_on date,
  value numeric,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists living_inventory_items_apartment_idx on living_inventory_items (apartment_id);

drop policy if exists living_inventory_items_select on living_inventory_items;
create policy living_inventory_items_select on living_inventory_items for select
  using (apartment_id = living_my_apartment_id() and living_my_role() in ('admin', 'treasurer'));
drop policy if exists living_inventory_items_write on living_inventory_items;
create policy living_inventory_items_write on living_inventory_items for all
  using (apartment_id = living_my_apartment_id() and living_my_role() in ('admin', 'treasurer'))
  with check (apartment_id = living_my_apartment_id() and living_my_role() in ('admin', 'treasurer'));

alter table living_inventory_items enable row level security;

create table if not exists living_service_providers (
  id uuid primary key default gen_random_uuid(),
  apartment_id uuid not null references living_apartments (id) on delete cascade,
  name text not null,
  phone text not null,
  service_type text not null,
  notes text,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists living_service_providers_apartment_idx on living_service_providers (apartment_id);

drop policy if exists living_service_providers_select on living_service_providers;
create policy living_service_providers_select on living_service_providers for select
  using (apartment_id = living_my_apartment_id() and living_my_role() in ('admin', 'treasurer'));
drop policy if exists living_service_providers_write on living_service_providers;
create policy living_service_providers_write on living_service_providers for all
  using (apartment_id = living_my_apartment_id() and living_my_role() in ('admin', 'treasurer'))
  with check (apartment_id = living_my_apartment_id() and living_my_role() in ('admin', 'treasurer'));

alter table living_service_providers enable row level security;

alter table living_inventory_items add column if not exists category text;

-- Inventory Categories/Units and Service Types are shared master data across
-- every apartment on the platform, not scoped per apartment_id — any
-- admin/treasurer contributes to (and everyone in that role reads from) one
-- common catalog, the same way a shared reference list works. Each table
-- started out apartment-scoped; the "drop column if exists" + "create index
-- if not exists" pair below migrates an already-applied DB to the shared
-- shape in place (and is a no-op on a fresh install, where the table is
-- created directly in the shared shape).
create table if not exists living_inventory_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

-- Old apartment-scoped policies reference apartment_id, so they have to go
-- before the column drop below (Postgres won't drop a column a policy
-- depends on).
drop policy if exists living_inventory_categories_select on living_inventory_categories;
drop policy if exists living_inventory_categories_write on living_inventory_categories;

alter table living_inventory_categories drop column if exists apartment_id;
create unique index if not exists living_inventory_categories_name_key on living_inventory_categories (name);

create policy living_inventory_categories_select on living_inventory_categories for select
  using (living_my_role() in ('admin', 'treasurer'));
create policy living_inventory_categories_write on living_inventory_categories for all
  using (living_my_role() in ('admin', 'treasurer'))
  with check (living_my_role() in ('admin', 'treasurer'));

alter table living_inventory_categories enable row level security;

create table if not exists living_inventory_units (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

drop policy if exists living_inventory_units_select on living_inventory_units;
drop policy if exists living_inventory_units_write on living_inventory_units;

alter table living_inventory_units drop column if exists apartment_id;
create unique index if not exists living_inventory_units_name_key on living_inventory_units (name);

create policy living_inventory_units_select on living_inventory_units for select
  using (living_my_role() in ('admin', 'treasurer'));
create policy living_inventory_units_write on living_inventory_units for all
  using (living_my_role() in ('admin', 'treasurer'))
  with check (living_my_role() in ('admin', 'treasurer'));

alter table living_inventory_units enable row level security;

create table if not exists living_service_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

drop policy if exists living_service_types_select on living_service_types;
drop policy if exists living_service_types_write on living_service_types;

alter table living_service_types drop column if exists apartment_id;
create unique index if not exists living_service_types_name_key on living_service_types (name);

create policy living_service_types_select on living_service_types for select
  using (living_my_role() in ('admin', 'treasurer'));
create policy living_service_types_write on living_service_types for all
  using (living_my_role() in ('admin', 'treasurer'))
  with check (living_my_role() in ('admin', 'treasurer'));

alter table living_service_types enable row level security;

drop policy if exists living_documents_delete on storage.objects;
create policy living_documents_delete on storage.objects for delete
  using (
    bucket_id = 'living-documents'
    and (storage.foldername(name))[1] = living_my_apartment_id()::text
    and living_my_role() in ('admin', 'treasurer')
  );
