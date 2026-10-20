import type { SupabaseClient } from '@supabase/supabase-js'
import { cache } from 'react'
import { brokenMeterCharge, combinedWaterRatePer1000L, maintenanceGrandTotal, paymentStatus, riseStreak, round2, slabWaterCharge, splitMaintenance, tankerAndMajeeraLiters, waterSupplyCostTotal } from './billing'
import { daysInMonth, monthBefore, monthKeyFor } from './format'
import type { AdvanceTransfer, Apartment, Bill, EventCategory, EventCollection, EventExpense, Expense, ExpenseCategory, Flat, FlatClaim, FlatLedgerEntry, InventoryCategory, InventoryUnit, LivingEvent, MaintenanceMonth, Meeting, Notice, Payment, PaymentMethod, PublishedStatement, ReimbursementSettlement, ResidentRequest, ServiceType, SlabCalculationMethod, SlabConfig, TankerRates, WaterBillingMethod, WaterBillSnapshot, WaterReading, WaterSupplyCost, WaterTierBreakdownEntry } from './types'

/**
 * The slab config in force for a given month — the most recent one whose
 * `effective_from` doesn't exceed it. `cache()`-wrapped: every bill-
 * computing page calls this (and the other apartment-wide, month-scoped
 * lookups below) once PER FLAT — for ~28 flats in one request that's ~28
 * identical round trips for a value that's the same all 28 times. React's
 * `cache()` dedupes repeat calls with the same arguments within a single
 * request/render (reset on the next request), so this collapses to one
 * real query — this is what actually fixed the multi-second Overview/Bills/
 * Payments/Maintenance loads; the earlier `preloaded`-param threading only
 * caught the top-level getFlats/getCurrentMaintenancePeriod duplication,
 * not this deeper one inside the water-charge computation chain.
 */
export const getEffectiveSlabConfig = cache(async (supabase: SupabaseClient, apartmentId: string, month: string): Promise<SlabConfig | null> => {
  const { data } = await supabase
    .from('living_slab_configs')
    .select('*')
    .eq('apartment_id', apartmentId)
    .lte('effective_from', month)
    .order('effective_from', { ascending: false })
    .limit(1)
    .maybeSingle<SlabConfig>()
  return data
})

/** The tanker rates in force for a given month — same "most recent effective_from" pattern as getEffectiveSlabConfig, same cache() reasoning. */
export const getEffectiveTankerRates = cache(async (supabase: SupabaseClient, apartmentId: string, month: string): Promise<TankerRates | null> => {
  const { data } = await supabase
    .from('living_tanker_rates')
    .select('*')
    .eq('apartment_id', apartmentId)
    .lte('effective_from', month)
    .order('effective_from', { ascending: false })
    .limit(1)
    .maybeSingle<TankerRates>()
  return data
})

export const getWaterSupplyCost = cache(async (supabase: SupabaseClient, apartmentId: string, month: string): Promise<WaterSupplyCost | null> => {
  const { data } = await supabase
    .from('living_water_supply_costs')
    .select('*')
    .eq('apartment_id', apartmentId)
    .eq('month', month)
    .maybeSingle<WaterSupplyCost>()
  return data
})

/** Same cache() reasoning as getEffectiveSlabConfig above — called once per flat by every per-flat bill/water computation, always for the exact same apartment. */
export const getFlats = cache(async (supabase: SupabaseClient, apartmentId: string): Promise<Flat[]> => {
  const { data } = await supabase.from('living_flats').select('*').eq('apartment_id', apartmentId).order('flat_no')
  return data ?? []
})

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
 * (shared/common meters) for the month — shown on the Water page's own
 * "Common area water charge" card, AND what Maintenance's "Common Water
 * Bill" line item auto-fills from (see getCommonWaterChargeForPeriod).
 * Null means no such flat exists.
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

/**
 * The right Common Water Bill figure for a given maintenance period,
 * computed from the shared meter's reading for whichever month is actually
 * relevant to THAT period — not blindly "today." A period still genuinely
 * ongoing (its own period_end hasn't passed yet) uses today's calendar
 * month, same as every other still-accruing water figure. A period whose
 * range has already ended — which is the NORMAL case, most periods are only
 * reviewed once the month they cover is over, not a sign of neglect — uses
 * the latest reading that falls within the period's own [month, period_end]
 * range instead, so backfilling a past month's bill correctly pulls that
 * month's reading rather than whatever "today" happens to be. Null means no
 * common meter exists, or none has a reading anywhere in this period's own
 * range — callers leave the line item as ordinary manual input rather than
 * syncing it to a misleading 0.
 */
export async function getCommonWaterChargeForPeriod(supabase: SupabaseClient, apartment: Apartment, period: MaintenanceMonth): Promise<number | null> {
  const flats = await getFlats(supabase, apartment.id)
  const commonFlats = flats.filter((f) => f.excluded_from_billing)
  if (commonFlats.length === 0) return null

  const today = new Date().toISOString().slice(0, 10)
  if (period.period_end >= today) {
    return getCommonWaterCharge(supabase, apartment, monthKeyFor(new Date()))
  }

  let total = 0
  let anyFound = false
  for (const flat of commonFlats) {
    const { data } = await supabase
      .from('living_water_readings')
      .select('month')
      .eq('flat_id', flat.id)
      .gte('month', period.month)
      .lte('month', period.period_end)
      .order('month', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!data) continue
    anyFound = true
    const charge = await getMeteredWaterCharge(supabase, apartment, flat, data.month as string)
    total += charge.amount
  }
  return anyFound ? total : null
}

/**
 * The right calendar month to use when computing a flat's own bill against
 * `period` (via computeBillForFlat/computeBillAgainstPeriod) — the same
 * logic as getCommonWaterChargeForPeriod's own month choice, generalized.
 * A period still genuinely ongoing (its own period_end hasn't passed yet)
 * uses today's calendar month, since its water charge is still accruing. A
 * period whose range has already ended — the normal case, most periods are
 * reviewed only once the month they cover is over, not a sign of neglect —
 * uses the period's own start month instead. Without this, any page that
 * blindly passed monthKeyFor(new Date()) as the water month would silently
 * show every flat's water charge as 0 the moment "today" moved past the
 * current period's own end date with no new cycle started — confirmed to
 * have broken the Bills page and Maintenance's own Ledger tab this way.
 */
