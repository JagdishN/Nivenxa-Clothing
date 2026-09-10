export type LivingRole = 'admin' | 'treasurer' | 'owner'
export type SplitMode = 'equal' | 'weighted'
export type EscalationCadence = 'weekly' | 'monthly'
export type MaintenanceStatus = 'draft' | 'published'
export type ClaimStatus = 'pending' | 'approved' | 'rejected'
export type DisputeStatus = 'open' | 'reviewed' | 'resolved'

export interface Apartment {
  id: string
  name: string
  address: string
  admin_contact: string
  join_code: string
  flat_split: SplitMode
  /** The Admin's own intended flat count for this building — editable later. 30 is only the platform ceiling on it. */
  flat_count: number
  /** Overrides the divisor for equal-split common costs (maintenance + water-supply pool) — null means "use flats.length" as before. */
  shared_cost_divisor: number | null
  /** The association's real cash position before Living started tracking it — a one-time seed for Financial Statements. Null is treated as 0. */
  opening_cash_balance: number | null
  created_by: string
  created_at: string
}

export interface Flat {
  id: string
  apartment_id: string
  flat_no: string
  owner_name: string | null
  owner_contact: string | null
  sq_ft: number | null
  share_override: number | null
  /** A shared/common meter (e.g. flat_no "common") — never gets a personal bill, excluded from the equal-split divisor. */
  excluded_from_billing: boolean
  /** Set for a second-meter flat (same owner as another unit) — its water charge is added into the target flat's, and it's dropped from per-flat billing views. */
  merged_into_flat_id: string | null
  created_at: string
}

export interface Membership {
  id: string
  user_id: string
  apartment_id: string
  role: LivingRole
  flat_id: string | null
  created_at: string
}

export interface FlatClaim {
  id: string
  apartment_id: string
  flat_id: string
  requested_by: string
  status: ClaimStatus
  requested_at: string
  decided_at: string | null
  decided_by: string | null
  /** Snapshot of the requester's own auth identity at request time — an Admin's session can't read auth.users directly. */
  requester_email: string | null
  requester_phone: string | null
}

export interface MaintenanceLineItem {
  description: string
  amount: number
  comment?: string
  category?: string
}

export interface MaintenanceMonth {
  id: string
  apartment_id: string
  /** Period START date — despite the name, not required to be a calendar-month boundary or span exactly one month. See period_end. */
  month: string
  /** Period end date, Admin-chosen — together with `month` this is the actual billed date range, shown verbatim on bills. */
  period_end: string
  line_items: MaintenanceLineItem[]
  status: MaintenanceStatus
  published_at: string | null
  created_by: string
  created_at: string
}

export interface Dispute {
  raised_by: string
  reason: string
  raised_at: string
  status: DisputeStatus
  admin_response: string | null
}

export interface WaterReading {
  id: string
  apartment_id: string
  flat_id: string
  month: string
  previous_reading: number | null
  current_reading: number | null
  source_image: string | null
  owner_note: string | null
  flagged: boolean
  flagged_note: string | null
  flagged_since: string | null
  dispute: Dispute | null
  extraction_confidence: number | null
  created_at: string
  updated_at: string
}

export interface SlabTier {
  from_liters: number
  to_liters: number | null // null = unbounded
  rate_multiplier: number
}

export type WaterBillingMethod = 'standard' | 'slab'
export type SlabCalculationMethod = 'progressive' | 'whole_consumption'

export interface SlabConfig {
  id: string
  apartment_id: string
  effective_from: string
  /** Vestigial — the base rate is always the live monthly combined rate (getCombinedWaterRate), never admin-entered. */
  base_rate_per_1000l: number
  /** water_billing_method 'slab': multiplies that month's dynamic base rate per band — never a fixed rupee amount. */
  slabs: SlabTier[]
  water_billing_method: WaterBillingMethod
  slab_calculation_method: SlabCalculationMethod
  grace_period_days: number
  escalation_cadence: EscalationCadence
  escalation_multiplier: number
  rise_threshold_percent: number
  notify_admin_at_streak: number
  created_at: string
}

/** One tier's contribution to a slab-billed water charge — progressive has one entry per tier touched; whole_consumption has exactly one, covering all consumption. */
export interface WaterTierBreakdownEntry {
  from_liters: number
  to_liters: number | null
  rate_multiplier: number
  /** The resolved ₹/1,000L for this tier at this month's base rate (base_rate_per_1000l × rate_multiplier). */
  rate: number
  liters_billed: number
  amount: number
}

/**
 * The frozen record of how a flat's water charge for a past month was
 * actually calculated — written lazily the first time that month is
 * computed (see getMeteredWaterCharge in queries.ts), immune to later
 * edits of slab config / tanker counts / readings for that month.
 */
