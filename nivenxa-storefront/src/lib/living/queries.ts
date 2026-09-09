import type { SupabaseClient } from '@supabase/supabase-js'
import { brokenMeterCharge, maintenanceGrandTotal, paymentStatus, riseStreak, round2, splitMaintenance, waterCharge, waterSupplyCostTotal } from './billing'
import type { Apartment, Bill, Flat, FlatClaim, FlatLedgerEntry, InventoryCategory, InventoryUnit, MaintenanceMonth, Payment, ServiceType, SlabConfig, TankerRates, WaterReading, WaterSupplyCost } from './types'

/** The slab config in force for a given month — the most recent one whose `effective_from` doesn't exceed it. */
export async function getEffectiveSlabConfig(supabase: SupabaseClient, apartmentId: string, month: string): Promise<SlabConfig | null> {
  const { data } = await supabase
    .from('living_slab_configs')
    .select('*')
    .eq('apartment_id', apartmentId)
    .lte('effective_from', month)
    .order('effective_from', { ascending: false })
    .limit(1)
    .maybeSingle<SlabConfig>()
  return data
}

/** The tanker rates in force for a given month — same "most recent effective_from" pattern as getEffectiveSlabConfig. */
export async function getEffectiveTankerRates(supabase: SupabaseClient, apartmentId: string, month: string): Promise<TankerRates | null> {
  const { data } = await supabase
    .from('living_tanker_rates')
    .select('*')
    .eq('apartment_id', apartmentId)
    .lte('effective_from', month)
    .order('effective_from', { ascending: false })
    .limit(1)
    .maybeSingle<TankerRates>()
  return data
}

export async function getWaterSupplyCost(supabase: SupabaseClient, apartmentId: string, month: string): Promise<WaterSupplyCost | null> {
  const { data } = await supabase
    .from('living_water_supply_costs')
    .select('*')
    .eq('apartment_id', apartmentId)
    .eq('month', month)
    .maybeSingle<WaterSupplyCost>()
  return data
}

export async function getFlats(supabase: SupabaseClient, apartmentId: string): Promise<Flat[]> {
  const { data } = await supabase.from('living_flats').select('*').eq('apartment_id', apartmentId).order('flat_no')
  return data ?? []
}

/**
 * Flats that get their own personal bill and count toward the equal-split
 * divisor — excludes shared/common meters (excluded_from_billing) and
 * second-meter flats merged into another unit (merged_into_flat_id set).
 * Setup still shows and edits every row via getFlats(); this is what
 * billing-facing views (the Bills page, split calculations) should use instead.
 */
export function getBillableFlats(flats: Flat[]): Flat[] {
  return flats.filter((f) => !f.excluded_from_billing && !f.merged_into_flat_id)
}

/**
 * Summed metered water charge across every excluded_from_billing flat
 * (shared/common meters) for the month — what the Maintenance page's
 * "Common Water Bill" line item auto-fills from. Null means "no such flat
 * exists," so callers know to leave that line item as ordinary manual
 * input rather than syncing it to (a misleading) zero.
 */
export async function getCommonWaterCharge(supabase: SupabaseClient, apartment: Apartment, month: string): Promise<number | null> {
  const flats = await getFlats(supabase, apartment.id)
  const commonFlats = flats.filter((f) => f.excluded_from_billing)
  if (commonFlats.length === 0) return null
  let total = 0
  for (const flat of commonFlats) {
    const charge = await getMeteredWaterCharge(supabase, apartment, flat, month)
    total += charge.amount
  }
  return total
}

/** One specific period, by its own start date — used when the Admin is editing a period they already know the identity of. */
export async function getMaintenanceMonth(supabase: SupabaseClient, apartmentId: string, month: string): Promise<MaintenanceMonth | null> {
  const { data } = await supabase
    .from('living_maintenance_months')
    .select('*')
    .eq('apartment_id', apartmentId)
    .eq('month', month)
    .maybeSingle<MaintenanceMonth>()
  return data
}

/**
 * "The" maintenance period for display purposes (Home, Bills, the Owner's
 * own bill, and the Maintenance page itself) — simply the most recently
 * started one, NOT a lookup by today's calendar month. A period's own
 * period_start/period_end can be any Admin-chosen range (see the schema
 * comment), so "today falls within some period" isn't a reliable way to
 * find it — the latest one created is what's current until a newer one
 * supersedes it, the same way "this month's entry" worked before periods
 * could span more than one calendar month.
 */
export async function getCurrentMaintenancePeriod(supabase: SupabaseClient, apartmentId: string): Promise<MaintenanceMonth | null> {
  const { data } = await supabase
    .from('living_maintenance_months')
    .select('*')
    .eq('apartment_id', apartmentId)
    .order('month', { ascending: false })
    .limit(1)
    .maybeSingle<MaintenanceMonth>()
  return data
}

