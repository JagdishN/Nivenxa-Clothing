-- Nivenxa Living — Reimbursement/Ledger accounting subsystem + Expenses module redesign.
-- Apply after living_schema.sql (npm run apply-schema -- supabase/living_reimbursements_schema.sql).
-- Every statement is idempotent (if not exists / on conflict do nothing) so it's safe to re-run.

-- ── living_expenses: who paid, provenance, recurrence, and void/reverse ──────────────────────

alter table living_expenses add column if not exists paid_by text not null default 'association'
  check (paid_by in ('association', 'resident'));
alter table living_expenses add column if not exists resident_flat_id uuid references living_flats (id) on delete set null;
alter table living_expenses add column if not exists receipt_path text;
alter table living_expenses add column if not exists expense_notes text;
alter table living_expenses add column if not exists approved_by uuid references auth.users (id);
alter table living_expenses add column if not exists approved_at timestamptz;
-- resident_flat_id required iff paid_by = 'resident' — enforced in recordExpenseAction, same
-- convention as other conditional-required fields in this schema.

-- Sync provenance + a real dedup identity, replacing the old category-string match.
alter table living_expenses add column if not exists source text not null default 'manual'
  check (source in ('manual', 'maintenance_sync', 'water_sync'));
alter table living_expenses add column if not exists source_ref text;
create unique index if not exists living_expenses_source_ref_key
  on living_expenses (maintenance_month_id, source_ref) where source_ref is not null;

-- Denormalized from the chosen category at insert time — see living_expense_categories.is_recurring.
alter table living_expenses add column if not exists is_recurring boolean;

-- Soft void/reverse — never a hard delete once an expense is financially referenced (has a
-- reimbursement settlement, has had carry-forward already applied, or came from a sync).
alter table living_expenses add column if not exists voided_at timestamptz;
alter table living_expenses add column if not exists voided_by uuid references auth.users (id);
alter table living_expenses add column if not exists void_reason text;

create index if not exists living_expenses_resident_flat_idx on living_expenses (resident_flat_id) where resident_flat_id is not null;

-- ── living_expense_categories: system vs apartment scope ─────────────────────────────────────
-- Previously one shared list platform-wide (same pattern as living_inventory_categories) — right
-- for genuinely universal categories, wrong here since an apartment can have its own local ones
-- (e.g. a festival specific to that building). apartment_id null = system category, seeded once
-- below, read-only to apartment admins; non-null = that apartment's own.

alter table living_expense_categories alter column created_by drop not null;
alter table living_expense_categories add column if not exists apartment_id uuid references living_apartments (id) on delete cascade;
alter table living_expense_categories add column if not exists is_recurring boolean;
alter table living_expense_categories add column if not exists is_active boolean not null default true;

drop policy if exists living_expense_categories_select on living_expense_categories;
drop policy if exists living_expense_categories_write on living_expense_categories;
drop index if exists living_expense_categories_name_key;

-- System rows unique by name; each apartment's own rows unique by (apartment_id, name) — the same
-- name can exist once system-wide AND once per apartment without conflict.
create unique index if not exists living_expense_categories_system_name_key
  on living_expense_categories (name) where apartment_id is null;
create unique index if not exists living_expense_categories_apartment_name_key
  on living_expense_categories (apartment_id, name) where apartment_id is not null;

create policy living_expense_categories_select on living_expense_categories for select
  using (apartment_id is null or apartment_id = living_my_apartment_id());
create policy living_expense_categories_write on living_expense_categories for all
  using (apartment_id = living_my_apartment_id() and living_my_role() in ('admin', 'treasurer'))
  with check (apartment_id = living_my_apartment_id() and living_my_role() in ('admin', 'treasurer'));
-- Note: this policy can never write an apartment_id IS NULL row — system categories are SQL-seeded
-- only, never creatable from the app, by design (see Decision 10 in the plan).

insert into living_expense_categories (name, apartment_id, is_recurring) values
  ('Electricity', null, true),
  ('Water', null, true),
  ('Salary', null, true),
  ('Lift Maintenance', null, true),
  ('Cleaning', null, true),
  ('Repairs', null, false),
  ('Garbage', null, true),
  ('Security', null, true),
  ('Generator/Diesel', null, true),
  ('Plumbing', null, false),
  ('Electrical', null, false),
  ('Miscellaneous', null, false)
on conflict do nothing;

-- ── Reimbursement settlements — append-only, modeled on living_advance_transfers ─────────────
-- No delete/undo action: every settlement stays in history permanently; a correction is a new
-- compensating settlement row, never an edit or delete.

create table if not exists living_reimbursement_settlements (
  id uuid primary key default gen_random_uuid(),
  apartment_id uuid not null references living_apartments (id) on delete cascade,
  expense_id uuid not null references living_expenses (id) on delete cascade,
  flat_id uuid not null references living_flats (id) on delete cascade,
  settlement_type text not null check (settlement_type in ('cash', 'bill_adjustment')),
  amount numeric not null check (amount > 0),
  -- Only meaningful for 'bill_adjustment' (which period's bill it reduced) but stamped for 'cash'
  -- too, so computeFinancialStatements' cash walk can bucket a cash payout by period like every
  -- other cash movement it already sums.
  maintenance_month_id uuid references living_maintenance_months (id) on delete set null,
  note text,
  settled_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists living_reimb_settlements_expense_idx on living_reimbursement_settlements (expense_id);
create index if not exists living_reimb_settlements_flat_idx on living_reimbursement_settlements (flat_id);

alter table living_reimbursement_settlements enable row level security;
drop policy if exists living_reimb_settlements_admin_all on living_reimbursement_settlements;
create policy living_reimb_settlements_admin_all on living_reimbursement_settlements for all
  using (exists (select 1 from living_memberships m where m.apartment_id = living_reimbursement_settlements.apartment_id
    and m.user_id = auth.uid() and m.role in ('admin', 'treasurer')))
  with check (exists (select 1 from living_memberships m where m.apartment_id = living_reimbursement_settlements.apartment_id
    and m.user_id = auth.uid() and m.role in ('admin', 'treasurer')));

-- ── Misc ───────────────────────────────────────────────────────────────────────────────────

-- Due date on a maintenance period — defaults to period_end, admin-editable when starting a period.
alter table living_maintenance_months add column if not exists due_date date;

-- Bank/UPI instructions shown on a bill's "Pay Now" — no payment gateway, just instructions on file.
alter table living_apartments add column if not exists payment_instructions text;

-- ── Receipts bucket — same private-bucket shape as living-documents ──────────────────────────

insert into storage.buckets (id, name, public) values ('expense-receipts', 'expense-receipts', false)
on conflict (id) do nothing;

drop policy if exists living_expense_receipts_select on storage.objects;
create policy living_expense_receipts_select on storage.objects for select
  using (
    bucket_id = 'expense-receipts'
    and (storage.foldername(name))[1] = living_my_apartment_id()::text
  );

drop policy if exists living_expense_receipts_write on storage.objects;
create policy living_expense_receipts_write on storage.objects for all
  using (
    bucket_id = 'expense-receipts'
    and (storage.foldername(name))[1] = living_my_apartment_id()::text
    and living_my_role() in ('admin', 'treasurer')
  )
  with check (
    bucket_id = 'expense-receipts'
    and (storage.foldername(name))[1] = living_my_apartment_id()::text
    and living_my_role() in ('admin', 'treasurer')
  );