export function getRelevantWaterMonth(period: MaintenanceMonth | null, todayMonth: string): string {
  if (!period) return todayMonth
  const today = new Date().toISOString().slice(0, 10)
  return period.period_end >= today ? todayMonth : period.month
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

/**
 * Every distinct month any flat has a reading for, newest first — powers the
 * Water page's month picker so an Admin can browse past months' readings,
 * not just the current one (there was previously no way to see a past
 * month's readings at all outside the database directly).
 */
export async function getReadingMonths(supabase: SupabaseClient, apartmentId: string): Promise<string[]> {
  const { data } = await supabase.from('living_water_readings').select('month').eq('apartment_id', apartmentId).order('month', { ascending: false })
  return [...new Set((data ?? []).map((r) => r.month as string))]
}

/** Sum of every flat's own metered consumption (current - previous) for `month` — every flat with a real reading, not just billable ones (a merged child-meter and the shared/common meter both draw from the same supply). The denominator side of the true-up: see getIncomingGap. */
export const getTotalConsumptionForMonth = cache(async (supabase: SupabaseClient, apartmentId: string, month: string): Promise<number> => {
  const { data } = await supabase
    .from('living_water_readings')
    .select('current_reading, previous_reading')
    .eq('apartment_id', apartmentId)
    .eq('month', month)
    .not('current_reading', 'is', null)
    .not('previous_reading', 'is', null)
  return (data ?? []).reduce((sum, r) => sum + ((r.current_reading as number) - (r.previous_reading as number)), 0)
})

/**
 * The cumulative unresolved over/under-recovery carried INTO `month` from
 * the month before it — 0 when there's no prior month's row at all. Reads
 * `living_water_supply_costs.carried_gap` if it's already cached for that
 * prior month; otherwise computes it once (recursing one month further
 * back as needed — this only ever walks until it hits an already-cached or
 * nonexistent row, never the full history) and writes it back so every
 * later call for this same month is an O(1) read. An Owner's session can't
 * write it (RLS, admin/treasurer-only) — the computed value is still
 * returned and used for that one request, it just doesn't get cached until
 * an admin/treasurer session next touches it.
 */
export const getIncomingGap = cache(async (supabase: SupabaseClient, apartmentId: string, month: string): Promise<number> => {
  const priorMonth = monthBefore(month)
  const priorCost = await getWaterSupplyCost(supabase, apartmentId, priorMonth)
  if (!priorCost) return 0
  if (priorCost.carried_gap !== null) return priorCost.carried_gap

  const priorRates = await getEffectiveTankerRates(supabase, apartmentId, priorMonth)
  const priorLiters = priorRates ? tankerAndMajeeraLiters(priorCost, daysInMonth(priorMonth)) : 0
  const priorPurchaseCost = priorRates ? waterSupplyCostTotal(priorCost, priorRates) : 0
  const priorIncoming = await getIncomingGap(supabase, apartmentId, priorMonth)
  const priorRate = combinedWaterRatePer1000L(priorPurchaseCost, priorLiters, priorIncoming) ?? 0
  const priorConsumption = await getTotalConsumptionForMonth(supabase, apartmentId, priorMonth)
  const newGap = round2(priorIncoming + (priorConsumption / 1000) * priorRate - priorPurchaseCost)

  await supabase.from('living_water_supply_costs').update({ carried_gap: newGap }).eq('id', priorCost.id)
  return newGap
})

/**
 * The single ₹/1,000L rate billed against every flat's own metered
 * consumption for `month` — this month's tanker/Majeera spend plus
 * whatever's carried in from last month's over/under-recovery, divided by
 * this month's purchased litres. Live for the current (still in-progress)
 * month; an already-past month's own `carried_gap` input is cached (see
 * getIncomingGap) but this rate itself is always recomputed from current
 * inputs, never stored — cheap (one cached lookback + the already-fetched
 * month's own numbers), and correctable if the Admin edits a tanker count.
 */
export const getCombinedWaterRate = cache(async (supabase: SupabaseClient, apartmentId: string, month: string): Promise<number> => {
  const [supplyCost, tankerRates, incomingGap] = await Promise.all([
    getWaterSupplyCost(supabase, apartmentId, month),
    getEffectiveTankerRates(supabase, apartmentId, month),
    getIncomingGap(supabase, apartmentId, month),
  ])
  if (!supplyCost || !tankerRates) return 0
  const liters = tankerAndMajeeraLiters(supplyCost, daysInMonth(month))
  const cost = waterSupplyCostTotal(supplyCost, tankerRates)
  return combinedWaterRatePer1000L(cost, liters, incomingGap) ?? 0
})

export async function getWaterBillSnapshot(supabase: SupabaseClient, apartmentId: string, flatId: string, month: string): Promise<WaterBillSnapshot | null> {
  const { data } = await supabase
    .from('living_water_bill_snapshots')
    .select('*')
    .eq('apartment_id', apartmentId)
    .eq('flat_id', flatId)
    .eq('month', month)
    .maybeSingle<WaterBillSnapshot>()
  return data
}

interface ComputedWaterCharge {
  amount: number
  consumptionLiters: number
  ratePer1000L: number
  billingMethod: WaterBillingMethod
  slabCalculationMethod: SlabCalculationMethod | null
  slabConfigId: string | null
  breakdown: WaterTierBreakdownEntry[] | null
}

/** The raw calculation for one flat's metered consumption this month — no snapshot read/write, no fallback handling. Requires a real reading (both current and previous set). */
async function computeWaterChargeForMonth(supabase: SupabaseClient, apartmentId: string, consumptionLiters: number, month: string): Promise<ComputedWaterCharge> {
  const ratePer1000L = await getCombinedWaterRate(supabase, apartmentId, month)
  const slab = await getEffectiveSlabConfig(supabase, apartmentId, month)
  const billingMethod: WaterBillingMethod = slab?.water_billing_method ?? 'standard'

  if (billingMethod === 'slab' && slab && slab.slabs.length > 0) {
    const { amount, breakdown } = slabWaterCharge(consumptionLiters, ratePer1000L, slab.slab_calculation_method, slab.slabs)
    return { amount: round2(amount), consumptionLiters, ratePer1000L, billingMethod, slabCalculationMethod: slab.slab_calculation_method, slabConfigId: slab.id, breakdown }
  }

  return { amount: round2((consumptionLiters / 1000) * ratePer1000L), consumptionLiters, ratePer1000L, billingMethod: 'standard', slabCalculationMethod: null, slabConfigId: null, breakdown: null }
}

/**
 * One flat's metered water charge for `month`, honoring a frozen snapshot
 * when one already exists (either auto-cached for a past month, or written
 * by an explicit manual adjustment — see setWaterChargeAdjustment) —
 * otherwise computes fresh via computeWaterChargeForMonth. A past month with
 * no snapshot yet gets one written here (lazy cache, same pattern as
 * getIncomingGap's carried_gap); the CURRENT calendar month is never
 * auto-cached this way, so it keeps recomputing live until the Admin
 * explicitly adjusts it.
 */
async function getOrComputeWaterCharge(
  supabase: SupabaseClient,
  apartmentId: string,
  flatId: string,
  consumptionLiters: number,
  month: string
): Promise<{
  amount: number
  consumptionLiters: number
  ratePer1000L: number
  billingMethod: WaterBillingMethod
  slabCalculationMethod: SlabCalculationMethod | null
  breakdown: WaterTierBreakdownEntry[] | null
  manualAdjustment: number
}> {
  const snapshot = await getWaterBillSnapshot(supabase, apartmentId, flatId, month)
  if (snapshot) {
    return {
      amount: snapshot.final_charge,
      consumptionLiters: snapshot.consumption_liters ?? consumptionLiters,
      ratePer1000L: snapshot.base_rate_per_1000l,
      billingMethod: snapshot.billing_method,
      slabCalculationMethod: snapshot.slab_calculation_method,
      breakdown: snapshot.tier_breakdown,
      manualAdjustment: snapshot.manual_adjustment,
    }
  }

  const computed = await computeWaterChargeForMonth(supabase, apartmentId, consumptionLiters, month)
  const isPastMonth = month < monthKeyFor(new Date())
  if (isPastMonth) {
    // Admin/treasurer-only write (RLS) — an Owner's session silently no-ops here and just
    // uses `computed` for this one request; self-heals next time an admin/treasurer session
    // touches this flat+month (Bills, Water, Billing Overview all do, constantly).
    await supabase.from('living_water_bill_snapshots').upsert(
      {
        apartment_id: apartmentId,
        flat_id: flatId,
        month,
        consumption_liters: computed.consumptionLiters,
        base_rate_per_1000l: computed.ratePer1000L,
        billing_method: computed.billingMethod,
        slab_calculation_method: computed.slabCalculationMethod,
        slab_config_id: computed.slabConfigId,
        tier_breakdown: computed.breakdown,
        computed_charge: computed.amount,
        manual_adjustment: 0,
        final_charge: computed.amount,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'apartment_id,flat_id,month' }
    )
  }
  return {
    amount: computed.amount,
    consumptionLiters: computed.consumptionLiters,
    ratePer1000L: computed.ratePer1000L,
    billingMethod: computed.billingMethod,
    slabCalculationMethod: computed.slabCalculationMethod,
    breakdown: computed.breakdown,
    manualAdjustment: 0,
  }
}

/**
 * Sets (or clears, with amount 0) an Admin correction on top of one flat's
 * computed water charge for `month`, with a required reason — always writes
 * a snapshot regardless of month, so an adjusted CURRENT month's charge
 * holds even if the Admin edits tanker counts or readings afterward. Ensures
 * a reading exists first; throws if it doesn't (nothing to adjust).
 */
export async function setWaterChargeAdjustment(
  supabase: SupabaseClient,
  apartmentId: string,
  flatId: string,
  month: string,
  adjustment: number,
  reason: string,
  adjustedBy: string
): Promise<void> {
  const reading = await getWaterReading(supabase, flatId, month)
  if (!reading || reading.current_reading === null || reading.previous_reading === null) {
    throw new Error('No metered reading for this flat and month yet — nothing to adjust.')
  }
  const consumptionLiters = reading.current_reading - reading.previous_reading
  const computed = await computeWaterChargeForMonth(supabase, apartmentId, consumptionLiters, month)
  await supabase.from('living_water_bill_snapshots').upsert(
    {
      apartment_id: apartmentId,
      flat_id: flatId,
      month,
      consumption_liters: computed.consumptionLiters,
      base_rate_per_1000l: computed.ratePer1000L,
      billing_method: computed.billingMethod,
      slab_calculation_method: computed.slabCalculationMethod,
      slab_config_id: computed.slabConfigId,
      tier_breakdown: computed.breakdown,
      computed_charge: computed.amount,
      manual_adjustment: adjustment,
      adjustment_reason: reason,
      adjustment_by: adjustedBy,
      adjustment_at: new Date().toISOString(),
      final_charge: round2(computed.amount + adjustment),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'apartment_id,flat_id,month' }
  )
}

/** The most recent reading for this flat whose meter was actually working — the escalation base while flagged. Respects whatever billing method/snapshot was actually in force that month. */
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

  const consumptionLiters = data.current_reading - data.previous_reading
  const charge = await getOrComputeWaterCharge(supabase, data.apartment_id, flatId, consumptionLiters, data.month)
  return charge.amount
}