export async function getWaterReading(supabase: SupabaseClient, flatId: string, month: string): Promise<WaterReading | null> {
  const { data } = await supabase.from('living_water_readings').select('*').eq('flat_id', flatId).eq('month', month).maybeSingle<WaterReading>()
  return data
}

/** Newest-first, for the reading-history view and rise-streak math. */
export async function getReadingHistory(supabase: SupabaseClient, flatId: string, limit = 6): Promise<WaterReading[]> {
  const { data } = await supabase
    .from('living_water_readings')
    .select('*')
    .eq('flat_id', flatId)
    .order('month', { ascending: false })
    .limit(limit)
  return data ?? []
}

/** The most recent reading for this flat whose meter was actually working — the escalation base while flagged. */
async function getLastWorkingWaterCharge(supabase: SupabaseClient, flatId: string, beforeMonth: string): Promise<number> {
  const { data } = await supabase
    .from('living_water_readings')
    .select('*')
    .eq('flat_id', flatId)
    .eq('flagged', false)
    .lt('month', beforeMonth)
    .not('current_reading', 'is', null)
    .not('previous_reading', 'is', null)
    .order('month', { ascending: false })
    .limit(1)
    .maybeSingle<WaterReading>()
  if (!data || data.current_reading === null || data.previous_reading === null) return 0

  const slab = await getEffectiveSlabConfig(supabase, data.apartment_id, data.month)
  if (!slab) return 0
  return waterCharge(data.current_reading - data.previous_reading, slab)
}

interface MeteredCharge {
  amount: number
  isFallback: boolean
  fallbackReason: string | null
}

/**
 * One flat's own metered water charge (or its broken-meter fallback) for
 * `month` — extracted out of computeBillForFlat so it can also be called
 * for a flat that never gets a *standalone* bill: a shared/common meter
 * (feeding the Maintenance page's auto-filled "Common Water Bill" line
 * item) and a merged second meter (added into its target flat's charge below).
 */
export async function getMeteredWaterCharge(supabase: SupabaseClient, apartment: Apartment, flat: Flat, month: string): Promise<MeteredCharge> {
  const reading = await getWaterReading(supabase, flat.id, month)

  if (reading?.flagged && reading.flagged_since) {
    const slab = await getEffectiveSlabConfig(supabase, apartment.id, month)
    const lastBilled = await getLastWorkingWaterCharge(supabase, flat.id, month)
    if (!slab) return { amount: 0, isFallback: false, fallbackReason: null }
    const { amount, escalationSteps } = brokenMeterCharge(lastBilled, reading.flagged_since, new Date(month), slab)
    return {
      amount,
      isFallback: true,
      fallbackReason:
        escalationSteps === 0
          ? `Meter flagged since ${reading.flagged_since} — billed at last working month's amount while within the grace period.`
          : `Meter still flagged since ${reading.flagged_since} — escalated charge (step ${escalationSteps}) applied.`,
    }
  }

  if (reading?.current_reading !== null && reading?.previous_reading !== null && reading) {
    const slab = await getEffectiveSlabConfig(supabase, apartment.id, month)
    if (slab) return { amount: waterCharge(reading.current_reading - reading.previous_reading, slab), isFallback: false, fallbackReason: null }
  }

  return { amount: 0, isFallback: false, fallbackReason: null }
}

/**
 * Computed at read time from MaintenanceMonth + WaterReading + the SlabConfig
 * effective for that month — see the plan's "bills are computed, not
 * stored" note. Safe to call for a month with no published maintenance
 * (share comes back 0) or no reading yet (charge comes back 0) — callers
 * decide how to present that rather than this function guessing.
 *
 * `flat` itself is assumed billable (getBillableFlats()) — an excluded or
 * merged flat's own charges are folded into whichever flat they merge into,
 * not returned by calling this on the excluded/merged flat directly.
 *
 * `month` still keys the water/slab/tanker lookups (those stay calendar-month
 * based); `maintenanceMonth` is passed in explicitly rather than looked up so
 * this can also be run against a PAST period (see getPreviousDueSuggestion) —
 * computeBillForFlat() below is just this with getCurrentMaintenancePeriod().
 */