export interface WaterBillSnapshot {
  id: string
  apartment_id: string
  flat_id: string
  month: string
  consumption_liters: number | null
  base_rate_per_1000l: number
  billing_method: WaterBillingMethod
  slab_calculation_method: SlabCalculationMethod | null
  slab_config_id: string | null
  tier_breakdown: WaterTierBreakdownEntry[] | null
  computed_charge: number
  manual_adjustment: number
  adjustment_reason: string | null
  adjustment_by: string | null
  adjustment_at: string | null
  final_charge: number
  created_at: string
  updated_at: string
}

export interface BillDocument {
  id: string
  apartment_id: string
  month: string
  label: string
  category: string | null
  file_path: string
  uploaded_by: string
  created_at: string
}

/** Versioned like SlabConfig — configured once by the Admin, not re-typed monthly. */
export interface TankerRates {
  id: string
  apartment_id: string
  effective_from: string
  rate_small_5000l: number
  rate_large_10000l: number
  rate_xlarge_25000l: number
  rate_govt_small_5000l: number
  rate_govt_large_10000l: number
  created_at: string
}

/**
 * One row per Apartment per month (not per flat) — the water-supply spend
 * that feeds the combined ₹/1,000L rate every flat's own metered
 * consumption is billed at (see lib/living/queries.ts's getCombinedWaterRate).
 * Majeera has no rate — its amount (and optional extra) is typed directly
 * each month.
 */
export interface WaterSupplyCost {
  id: string
  apartment_id: string
  month: string
  small_tanker_count: number
  large_tanker_count: number
  xlarge_tanker_count: number
  govt_small_tanker_count: number
  govt_large_tanker_count: number
  /** Government norm: 500L/day supplied per connection — feeds the combined water rate directly. */
  majeera_connection_count: number
  majeera_amount: number
  majeera_extra_enabled: boolean
  majeera_extra_amount: number | null
  /** Cumulative unresolved over/under-recovery as of the end of this month — null until first needed. See getIncomingGap. */
  carried_gap: number | null
  created_at: string
  updated_at: string
}

/** One flat's advance payment / late fee / carried-forward due for a maintenance period — Admin-entered, see the schema comment. */
export interface FlatLedgerEntry {
  id: string
  apartment_id: string
  maintenance_month_id: string
  flat_id: string
  advance_payment: number
  late_fee: number
  previous_due: number
  created_at: string
  updated_at: string
}

/** A record of one advance-balance move between two flats' ledger rows for the same period — see transferAdvanceAction/deleteAdvanceTransferAction in maintenance/page.tsx. */
export interface AdvanceTransfer {
  id: string
  apartment_id: string
  maintenance_month_id: string
  from_flat_id: string
  to_flat_id: string
  amount: number
  transferred_by: string | null
  created_at: string
}

/** 'advance' is system-written only — see syncAdvanceApplicationPayment in queries.ts — never a manually-selectable option in the Record Payment form. */
export type PaymentMethod = 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'other' | 'advance'
export type PaymentStatus = 'unpaid' | 'partial' | 'paid'

/** One actual payment received from a flat against a specific maintenance period — see the schema comment. */
export interface Payment {
  id: string
  apartment_id: string
  maintenance_month_id: string
  flat_id: string
  amount: number
  payment_date: string
  method: PaymentMethod
  reference_note: string | null
  /** e.g. "NXL-2026-09-0102-001" — generated once at insert time, null on any row recorded before receipts existed. */
  receipt_no: string | null
  recorded_by: string
  created_at: string
}

/** One actual expense paid out by the apartment against a specific maintenance period — the outgoing counterpart to Payment. */
export interface Expense {
  id: string
  apartment_id: string
  maintenance_month_id: string
  expense_date: string
  category: string | null
  description: string
  amount: number
  paid_to: string | null
  method: PaymentMethod
  reference_note: string | null
  /** Total number of future billing cycles this expense's amount should be spread across — null/0 means it's a one-off, never fed into a future Maintenance line item. 1 = "Include in next bill cycle"; >1 = "Split across months". */
  carry_forward_months: number | null
  /** How many of those cycles are still left to apply — decremented by startPeriodAction each time a new period picks up its share. */
  carry_forward_remaining: number | null
  recorded_by: string
  created_at: string
}

/** Shared master data, same list across every apartment on the platform — not scoped to one apartment_id. */
export interface ExpenseCategory {
  id: string
  name: string
  created_by: string
  created_at: string
}

/** Shared master data, same list across every apartment on the platform — e.g. Ganesh Puja, Durga Puja, Diwali. */
export interface EventCategory {
  id: string
  name: string
  created_by: string
  created_at: string
}

/** One specific occurrence of a community event — not part of the Maintenance billing cycle at all. */
export interface LivingEvent {
  id: string
  apartment_id: string
  category: string | null
  name: string
  event_date: string | null
  notes: string | null
  created_by: string
  created_at: string
}

/** Money collected towards an event — the event equivalent of Payment. */
export interface EventCollection {
  id: string
  apartment_id: string
  event_id: string
  amount: number
  collected_date: string
  contributor_name: string | null
  flat_id: string | null
  method: PaymentMethod
  reference_note: string | null
  recorded_by: string
  created_at: string
}