interface MeteredCharge {
  amount: number
  isFallback: boolean
  fallbackReason: string | null
  /** This flat's own consumption this month, for the "3,000L × ₹30/1,000L" breakdown — null while flagged/no reading yet. */
  consumptionLiters: number | null
  /** The combined rate actually applied — null while flagged/no reading yet. */
  ratePer1000L: number | null
  /** 'standard' or 'slab' — null while flagged/no reading yet. */
  billingMethod: WaterBillingMethod | null
  /** Set only when billingMethod is 'slab'. */
  slabCalculationMethod: SlabCalculationMethod | null
  /** Per-tier detail when billingMethod is 'slab' — null otherwise. */
  breakdown: WaterTierBreakdownEntry[] | null
  /** Admin-entered correction already included in `amount` — 0 when none. */
  manualAdjustment: number
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
  const empty: MeteredCharge = { amount: 0, isFallback: false, fallbackReason: null, consumptionLiters: null, ratePer1000L: null, billingMethod: null, slabCalculationMethod: null, breakdown: null, manualAdjustment: 0 }

  if (reading?.flagged && reading.flagged_since) {
    const slab = await getEffectiveSlabConfig(supabase, apartment.id, month)
    const lastBilled = await getLastWorkingWaterCharge(supabase, flat.id, month)
    if (!slab) return empty
    const { amount, escalationSteps } = brokenMeterCharge(lastBilled, reading.flagged_since, new Date(month), slab)
    return {
      ...empty,
      amount,
      isFallback: true,
      fallbackReason:
        escalationSteps === 0
          ? `Meter flagged since ${reading.flagged_since} — billed at last working month's amount while within the grace period.`
          : `Meter still flagged since ${reading.flagged_since} — escalated charge (step ${escalationSteps}) applied.`,
    }
  }

  if (reading?.current_reading !== null && reading?.previous_reading !== null && reading) {
    const consumptionLiters = reading.current_reading - reading.previous_reading
    const charge = await getOrComputeWaterCharge(supabase, apartment.id, flat.id, consumptionLiters, month)
    return {
      amount: charge.amount,
      isFallback: false,
      fallbackReason: null,
      consumptionLiters: charge.consumptionLiters,
      ratePer1000L: charge.ratePer1000L,
      billingMethod: charge.billingMethod,
      slabCalculationMethod: charge.slabCalculationMethod,
      breakdown: charge.breakdown,
      manualAdjustment: charge.manualAdjustment,
    }
  }