async function computeBillAgainstPeriod(
  supabase: SupabaseClient,
  apartment: Apartment,
  flat: Flat,
  maintenanceMonth: MaintenanceMonth | null,
  month: string
): Promise<Bill> {
  const [allFlats, own, supplyCost, tankerRates] = await Promise.all([
    getFlats(supabase, apartment.id),
    getMeteredWaterCharge(supabase, apartment, flat, month),
    getWaterSupplyCost(supabase, apartment.id, month),
    getEffectiveTankerRates(supabase, apartment.id, month),
  ])
  const billableFlats = getBillableFlats(allFlats)
  const [ledger, payments] = await Promise.all([
    maintenanceMonth ? getFlatLedger(supabase, maintenanceMonth.id, flat.id) : Promise.resolve(null),
    maintenanceMonth ? getPaymentsForFlat(supabase, maintenanceMonth.id, flat.id) : Promise.resolve([]),
  ])
  const advancePayment = ledger?.advance_payment ?? 0
  const lateFee = ledger?.late_fee ?? 0
  const previousDue = ledger?.previous_due ?? 0

  let maintenanceShare = 0
  if (maintenanceMonth && maintenanceMonth.status === 'published') {
    const grandTotal = maintenanceGrandTotal(maintenanceMonth.line_items)
    const shares = splitMaintenance(grandTotal, billableFlats, apartment.flat_split, apartment.shared_cost_divisor)
    maintenanceShare = shares.get(flat.id) ?? 0
  }

  let meteredCharge = own.amount
  let waterIsFallback = own.isFallback
  let waterFallbackReason = own.fallbackReason

  // Any flat with a second meter merged into this one — its charge folds
  // into this flat's total instead of appearing as its own bill.
  const mergedChildren = allFlats.filter((f) => f.merged_into_flat_id === flat.id)
  for (const child of mergedChildren) {
    const childCharge = await getMeteredWaterCharge(supabase, apartment, child, month)
    meteredCharge += childCharge.amount
    if (childCharge.isFallback) {
      waterIsFallback = true
      waterFallbackReason = [waterFallbackReason, `Flat ${child.flat_no} (merged): ${childCharge.fallbackReason}`].filter(Boolean).join(' ')
    }
  }

  // Tanker/Majeera spend for the month, split the same equal/weighted way as
  // maintenance — a shared apartment-wide supplement to metered water, not
  // attributable to any one flat's own consumption.
  let supplyShare = 0
  if (supplyCost && tankerRates) {
    const total = waterSupplyCostTotal(supplyCost, tankerRates)
    const shares = splitMaintenance(total, billableFlats, apartment.flat_split, apartment.shared_cost_divisor)
    supplyShare = shares.get(flat.id) ?? 0
  }

  const waterChargeAmount = meteredCharge + supplyShare
  const totalDue = round2(maintenanceShare + waterChargeAmount + lateFee + previousDue - advancePayment)
  const amountPaid = round2(sumPayments(payments))

  return {
    flat_id: flat.id,
    month,
    maintenance_share: round2(maintenanceShare),
    maintenance_period: maintenanceMonth ? { start: maintenanceMonth.month, end: maintenanceMonth.period_end } : null,
    water_metered_charge: round2(meteredCharge),
    water_supply_share: round2(supplyShare),
    water_charge: round2(waterChargeAmount),
    current_period_total: round2(maintenanceShare + waterChargeAmount),
    advance_payment: round2(advancePayment),
    late_fee: round2(lateFee),
    previous_due: round2(previousDue),
    total_due: totalDue,
    amount_paid: amountPaid,
    balance_remaining: round2(totalDue - amountPaid),
    payment_status: paymentStatus(totalDue, amountPaid),
    water_is_fallback: waterIsFallback,
    water_fallback_reason: waterFallbackReason,
  }
}

export async function computeBillForFlat(supabase: SupabaseClient, apartment: Apartment, flat: Flat, month: string): Promise<Bill> {
  const maintenanceMonth = await getCurrentMaintenancePeriod(supabase, apartment.id)
  return computeBillAgainstPeriod(supabase, apartment, flat, maintenanceMonth, month)
}

/**
 * What a flat still owes from `priorPeriod` (its total_due there minus
 * whatever living_payments were recorded against it), floored at 0 — an
 * overpayment isn't auto-converted into an advance, that stays a manual
 * Admin call. Used to auto-seed the NEW period's previous_due when the
 * Admin starts one (see startPeriodAction), never re-applied afterward —
 * once seeded it's a normal editable ledger field like any other.
 */
export async function getPreviousDueSuggestion(supabase: SupabaseClient, apartment: Apartment, flat: Flat, priorPeriod: MaintenanceMonth): Promise<number> {
  const bill = await computeBillAgainstPeriod(supabase, apartment, flat, priorPeriod, priorPeriod.month)
  return Math.max(0, round2(bill.total_due - bill.amount_paid))
}

