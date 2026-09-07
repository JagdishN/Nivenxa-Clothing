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

export interface SlabConfig {
  id: string
  apartment_id: string
  effective_from: string
  base_rate_per_1000l: number
  slabs: SlabTier[]
  grace_period_days: number
  escalation_cadence: EscalationCadence
  escalation_multiplier: number
  rise_threshold_percent: number
  notify_admin_at_streak: number
  created_at: string
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
 * that supplements metered water, split across flats the same way
 * maintenance is and added to each flat's own metered charge. Majeera has
 * no rate — its amount (and optional extra) is typed directly each month.
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
  /** Government norm: 500L/day supplied per connection — used only to suggest a base water rate, never billed directly. */
  majeera_connection_count: number
  majeera_amount: number
  majeera_extra_enabled: boolean
  majeera_extra_amount: number | null
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

/** Computed at read time — never stored (except the ledger amounts folded into it, which ARE stored, per flat per period). See lib/living/billing.ts. */
export interface Bill {
  flat_id: string
  month: string
  maintenance_share: number
  /** The maintenance period actually billed — null when no period has ever been created. Its range may not match `month`. */
  maintenance_period: { start: string; end: string } | null
  /** Metered charge only (or the broken-meter fallback) — excludes the tanker/Majeera share. */
  water_metered_charge: number
  /** This flat's equal/weighted share of the month's living_water_supply_costs. */
  water_supply_share: number
  /** water_metered_charge + water_supply_share. */
  water_charge: number
  advance_payment: number
  late_fee: number
  previous_due: number
  /** maintenance_share + water_charge + late_fee + previous_due - advance_payment, rounded to 2 decimals. */
  total_due: number
  water_is_fallback: boolean
  water_fallback_reason: string | null
}