/** Money spent on an event — the event equivalent of Expense. */
export interface EventExpense {
  id: string
  apartment_id: string
  event_id: string
  amount: number
  expense_date: string
  description: string
  paid_to: string | null
  method: PaymentMethod
  reference_note: string | null
  recorded_by: string
  created_at: string
}

export type PendingItemStatus = 'pending' | 'resolved'

/** A work item or cost identified but not yet folded into any published maintenance line item. */
export interface PendingItem {
  id: string
  apartment_id: string
  description: string
  amount: number
  reason: string | null
  status: PendingItemStatus
  raised_at: string
  resolved_at: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface InventoryItem {
  id: string
  apartment_id: string
  item_name: string
  quantity: number
  unit: string | null
  location: string | null
  category: string | null
  notes: string | null
  purchased_on: string | null
  value: number | null
  created_by: string
  created_at: string
  updated_at: string
}

/** Shared master data, same list across every apartment on the platform — not scoped to one apartment_id. */
export interface InventoryCategory {
  id: string
  name: string
  created_by: string
  created_at: string
}

export interface InventoryUnit {
  id: string
  name: string
  created_by: string
  created_at: string
}

export interface ServiceProvider {
  id: string
  apartment_id: string
  name: string
  phone: string
  service_type: string
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

/** Shared master data, same list across every apartment on the platform — not scoped to one apartment_id. */
export interface ServiceType {
  id: string
  name: string
  created_by: string
  created_at: string
}

/** Computed at read time — never stored (except the ledger amounts folded into it, which ARE stored, per flat per period). See lib/living/billing.ts. */
export interface Bill {
  flat_id: string
  month: string
  maintenance_share: number
  /** The maintenance period actually billed — null when no period has ever been created. Its range may not match `month`. */
  maintenance_period: { start: string; end: string } | null
  /** This flat's own consumption this month — null while flagged/no reading yet. For the "3,000L × ₹30/1,000L" breakdown. */
  water_consumption_liters: number | null
  /** The combined ₹/1,000L rate actually applied — null while flagged/no reading yet. See lib/living/queries.ts's getCombinedWaterRate. */
  water_rate_per_1000l: number | null
  /** 'standard' = flat consumption × water_rate_per_1000l; 'slab' = water_tier_breakdown applies. Null while flagged/no reading yet. */
  water_billing_method: WaterBillingMethod | null
  /** Set only when water_billing_method is 'slab' — which of the two slab interpretations produced water_tier_breakdown. */
  water_slab_calculation_method: SlabCalculationMethod | null
  /** Per-tier detail when water_billing_method is 'slab' — null for 'standard' billing or the broken-meter fallback. */
  water_tier_breakdown: WaterTierBreakdownEntry[] | null
  /** Admin-entered correction on top of the computed charge, 0 when none. Included in water_charge already. */
  water_manual_adjustment: number
  /** water_consumption_liters/1000 × water_rate_per_1000l, or the slab-computed amount (see water_tier_breakdown), plus water_manual_adjustment — or the broken-meter fallback amount. */
  water_charge: number
  /** maintenance_share + water_charge — this period's own charge, before late fee/previous due/advance adjustments. */
  current_period_total: number
  advance_payment: number
  late_fee: number
  previous_due: number
  /** maintenance_share + water_charge + late_fee + previous_due - advance_payment, rounded to 2 decimals. */
  total_due: number
  /** Sum of living_payments recorded against this flat for the current period. */
  amount_paid: number
  /** total_due - amount_paid — what's still left to collect for this period (can go negative if overpaid). */
  balance_remaining: number
  payment_status: PaymentStatus
  water_is_fallback: boolean
  water_fallback_reason: string | null
}

/** An apartment-wide announcement — no draft state, posting is immediate. */
export interface Notice {
  id: string
  apartment_id: string
  title: string
  body: string
  created_by: string
  created_at: string
}

/** One association meeting — `mom` is only ever shown once `mom_published_at` is set. */
export interface Meeting {
  id: string
  apartment_id: string
  title: string
  meeting_date: string
  agenda: string | null
  mom: string | null
  mom_published_at: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type RequestStatus = 'open' | 'in_progress' | 'resolved'

/** A resident-raised request (a repair, a complaint) — distinct from a Dispute, which is always about a specific billing reading/amount. */
export interface ResidentRequest {
  id: string
  apartment_id: string
  flat_id: string
  raised_by: string
  title: string
  description: string | null
  status: RequestStatus
  admin_response: string | null
  raised_at: string
  resolved_at: string | null
  created_at: string
  updated_at: string
}

/** A published Financial Statement snapshot — never recomputed by an Owner's own session. See lib/living/queries.ts. */
export interface PublishedStatement {
  id: string
  apartment_id: string
  maintenance_month_id: string
  opening_balance: number
  collections: number
  expenses: number
  closing_balance: number
  outstanding_dues: number
  published_by: string
  published_at: string
}