/** A flat's advance/late-fee/previous-due entry for a specific maintenance period, or null if never set (all three then default to 0). */
export async function getFlatLedger(supabase: SupabaseClient, maintenanceMonthId: string, flatId: string): Promise<FlatLedgerEntry | null> {
  const { data } = await supabase
    .from('living_flat_ledger')
    .select('*')
    .eq('maintenance_month_id', maintenanceMonthId)
    .eq('flat_id', flatId)
    .maybeSingle<FlatLedgerEntry>()
  return data
}

/** Every payment recorded against one flat for a specific period, newest first. */
export async function getPaymentsForFlat(supabase: SupabaseClient, maintenanceMonthId: string, flatId: string): Promise<Payment[]> {
  const { data } = await supabase
    .from('living_payments')
    .select('*')
    .eq('maintenance_month_id', maintenanceMonthId)
    .eq('flat_id', flatId)
    .order('payment_date', { ascending: false })
  return data ?? []
}

/** Every payment recorded across all flats for a period, newest first — the Payments page's log and the Excel export's Payments sheet. */
export async function getPaymentsForPeriod(supabase: SupabaseClient, maintenanceMonthId: string): Promise<Payment[]> {
  const { data } = await supabase
    .from('living_payments')
    .select('*')
    .eq('maintenance_month_id', maintenanceMonthId)
    .order('payment_date', { ascending: false })
  return data ?? []
}

export function sumPayments(payments: Payment[]): number {
  return payments.reduce((sum, p) => sum + p.amount, 0)
}

/** Consecutive-rise streak for a flat, ending at its most recent reading — see billing.ts's riseStreak(). */
export async function getRiseStreakForFlat(supabase: SupabaseClient, flatId: string, riseThresholdPercent: number): Promise<number> {
  const history = await getReadingHistory(supabase, flatId, 6)
  return riseStreak(
    history.map((r) => ({ consumption_liters: r.current_reading !== null && r.previous_reading !== null ? r.current_reading - r.previous_reading : null })),
    riseThresholdPercent
  )
}

export interface RiseAlert {
  flat: Flat
  streak: number
}

/** Flats whose rise streak has reached the apartment's notify_admin_at_streak threshold — surfaced on the Admin/Treasurer home. */
export async function getRiseAlerts(supabase: SupabaseClient, apartment: Apartment, month: string): Promise<RiseAlert[]> {
  const slab = await getEffectiveSlabConfig(supabase, apartment.id, month)
  if (!slab) return []
  const flats = await getFlats(supabase, apartment.id)

  const alerts: RiseAlert[] = []
  for (const flat of flats) {
    const streak = await getRiseStreakForFlat(supabase, flat.id, slab.rise_threshold_percent)
    if (streak >= slab.notify_admin_at_streak) alerts.push({ flat, streak })
  }
  return alerts
}

export interface OpenDispute {
  reading: WaterReading
  flat: Flat
}

export async function getOpenDisputes(supabase: SupabaseClient, apartmentId: string): Promise<OpenDispute[]> {
  const { data } = await supabase
    .from('living_water_readings')
    .select('*, flat:living_flats(*)')
    .eq('apartment_id', apartmentId)
    .not('dispute', 'is', null)
    .order('month', { ascending: false })
  if (!data) return []
  return (data as unknown as (WaterReading & { flat: Flat })[])
    .filter((row) => row.dispute && row.dispute.status !== 'resolved')
    .map((row) => ({ reading: row, flat: row.flat }))
}

export interface PendingClaimWithFlat extends FlatClaim {
  flat: Flat
}

/** Shared master data — same list for every apartment, not filtered by apartment_id. */
export async function getInventoryCategories(supabase: SupabaseClient): Promise<InventoryCategory[]> {
  const { data } = await supabase.from('living_inventory_categories').select('*').order('name')
  return data ?? []
}

/** Shared master data — same list for every apartment, not filtered by apartment_id. */
export async function getInventoryUnits(supabase: SupabaseClient): Promise<InventoryUnit[]> {
  const { data } = await supabase.from('living_inventory_units').select('*').order('name')
  return data ?? []
}

/** Shared master data — same list for every apartment, not filtered by apartment_id. */
export async function getServiceTypes(supabase: SupabaseClient): Promise<ServiceType[]> {
  const { data } = await supabase.from('living_service_types').select('*').order('name')
  return data ?? []
}

export async function getPendingClaims(supabase: SupabaseClient, apartmentId: string): Promise<PendingClaimWithFlat[]> {
  const { data } = await supabase
    .from('living_flat_claims')
    .select('*, flat:living_flats(*)')
    .eq('apartment_id', apartmentId)
    .eq('status', 'pending')
    .order('requested_at')
  return (data as unknown as PendingClaimWithFlat[]) ?? []
}