  return empty
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
  month: string,
  preloadedAllFlats?: Flat[]
): Promise<Bill> {
  const [allFlats, own] = await Promise.all([
    preloadedAllFlats ?? getFlats(supabase, apartment.id),
    getMeteredWaterCharge(supabase, apartment, flat, month),
  ])
  const billableFlats = getBillableFlats(allFlats)
  const [ledger, payments, reimbursementCreditThisPeriod] = await Promise.all([
    maintenanceMonth ? getFlatLedger(supabase, maintenanceMonth.id, flat.id) : Promise.resolve(null),
    maintenanceMonth ? getPaymentsForFlat(supabase, maintenanceMonth.id, flat.id) : Promise.resolve([]),
    maintenanceMonth ? getBillAdjustmentCreditForPeriod(supabase, maintenanceMonth.id, flat.id) : Promise.resolve(0),
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
  let consumptionLiters = own.consumptionLiters
  let waterBreakdown = own.breakdown
  let manualAdjustment = own.manualAdjustment

  // Any flat with a second meter merged into this one — its charge (and
  // consumption) folds into this flat's total instead of appearing as its
  // own bill. Rate is the same apartment-wide figure for the whole month,
  // so summing consumption under `own`'s rate stays correct either way.
  const mergedChildren = allFlats.filter((f) => f.merged_into_flat_id === flat.id)
  for (const child of mergedChildren) {
    const childCharge = await getMeteredWaterCharge(supabase, apartment, child, month)
    meteredCharge += childCharge.amount
    if (childCharge.consumptionLiters !== null) consumptionLiters = (consumptionLiters ?? 0) + childCharge.consumptionLiters
    if (childCharge.breakdown) waterBreakdown = [...(waterBreakdown ?? []), ...childCharge.breakdown]
    manualAdjustment += childCharge.manualAdjustment
    if (childCharge.isFallback) {
      waterIsFallback = true
      waterFallbackReason = [waterFallbackReason, `Flat ${child.flat_no} (merged): ${childCharge.fallbackReason}`].filter(Boolean).join(' ')
    }
  }

  const totalDue = round2(maintenanceShare + meteredCharge + lateFee + previousDue - advancePayment - reimbursementCreditThisPeriod)
  const amountPaid = round2(sumPayments(payments))

  return {
    flat_id: flat.id,
    month,
    maintenance_share: round2(maintenanceShare),
    maintenance_period: maintenanceMonth ? { start: maintenanceMonth.month, end: maintenanceMonth.period_end } : null,
    water_consumption_liters: waterIsFallback ? null : consumptionLiters,
    water_rate_per_1000l: waterIsFallback ? null : own.ratePer1000L,
    water_billing_method: waterIsFallback ? null : own.billingMethod,
    water_slab_calculation_method: waterIsFallback ? null : own.slabCalculationMethod,
    water_tier_breakdown: waterIsFallback ? null : waterBreakdown,
    water_manual_adjustment: round2(manualAdjustment),
    water_charge: round2(meteredCharge),
    current_period_total: round2(maintenanceShare + meteredCharge),
    advance_payment: round2(advancePayment),
    late_fee: round2(lateFee),
    previous_due: round2(previousDue),
    reimbursement_credit: round2(reimbursementCreditThisPeriod),
    total_due: totalDue,
    amount_paid: amountPaid,
    balance_remaining: round2(totalDue - amountPaid),
    payment_status: paymentStatus(totalDue, amountPaid, maintenanceMonth !== null && maintenanceMonth.status === 'published'),
    water_is_fallback: waterIsFallback,
    water_fallback_reason: waterFallbackReason,
  }
}

/**
 * `preloaded` lets a caller that's already fetched this apartment's full flat
 * list and current maintenance period for the page (every screen that computes
 * a bill for every billable flat in a loop — Home, Billing, Bills, Ledgers,
 * Payments, Maintenance) pass them straight through instead of each of N
 * flats separately re-querying the same two apartment-wide rows. Omit it and
 * this fetches them itself, unchanged from before — every single-flat caller
 * (receipts, the CSV export route, getPreviousDueSuggestion's past-period
 * variant) keeps working exactly as it did.
 */
export async function computeBillForFlat(
  supabase: SupabaseClient,
  apartment: Apartment,
  flat: Flat,
  month: string,
  preloaded?: { allFlats?: Flat[]; maintenanceMonth?: MaintenanceMonth | null }
): Promise<Bill> {
  const maintenanceMonth =
    preloaded?.maintenanceMonth !== undefined ? preloaded.maintenanceMonth : await getCurrentMaintenancePeriod(supabase, apartment.id)
  return computeBillAgainstPeriod(supabase, apartment, flat, maintenanceMonth, month, preloaded?.allFlats)
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

/**
 * How much credit `priorPeriod` ended with, floored at 0 — the mirror of
 * getPreviousDueSuggestion (debt). `balance_remaining = total_due -
 * amount_paid`, and total_due already nets advance_payment against that
 * period's own charges (maintenance + water + late fee + previous due) — so
 * a negative balance_remaining covers BOTH an unused advance_payment (when
 * amount_paid is 0) AND a flat that simply paid more than it owed with no
 * advance involved (when amount_paid alone exceeds total_due); either way,
 * `-balance_remaining` is exactly the leftover. Auto-seeds the NEW period's
 * advance_payment when the Admin starts one (see startPeriodAction) — once
 * seeded it's a normal editable ledger field like any other, never
 * re-applied afterward.
 */
export async function getAdvanceCarryForwardSuggestion(supabase: SupabaseClient, apartment: Apartment, flat: Flat, priorPeriod: MaintenanceMonth): Promise<number> {
  const bill = await computeBillAgainstPeriod(supabase, apartment, flat, priorPeriod, priorPeriod.month)
  return Math.max(0, round2(-bill.balance_remaining))
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

/**
 * Keeps a single system-written 'advance' living_payments row in sync with
 * how much of this flat's advance_payment is actually applied against this
 * period's own charges (maintenance + water + late fee + previous due) —
 * capped at what's needed; any unused remainder is instead carried into the
 * NEXT period's advance via getAdvanceCarryForwardSuggestion, never
 * double-counted here. Call after any write to living_flat_ledger's
 * advance_payment for a period (saveLedgerAction, startPeriodAction's seed,
 * transferAdvanceAction, deleteAdvanceTransferAction, publishAction).
 *
 * Purely a visibility record for Payment History/receipts — excluded from
 * every place that does balance arithmetic (sumPayments, getFlatLedgerHistory's
 * running-balance walk), since total_due already nets advance_payment
 * directly. Idempotent: at most one such row per (maintenance_month_id,
 * flat_id), upserted or deleted as the underlying ledger changes.
 */
export async function syncAdvanceApplicationPayment(
  supabase: SupabaseClient,
  apartment: Apartment,
  flat: Flat,
  maintenanceMonth: MaintenanceMonth,
  recordedBy: string
): Promise<void> {
  const bill = await computeBillAgainstPeriod(supabase, apartment, flat, maintenanceMonth, maintenanceMonth.month)
  const charges = round2(bill.total_due + bill.advance_payment)
  const advanceUsed = bill.advance_payment > 0 ? round2(Math.max(0, Math.min(bill.advance_payment, charges))) : 0

  const { data: existing } = await supabase
    .from('living_payments')
    .select('id')
    .eq('maintenance_month_id', maintenanceMonth.id)
    .eq('flat_id', flat.id)
    .eq('method', 'advance')
    .maybeSingle<{ id: string }>()

  if (advanceUsed <= 0) {
    if (existing) await supabase.from('living_payments').delete().eq('id', existing.id)
    return
  }

  if (existing) {
    await supabase.from('living_payments').update({ amount: advanceUsed }).eq('id', existing.id)
  } else {
    await supabase.from('living_payments').insert({
      apartment_id: apartment.id,
      maintenance_month_id: maintenanceMonth.id,
      flat_id: flat.id,
      amount: advanceUsed,
      method: 'advance',
      reference_note: 'Applied automatically from advance balance',
      recorded_by: recordedBy,
    })
  }
}

/** Every advance transfer logged for a specific period, newest first — see transferAdvanceAction in maintenance/page.tsx. */
export async function getAdvanceTransfers(supabase: SupabaseClient, maintenanceMonthId: string): Promise<AdvanceTransfer[]> {
  const { data } = await supabase
    .from('living_advance_transfers')
    .select('*')
    .eq('maintenance_month_id', maintenanceMonthId)
    .order('created_at', { ascending: false })
  return data ?? []
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

/** Sum of this flat's 'bill_adjustment' reimbursement settlements against one period — the reimbursement_credit term in computeBillAgainstPeriod. 'cash' settlements never reduce a bill, so they're excluded here (see getCashReimbursementSettlementsForPeriod for where those show up instead). */
async function getBillAdjustmentCreditForPeriod(supabase: SupabaseClient, maintenanceMonthId: string, flatId: string): Promise<number> {
  const { data } = await supabase
    .from('living_reimbursement_settlements')
    .select('amount')
    .eq('maintenance_month_id', maintenanceMonthId)
    .eq('flat_id', flatId)
    .eq('settlement_type', 'bill_adjustment')
  return ((data as { amount: number }[]) ?? []).reduce((sum, row) => sum + row.amount, 0)
}

/** Sum of every 'cash' reimbursement settlement stamped against one period, apartment-wide — real association cash leaving, subtracted in computeFinancialStatements' closing-balance walk alongside expensesTotal. 'bill_adjustment' settlements never move cash, so they're excluded here (see getBillAdjustmentCreditForPeriod for where those show up instead). */
async function getCashReimbursementSettlementsForPeriod(supabase: SupabaseClient, maintenanceMonthId: string): Promise<number> {
  const { data } = await supabase
    .from('living_reimbursement_settlements')
    .select('amount')
    .eq('maintenance_month_id', maintenanceMonthId)
    .eq('settlement_type', 'cash')
  return round2(((data as { amount: number }[]) ?? []).reduce((sum, row) => sum + row.amount, 0))
}

/** Every published maintenance period for the apartment, oldest first — walked in order to build a flat's full ledger history below. */
export async function getPublishedMaintenancePeriods(supabase: SupabaseClient, apartmentId: string): Promise<MaintenanceMonth[]> {
  const { data } = await supabase
    .from('living_maintenance_months')
    .select('*')
    .eq('apartment_id', apartmentId)
    .eq('status', 'published')
    .order('month', { ascending: true })
  return data ?? []
}

/**
 * 'opening'/'bill'/'payment' all share ONE running balance: what this flat owes the association
 * (or, negative, an advance on file). 'resident_expense'/'reimbursement_settlement' share a
 * COMPLETELY SEPARATE running balance: what the association owes this flat for expenses they
 * funded personally — a different account, deliberately never netted into the first one (Bill
 * Status must stay separate from a reimbursement balance everywhere). Each transaction's own
 * `balance` field is whichever of the two running totals that transaction kind belongs to.
 */
export type LedgerTransaction =
  | { kind: 'opening'; date: string; amount: number; balance: number }
  | { kind: 'bill'; date: string; periodStart: string; periodEnd: string; amount: number; balance: number }
  | { kind: 'payment'; date: string; method: Payment['method']; referenceNote: string | null; amount: number; balance: number }
  | { kind: 'resident_expense'; date: string; expenseId: string; description: string; amount: number; balance: number }
  | { kind: 'reimbursement_settlement'; date: string; settlementType: ReimbursementSettlement['settlement_type']; amount: number; balance: number }

export interface FlatLedgerHistory {
  openingBalance: number
  transactions: LedgerTransaction[]
  closingBalance: number
}

/**
 * A flat's full running account, transaction by transaction, across every
 * published period — not just today's `previous_due` snapshot. Walks each
 * period oldest-first, turning its own new charge (total_due minus
 * whatever previous_due it started with, so the carried-forward balance
 * isn't double-counted) into one debit, and every payment recorded against
 * it into a credit, running a balance across the whole history the same
 * way a bank statement would.
 *
 * Opening balance is the first published period's own previous_due — an
 * Admin-entered figure representing whatever a flat owed before Living
 * started tracking it (0 for a flat that's been on the system since day
 * one). Every period after that reads its charge from computeBillAgainstPeriod
 * rather than from that period's own (possibly hand-edited) previous_due —
 * so this running balance is the ledger's own arithmetic, and can differ
 * from a later period's previous_due if an Admin manually corrected it
 * there. That's fine for now — the ledger is the source of truth going
 * forward; reconciling a diverged previous_due is a later pass.
 *
 * Water/slab/tanker charges are keyed by calendar month, separately from
 * a maintenance period's own (Admin-chosen, not necessarily one-calendar-
 * month) date range — computeBillForFlat() always uses *today's* calendar
 * month for that lookup, which is only correct for the period that's
 * still actually current. Walking history has to match that exactly for
 * the current period (or its own numbers stop reconciling with what
 * Bills/Payments/Home show right now) and falls back to the period's own
 * start month for genuinely past periods, same convention getPreviousDueSuggestion
 * already uses — imperfect for a period spanning more than one calendar
 * month, but there's no stored record of which month's water reading was
 * actually meant for it.
 */
export async function getFlatLedgerHistory(supabase: SupabaseClient, apartment: Apartment, flat: Flat): Promise<FlatLedgerHistory> {
  const periods = await getPublishedMaintenancePeriods(supabase, apartment.id)
  if (periods.length === 0) return { openingBalance: 0, transactions: [], closingBalance: 0 }

  const currentPeriod = await getCurrentMaintenancePeriod(supabase, apartment.id)
  const todayMonth = monthKeyFor(new Date())
  const waterMonthFor = (period: MaintenanceMonth) => (currentPeriod && period.id === currentPeriod.id ? todayMonth : period.month)

  // Each period's bill + payments are independent of every other period — fetch them
  // all in parallel (this used to be a `for (const period of periods) { await ... }`
  // sequential waterfall, 24 round-trip groups awaited one after another for a flat
  // with two years of history). Only the balance walk below (pure in-memory arithmetic,
  // no awaits) actually needs to happen in period order, so it runs after, over the
  // already-resolved data. This also removes a duplicate fetch of periods[0]'s bill —
  // it used to be computed once here as `firstBill` and again inside the loop below.
  const periodData = await Promise.all(
    periods.map(async (period) => {
      const bill = await computeBillAgainstPeriod(supabase, apartment, flat, period, waterMonthFor(period))
      // Excludes method 'advance' — that row's effect is already fully captured by the
      // 'bill' transaction below (periodCharge, from total_due, which already nets
      // advance_payment); listing it again here would subtract it from balance twice.
      const payments = (await getPaymentsForFlat(supabase, period.id, flat.id)).filter((p) => p.method !== 'advance')
      return { period, bill, payments }
    })
  )

  const openingBalance = round2(periodData[0].bill.previous_due)
  const transactions: LedgerTransaction[] = [{ kind: 'opening', date: periods[0].month, amount: openingBalance, balance: openingBalance }]
  let balance = openingBalance

  for (const { period, bill, payments } of periodData) {
    const periodCharge = round2(bill.total_due - bill.previous_due)
    if (Math.abs(periodCharge) > 0.005) {
      balance = round2(balance + periodCharge)
      transactions.push({
        kind: 'bill',
        date: period.published_at ?? period.period_end,
        periodStart: period.month,
        periodEnd: period.period_end,
        amount: periodCharge,
        balance,
      })
    }

    const paymentsOldestFirst = [...payments].sort((a, b) => a.payment_date.localeCompare(b.payment_date))
    for (const payment of paymentsOldestFirst) {
      balance = round2(balance - payment.amount)
      transactions.push({
        kind: 'payment',
        date: payment.payment_date,
        method: payment.method,
        referenceNote: payment.reference_note,
        amount: payment.amount,
        balance,
      })
    }
  }

  // Resident-paid expenses and their settlements are a completely separate account (what the
  // association owes THIS flat, not what this flat owes the association) — walked on their own
  // running balance, then merged into the same chronological list purely for display. See the
  // LedgerTransaction doc comment above.
  const [residentExpenses, settlements] = await Promise.all([
    supabase
      .from('living_expenses')
      .select('*')
      .eq('resident_flat_id', flat.id)
      .eq('paid_by', 'resident')
      .is('voided_at', null)
      .order('expense_date', { ascending: true })
      .then((res) => (res.data as Expense[]) ?? []),
    supabase
      .from('living_reimbursement_settlements')
      .select('*')
      .eq('flat_id', flat.id)
      .order('created_at', { ascending: true })
      .then((res) => (res.data as ReimbursementSettlement[]) ?? []),
  ])

  type ReimbursementEvent =
    | { date: string; kind: 'resident_expense'; expenseId: string; description: string; amount: number }
    | { date: string; kind: 'reimbursement_settlement'; settlementType: ReimbursementSettlement['settlement_type']; amount: number }
  const reimbursementEvents: ReimbursementEvent[] = [
    ...residentExpenses.map((e): ReimbursementEvent => ({ date: e.expense_date, kind: 'resident_expense', expenseId: e.id, description: e.description, amount: e.amount })),
    ...settlements.map((s): ReimbursementEvent => ({ date: s.created_at.slice(0, 10), kind: 'reimbursement_settlement', settlementType: s.settlement_type, amount: s.amount })),
  ].sort((a, b) => a.date.localeCompare(b.date))

  let reimbursementBalance = 0
  for (const event of reimbursementEvents) {
    if (event.kind === 'resident_expense') {
      reimbursementBalance = round2(reimbursementBalance + event.amount)
      transactions.push({ kind: 'resident_expense', date: event.date, expenseId: event.expenseId, description: event.description, amount: event.amount, balance: reimbursementBalance })
    } else {
      reimbursementBalance = round2(reimbursementBalance - event.amount)
      transactions.push({ kind: 'reimbursement_settlement', date: event.date, settlementType: event.settlementType, amount: event.amount, balance: reimbursementBalance })
    }
  }
  // Keep 'opening' pinned first (it anchors the balance walk above), sort everything else by date
  // so the two independent event streams (association balance vs. reimbursement balance) read as
  // one chronological timeline.
  const [opening, ...rest] = transactions
  rest.sort((a, b) => a.date.localeCompare(b.date))

  return { openingBalance, transactions: [opening, ...rest], closingBalance: balance }
}

export interface FlatBillHistoryEntry {
  period: MaintenanceMonth
  bill: Bill
}

/**
 * Every published period's own bill for one flat, newest first — the
 * owner-facing "My Bills" history list. Same current-period water-month
 * convention as getFlatLedgerHistory (today's calendar month for whichever
 * period is still current, the period's own start month otherwise).
 */
export async function getBillHistoryForFlat(supabase: SupabaseClient, apartment: Apartment, flat: Flat): Promise<FlatBillHistoryEntry[]> {
  const periods = await getPublishedMaintenancePeriods(supabase, apartment.id)
  const currentPeriod = await getCurrentMaintenancePeriod(supabase, apartment.id)
  const todayMonth = monthKeyFor(new Date())
  const waterMonthFor = (period: MaintenanceMonth) => (currentPeriod && period.id === currentPeriod.id ? todayMonth : period.month)

  const entries = await Promise.all(
    periods.map(async (period) => ({ period, bill: await computeBillAgainstPeriod(supabase, apartment, flat, period, waterMonthFor(period)) }))
  )
  return entries.reverse()
}

/** Every payment recorded against one flat, across every period, newest first — the owner-facing Payments page. */
export async function getAllPaymentsForFlat(supabase: SupabaseClient, apartmentId: string, flatId: string): Promise<Payment[]> {
  const { data } = await supabase
    .from('living_payments')
    .select('*')
    .eq('apartment_id', apartmentId)
    .eq('flat_id', flatId)
    .order('payment_date', { ascending: false })
  return data ?? []
}

export interface PaymentWithFlat extends Payment {
  flat: Flat
}

/** One payment by id, with its flat joined in — the Receipt page's only query. */
export async function getPaymentById(supabase: SupabaseClient, apartmentId: string, paymentId: string): Promise<PaymentWithFlat | null> {
  const { data } = await supabase
    .from('living_payments')
    .select('*, flat:living_flats(*)')
    .eq('id', paymentId)
    .eq('apartment_id', apartmentId)
    .maybeSingle()
  return (data as unknown as PaymentWithFlat) ?? null
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

/**
 * Excludes method 'advance' rows — those are a visibility-only record of
 * advance_payment already netted directly into total_due (see
 * computeBillAgainstPeriod and syncAdvanceApplicationPayment); counting them
 * here too would subtract the same advance twice from amount_paid/balance
 * and from computeFinancialStatements' collections.
 */
export function sumPayments(payments: Payment[]): number {
  return payments.reduce((sum, p) => (p.method === 'advance' ? sum : sum + p.amount), 0)
}

/** Every expense recorded for a period, newest first — the Expenses page's log. Includes voided rows (struck through there for audit) — see sumExpenses for the totals-only view. */
export async function getExpensesForPeriod(supabase: SupabaseClient, maintenanceMonthId: string): Promise<Expense[]> {
  const { data } = await supabase
    .from('living_expenses')
    .select('*')
    .eq('maintenance_month_id', maintenanceMonthId)
    .order('expense_date', { ascending: false })
  return data ?? []
}

/** One expense by id, apartment-scoped — the expense detail page's main query. */
export async function getExpenseById(supabase: SupabaseClient, apartmentId: string, expenseId: string): Promise<Expense | null> {
  const { data } = await supabase.from('living_expenses').select('*').eq('id', expenseId).eq('apartment_id', apartmentId).maybeSingle<Expense>()
  return data
}

/** source_ref values already used within one period (manual expenses never set one) — the sync action's dedup identity. Includes voided rows on purpose, so reversing a synced expense doesn't make it silently reappear on the next sync. */
export async function getExistingSourceRefs(supabase: SupabaseClient, maintenanceMonthId: string): Promise<Set<string>> {
  const { data } = await supabase.from('living_expenses').select('source_ref').eq('maintenance_month_id', maintenanceMonthId).not('source_ref', 'is', null)
  return new Set(((data as { source_ref: string }[]) ?? []).map((r) => r.source_ref))
}

/** How many of this apartment's expenses (any period) currently use each category name — category is matched by name string, not a foreign key, same as everywhere else this list is used. Feeds the Categories tab's usage display; countExpensesUsingCategory is the authoritative recheck at delete time. */
export async function getCategoryUsageCounts(supabase: SupabaseClient, apartmentId: string): Promise<Map<string, number>> {
  const { data } = await supabase.from('living_expenses').select('category').eq('apartment_id', apartmentId).not('category', 'is', null)
  const counts = new Map<string, number>()
  for (const row of (data as { category: string }[]) ?? []) counts.set(row.category, (counts.get(row.category) ?? 0) + 1)
  return counts
}

/** Excludes voided rows — every consumer (Overview totals, category breakdown, computeFinancialStatements) wants the real, still-standing total. The Log page renders getExpensesForPeriod's raw list unfiltered so voided rows stay visible for audit; this is the only function that drops them. */
export function sumExpenses(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => (e.voided_at ? sum : sum + e.amount), 0)
}

/**
 * Every expense across the whole apartment (any period, not just the one
 * being superseded) that still owes a future billing cycle its share —
 * "Include in next bill cycle" or "Split across months" was checked when it
 * was recorded, and it hasn't fully rolled out yet. startPeriodAction folds
 * each one's amount / carry_forward_months into the new period's line items
 * and decrements carry_forward_remaining by one.
 */
export async function getCarryForwardExpenses(supabase: SupabaseClient, apartmentId: string): Promise<Expense[]> {
  const { data } = await supabase
    .from('living_expenses')
    .select('*')
    .eq('apartment_id', apartmentId)
    .gt('carry_forward_remaining', 0)
  return data ?? []
}

/** System categories (apartment_id null — SQL-seeded, shared by every apartment, read-only here) plus this apartment's own — active AND inactive, since the Categories tab needs to show a deactivated one to let it be reactivated. Callers building a picker (Record Expense) filter to is_active themselves. */
export async function getExpenseCategories(supabase: SupabaseClient, apartmentId: string): Promise<ExpenseCategory[]> {
  const { data } = await supabase
    .from('living_expense_categories')
    .select('*')
    .or(`apartment_id.is.null,apartment_id.eq.${apartmentId}`)
    .order('apartment_id', { ascending: true, nullsFirst: true })
    .order('name')
  return data ?? []
}

/** How many of this apartment's own (still-active-or-not, category is matched by name string) expenses currently use this category name — the usage count behind the Categories tab's delete-protection ("used by N expenses"). */
export async function countExpensesUsingCategory(supabase: SupabaseClient, apartmentId: string, categoryName: string): Promise<number> {
  const { count } = await supabase
    .from('living_expenses')
    .select('id', { count: 'exact', head: true })
    .eq('apartment_id', apartmentId)
    .eq('category', categoryName)
  return count ?? 0
}

/** One resident-paid expense's reimbursement detail — the expense itself plus every settlement against it, oldest first, with a running remaining balance. The "why does this balance exist" drill-down. */
export interface ReimbursementDetail {
  expense: Expense
  settlements: (ReimbursementSettlement & { runningRemaining: number })[]
  totalSettled: number
  remaining: number
}
export async function getReimbursementDetailForExpense(supabase: SupabaseClient, expenseId: string): Promise<ReimbursementDetail | null> {
  const [{ data: expense, error: expenseError }, { data: settlementRows, error: settlementsError }] = await Promise.all([
    supabase.from('living_expenses').select('*').eq('id', expenseId).maybeSingle<Expense>(),
    supabase.from('living_reimbursement_settlements').select('*').eq('expense_id', expenseId).order('created_at', { ascending: true }),
  ])
  if (expenseError) throw new Error(expenseError.message)
  if (settlementsError) throw new Error(settlementsError.message)
  if (!expense) return null
  const settlementsOldestFirst = (settlementRows as ReimbursementSettlement[]) ?? []
  let runningRemaining = expense.amount
  const settlements = settlementsOldestFirst.map((s) => {
    runningRemaining = round2(runningRemaining - s.amount)
    return { ...s, runningRemaining }
  })
  const totalSettled = round2(settlementsOldestFirst.reduce((sum, s) => sum + s.amount, 0))
  return { expense, settlements, totalSettled, remaining: round2(expense.amount - totalSettled) }
}

/** This one flat's reimbursement balance — every non-voided resident-paid expense minus every settlement against it, apartment-wide (not scoped to one period). */
export async function getReimbursementBalanceForFlat(supabase: SupabaseClient, apartmentId: string, flatId: string): Promise<number> {
  const [{ data: expenses, error: expensesError }, { data: settlements, error: settlementsError }] = await Promise.all([
    supabase.from('living_expenses').select('amount').eq('apartment_id', apartmentId).eq('resident_flat_id', flatId).eq('paid_by', 'resident').is('voided_at', null),
    supabase.from('living_reimbursement_settlements').select('amount').eq('apartment_id', apartmentId).eq('flat_id', flatId),
  ])
  if (expensesError) throw new Error(expensesError.message)
  if (settlementsError) throw new Error(settlementsError.message)
  const owed = ((expenses as { amount: number }[]) ?? []).reduce((sum, e) => sum + e.amount, 0)
  const settled = ((settlements as { amount: number }[]) ?? []).reduce((sum, s) => sum + s.amount, 0)
  return round2(owed - settled)
}

export interface OutstandingReimbursementRow {
  expense: Expense
  flat: Flat
  settled: number
  remaining: number
}
/** One row per resident-paid expense that still has a remaining balance — the Reimbursements tab's table. A settlement always ties to one specific expense (schema), so this is the right granularity for its action buttons; getApartmentReimbursementsDue's flat-aggregated total is a separate, coarser summary figure. */
export async function getOutstandingReimbursementExpenses(supabase: SupabaseClient, apartmentId: string, preloadedFlats?: Flat[]): Promise<OutstandingReimbursementRow[]> {
  // Joined manually (fetch + Map lookup) rather than a PostgREST embed (`flat:living_flats(*)`) —
  // an embed depends on the API's schema cache already knowing about resident_flat_id's FK, which
  // can lag behind a freshly-applied migration and silently returns flat: null per row instead of
  // erroring, which then got every row filtered out here. This has no such dependency.
  const [{ data: expenses, error: expensesError }, flats] = await Promise.all([
    supabase.from('living_expenses').select('*').eq('apartment_id', apartmentId).eq('paid_by', 'resident').is('voided_at', null).order('expense_date', { ascending: false }),
    preloadedFlats ?? getFlats(supabase, apartmentId),
  ])
  if (expensesError) throw new Error(expensesError.message)
  const rows = (expenses as Expense[]) ?? []
  if (rows.length === 0) return []

  const flatsById = new Map(flats.map((f) => [f.id, f]))
  const { data: settlements, error: settlementsError } = await supabase.from('living_reimbursement_settlements').select('expense_id, amount').eq('apartment_id', apartmentId)
  if (settlementsError) throw new Error(settlementsError.message)
  const settledByExpense = new Map<string, number>()
  for (const s of (settlements as { expense_id: string; amount: number }[]) ?? []) {
    settledByExpense.set(s.expense_id, (settledByExpense.get(s.expense_id) ?? 0) + s.amount)
  }

  const result: OutstandingReimbursementRow[] = []
  for (const e of rows) {
    const flat = e.resident_flat_id ? flatsById.get(e.resident_flat_id) : undefined
    if (!flat) continue
    const settled = round2(settledByExpense.get(e.id) ?? 0)
    const remaining = round2(e.amount - settled)
    if (remaining > 0.005) result.push({ expense: e, flat, settled, remaining })
  }
  return result
}

export interface ReimbursementDueRow {
  flat: Flat
  expensePaidByResident: number
  settled: number
  remaining: number
}
/** Every flat with a nonzero reimbursement balance, apartment-wide — feeds the Reimbursements tab and Overview's "Resident Reimbursements Due" figure. */
export async function getApartmentReimbursementsDue(
  supabase: SupabaseClient,
  apartmentId: string,
  preloadedFlats?: Flat[]
): Promise<{ total: number; flatCount: number; byFlat: ReimbursementDueRow[] }> {
  const [flats, { data: expenses, error: expensesError }, { data: settlements, error: settlementsError }] = await Promise.all([
    preloadedFlats ?? getFlats(supabase, apartmentId),
    supabase.from('living_expenses').select('resident_flat_id, amount').eq('apartment_id', apartmentId).eq('paid_by', 'resident').is('voided_at', null),
    supabase.from('living_reimbursement_settlements').select('flat_id, amount').eq('apartment_id', apartmentId),
  ])
  if (expensesError) throw new Error(expensesError.message)
  if (settlementsError) throw new Error(settlementsError.message)
  const owedByFlat = new Map<string, number>()
  for (const e of (expenses as { resident_flat_id: string | null; amount: number }[]) ?? []) {
    if (!e.resident_flat_id) continue
    owedByFlat.set(e.resident_flat_id, (owedByFlat.get(e.resident_flat_id) ?? 0) + e.amount)
  }
  const settledByFlat = new Map<string, number>()
  for (const s of (settlements as { flat_id: string; amount: number }[]) ?? []) {
    settledByFlat.set(s.flat_id, (settledByFlat.get(s.flat_id) ?? 0) + s.amount)
  }
  const flatsById = new Map(flats.map((f) => [f.id, f]))
  const byFlat: ReimbursementDueRow[] = []
  for (const [flatId, owed] of owedByFlat) {
    const flat = flatsById.get(flatId)
    if (!flat) continue
    const settled = settledByFlat.get(flatId) ?? 0
    const remaining = round2(owed - settled)
    if (remaining > 0.005) byFlat.push({ flat, expensePaidByResident: round2(owed), settled: round2(settled), remaining })
  }
  byFlat.sort((a, b) => b.remaining - a.remaining)
  return { total: round2(byFlat.reduce((sum, r) => sum + r.remaining, 0)), flatCount: byFlat.length, byFlat }
}

/** Shared master data — same list for every apartment, not filtered by apartment_id. */
export async function getEventCategories(supabase: SupabaseClient): Promise<EventCategory[]> {
  const { data } = await supabase.from('living_event_categories').select('*').order('name')
  return data ?? []
}

export async function getEvents(supabase: SupabaseClient, apartmentId: string): Promise<LivingEvent[]> {
  const { data } = await supabase
    .from('living_events')
    .select('*')
    .eq('apartment_id', apartmentId)
    .order('event_date', { ascending: false, nullsFirst: false })
  return data ?? []
}

export async function getEvent(supabase: SupabaseClient, apartmentId: string, eventId: string): Promise<LivingEvent | null> {
  const { data } = await supabase.from('living_events').select('*').eq('id', eventId).eq('apartment_id', apartmentId).maybeSingle<LivingEvent>()
  return data
}

/** Every contribution collected towards an event, newest first. */
export async function getEventCollections(supabase: SupabaseClient, eventId: string): Promise<EventCollection[]> {
  const { data } = await supabase.from('living_event_collections').select('*').eq('event_id', eventId).order('collected_date', { ascending: false })
  return data ?? []
}

export function sumEventCollections(rows: EventCollection[]): number {
  return rows.reduce((sum, r) => sum + r.amount, 0)
}

/** Every expense recorded against an event, newest first. */
export async function getEventExpenses(supabase: SupabaseClient, eventId: string): Promise<EventExpense[]> {
  const { data } = await supabase.from('living_event_expenses').select('*').eq('event_id', eventId).order('expense_date', { ascending: false })
  return data ?? []
}

export function sumEventExpenses(rows: EventExpense[]): number {
  return rows.reduce((sum, r) => sum + r.amount, 0)
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

/**
 * Flats whose rise streak has reached the apartment's notify_admin_at_streak
 * threshold — surfaced on the Admin/Treasurer home. `preloadedFlats` lets a
 * caller that already fetched this apartment's flat list (Home does) pass
 * it straight through instead of a second, redundant getFlats() round trip;
 * the per-flat streak lookups run in parallel rather than one-by-one — with
 * ~28 flats, sequential awaits here were the largest single contributor to
 * a multi-second Home page load.
 */
export async function getRiseAlerts(supabase: SupabaseClient, apartment: Apartment, month: string, preloadedFlats?: Flat[]): Promise<RiseAlert[]> {
  const slab = await getEffectiveSlabConfig(supabase, apartment.id, month)
  if (!slab) return []
  const flats = preloadedFlats ?? (await getFlats(supabase, apartment.id))

  const streaks = await Promise.all(flats.map((flat) => getRiseStreakForFlat(supabase, flat.id, slab.rise_threshold_percent)))
  const alerts: RiseAlert[] = []
  flats.forEach((flat, i) => {
    if (streaks[i] >= slab.notify_admin_at_streak) alerts.push({ flat, streak: streaks[i] })
  })
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

export interface FlaggedReading {
  reading: WaterReading
  flat: Flat
}

/** Meters currently marked broken/flagged (WaterReading.flagged) apartment-wide — distinct from a dispute (a resident contesting a reading/charge). Surfaced on Overview's Needs Attention. */
export async function getFlaggedReadings(supabase: SupabaseClient, apartmentId: string): Promise<FlaggedReading[]> {
  const { data } = await supabase
    .from('living_water_readings')
    .select('*, flat:living_flats(*)')
    .eq('apartment_id', apartmentId)
    .eq('flagged', true)
    .order('month', { ascending: false })
  return ((data as unknown as (WaterReading & { flat: Flat })[]) ?? []).map((row) => ({ reading: row, flat: row.flat }))
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

// ─── Community: Notices, Meetings, Requests, Financial Statements ────────

export async function getNotices(supabase: SupabaseClient, apartmentId: string): Promise<Notice[]> {
  const { data } = await supabase.from('living_notices').select('*').eq('apartment_id', apartmentId).order('created_at', { ascending: false })
  return data ?? []
}

export async function getMeetings(supabase: SupabaseClient, apartmentId: string): Promise<Meeting[]> {
  const { data } = await supabase.from('living_meetings').select('*').eq('apartment_id', apartmentId).order('meeting_date', { ascending: false })
  return data ?? []
}

export async function getMeeting(supabase: SupabaseClient, apartmentId: string, meetingId: string): Promise<Meeting | null> {
  const { data } = await supabase.from('living_meetings').select('*').eq('id', meetingId).eq('apartment_id', apartmentId).maybeSingle()
  return data
}

/** An Owner's own flat's requests — newest first. */
export async function getMyRequests(supabase: SupabaseClient, flatId: string): Promise<ResidentRequest[]> {
  const { data } = await supabase.from('living_requests').select('*').eq('flat_id', flatId).order('raised_at', { ascending: false })
  return data ?? []
}

export interface RequestWithFlat extends ResidentRequest {
  flat: Flat
}

/** Every request across the apartment, newest first — the admin/treasurer queue. */
export async function getAllRequests(supabase: SupabaseClient, apartmentId: string): Promise<RequestWithFlat[]> {
  const { data } = await supabase
    .from('living_requests')
    .select('*, flat:living_flats(*)')
    .eq('apartment_id', apartmentId)
    .order('raised_at', { ascending: false })
  return (data as unknown as RequestWithFlat[]) ?? []
}

export interface PublishedStatementWithPeriod extends PublishedStatement {
  period: MaintenanceMonth
}

/** Published Financial Statement snapshots only — safe for any role, never recomputed by the reading session. */
export async function getPublishedStatements(supabase: SupabaseClient, apartmentId: string): Promise<PublishedStatementWithPeriod[]> {
  const { data } = await supabase
    .from('living_financial_statements')
    .select('*, period:living_maintenance_months(*)')
    .eq('apartment_id', apartmentId)
    .order('published_at', { ascending: false })
  return (data as unknown as PublishedStatementWithPeriod[]) ?? []
}

/**
 * Whether `maintenanceMonthId`'s books are permanently closed — a Financial
 * Statement has been published for it (living_financial_statements, via the
 * Statements page). Once true, nothing about that period's bill is editable
 * by anyone, Admin included: line items, water readings/adjustments feeding
 * it, and ledger entries (advance/late fee/previous due/transfers) all stay
 * exactly as they were the moment the statement was published. New Payments
 * are the one exception — a resident paying late after the close is normal,
 * not a correction, so that keeps working. Every mutating action on
 * Maintenance/Water should check this before writing.
 */
export async function isPeriodFinancialStatementLocked(supabase: SupabaseClient, apartmentId: string, maintenanceMonthId: string): Promise<boolean> {
  const { data } = await supabase
    .from('living_financial_statements')
    .select('id')
    .eq('apartment_id', apartmentId)
    .eq('maintenance_month_id', maintenanceMonthId)
    .maybeSingle()
  return !!data
}

/**
 * Same lock as isPeriodFinancialStatementLocked, but keyed by a calendar
 * month (e.g. a water reading's own `month`) instead of a maintenance_month_id
 * — a maintenance period can span more than one calendar month (see the
 * schema comment on living_maintenance_months), so a reading's month has to
 * be matched against whichever period's [month, period_end] range contains
 * it, not assumed to equal the period's own `month` column.
 */
export async function isCalendarMonthFinancialStatementLocked(supabase: SupabaseClient, apartmentId: string, month: string): Promise<boolean> {
  const { data: periods } = await supabase
    .from('living_maintenance_months')
    .select('id')
    .eq('apartment_id', apartmentId)
    .lte('month', month)
    .gte('period_end', month)
  if (!periods || periods.length === 0) return false

  const { count } = await supabase
    .from('living_financial_statements')
    .select('id', { count: 'exact', head: true })
    .eq('apartment_id', apartmentId)
    .in(
      'maintenance_month_id',
      periods.map((p) => p.id)
    )
  return (count ?? 0) > 0
}

export interface ComputedStatement {
  period: MaintenanceMonth
  openingBalance: number
  collections: number
  expenses: number
  closingBalance: number
  outstandingDues: number
}

/**
 * The live, accurate Financial Statement walk — admin/treasurer ONLY. Needs
 * every billable flat's water reading (via computeBillAgainstPeriod), and
 * living_water_readings' RLS restricts an Owner to their own flat's rows —
 * so this is only accurate under an admin/treasurer session, same as
 * Bills/Payments already assume. Callers must gate with
 * requireMembership(['admin', 'treasurer']) before calling this.
 */
export async function computeFinancialStatements(supabase: SupabaseClient, apartment: Apartment): Promise<ComputedStatement[]> {
  const periods = await getPublishedMaintenancePeriods(supabase, apartment.id)
  if (periods.length === 0) return []

  const flats = getBillableFlats(await getFlats(supabase, apartment.id))
  const currentPeriod = await getCurrentMaintenancePeriod(supabase, apartment.id)
  const todayMonth = monthKeyFor(new Date())
  const waterMonthFor = (period: MaintenanceMonth) => (currentPeriod && period.id === currentPeriod.id ? todayMonth : period.month)

  let runningBalance = apartment.opening_cash_balance ?? 0
  const statements: ComputedStatement[] = []

  for (const period of periods) {
    const [payments, expenses, cashSettlements] = await Promise.all([
      getPaymentsForPeriod(supabase, period.id),
      getExpensesForPeriod(supabase, period.id),
      getCashReimbursementSettlementsForPeriod(supabase, period.id),
    ])
    const collections = round2(sumPayments(payments))
    // expensesTotal is untouched by settlements on purpose — a resident-paid expense is a real
    // expense the moment it's recorded, whether or not cash has moved yet (accrual, not cash-basis,
    // for the expense side). cashSettlements is the actual cash outflow when the association later
    // pays that resident back — real association cash leaving, same as any other expense payout.
    const expensesTotal = round2(sumExpenses(expenses))
    const openingBalance = round2(runningBalance)
    const closingBalance = round2(openingBalance + collections - expensesTotal - cashSettlements)
    runningBalance = closingBalance

    const bills = await Promise.all(flats.map((flat) => computeBillAgainstPeriod(supabase, apartment, flat, period, waterMonthFor(period))))
    const outstandingDues = round2(bills.reduce((sum, b) => sum + b.balance_remaining, 0))

    statements.push({ period, openingBalance, collections, expenses: expensesTotal, closingBalance, outstandingDues })
  }

  return statements.reverse()
}

/**
 * "How much cash does the association actually have right now" — Overview's
 * Financial Summary "Closing/Available Balance" card. Deliberately reads
 * from `publishedStatements` (a plain getPublishedStatements() call, one
 * cheap query, snapshot values already computed once at publish time) —
 * NOT computeFinancialStatements(), which recomputes every billable flat's
 * bill for every published period on every call and is only meant for the
 * Statements page itself. Calling that here would re-run the same expensive
 * walk on every single Overview page load (confirmed: this exact mistake
 * took /living/home from ~2s to 15-28s in dev before being caught).
 *
 * If the current period is itself already published, its own snapshot IS
 * this figure (most authoritative, don't recompute). Otherwise the baseline
 * is the most recent published period's closing balance (or the
 * apartment's opening_cash_balance if none has ever been published), plus
 * whatever the in-progress period has collected/spent so far — the caller
 * already has both of those numbers from its own bill computation, so this
 * is a pure function, no I/O.
 */
export function getCurrentAvailableBalance(
  apartment: Apartment,
  publishedStatements: PublishedStatementWithPeriod[],
  currentPeriodId: string | null,
  currentPeriodCollected: number,
  currentPeriodExpenses: number
): number {
  const currentStatement = currentPeriodId ? publishedStatements.find((s) => s.maintenance_month_id === currentPeriodId) : undefined
  if (currentStatement) return currentStatement.closing_balance
  const baseline = publishedStatements[0] ? publishedStatements[0].closing_balance : apartment.opening_cash_balance ?? 0
  return round2(baseline + currentPeriodCollected - currentPeriodExpenses)
}

export type ActivityEntry =
  | { kind: 'payment'; createdAt: string; flatNo: string; amount: number; method: PaymentMethod }
  | { kind: 'expense'; createdAt: string; category: string | null; description: string; amount: number }

/**
 * The most recent payments + expenses across the whole apartment, merged and
 * sorted by when they were actually recorded (created_at — a real
 * timestamp, not the user-editable payment/expense date, which is only a
 * date with no time component and can be backdated) — Overview's "Recent
 * Activity" and /living/activity. System-written 'advance' payment rows are
 * excluded, same as everywhere else that sums/lists real payments (see
 * sumPayments).
 */
export async function getRecentActivity(supabase: SupabaseClient, apartmentId: string, limit = 8): Promise<ActivityEntry[]> {
  const [{ data: payments }, { data: expenses }] = await Promise.all([
    supabase.from('living_payments').select('*, flat:living_flats(*)').eq('apartment_id', apartmentId).order('created_at', { ascending: false }).limit(limit),
    supabase.from('living_expenses').select('*').eq('apartment_id', apartmentId).order('created_at', { ascending: false }).limit(limit),
  ])

  const paymentEntries: ActivityEntry[] = ((payments as unknown as PaymentWithFlat[]) ?? [])
    .filter((p) => p.method !== 'advance')
    .map((p) => ({ kind: 'payment', createdAt: p.created_at, flatNo: p.flat.flat_no, amount: p.amount, method: p.method }))
  const expenseEntries: ActivityEntry[] = ((expenses as Expense[]) ?? []).map((e) => ({
    kind: 'expense',
    createdAt: e.created_at,
    category: e.category,
    description: e.description,
    amount: e.amount,
  }))

  return [...paymentEntries, ...expenseEntries]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
}
