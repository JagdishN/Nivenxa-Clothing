import type { SupabaseClient } from '@supabase/supabase-js'
import { brokenMeterCharge, combinedWaterRatePer1000L, maintenanceGrandTotal, paymentStatus, riseStreak, round2, slabWaterCharge, splitMaintenance, tankerAndMajeeraLiters, waterSupplyCostTotal } from './billing'
import { daysInMonth, monthBefore, monthKeyFor } from './format'
import type { AdvanceTransfer, Apartment, Bill, EventCategory, EventCollection, EventExpense, Expense, ExpenseCategory, Flat, FlatClaim, FlatLedgerEntry, InventoryCategory, InventoryUnit, LivingEvent, MaintenanceMonth, Meeting, Notice, Payment, PublishedStatement, ResidentRequest, ServiceType, SlabCalculationMethod, SlabConfig, TankerRates, WaterBillingMethod, WaterBillSnapshot, WaterReading, WaterSupplyCost, WaterTierBreakdownEntry } from './types'

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

/** Sum of every flat's own metered consumption (current - previous) for `month` — every flat with a real reading, not just billable ones (a merged child-meter and the shared/common meter both draw from the same supply). The denominator side of the true-up: see getIncomingGap. */
export async function getTotalConsumptionForMonth(supabase: SupabaseClient, apartmentId: string, month: string): Promise<number> {
  const { data } = await supabase
    .from('living_water_readings')
    .select('current_reading, previous_reading')
    .eq('apartment_id', apartmentId)
    .eq('month', month)
    .not('current_reading', 'is', null)
    .not('previous_reading', 'is', null)
  return (data ?? []).reduce((sum, r) => sum + ((r.current_reading as number) - (r.previous_reading as number)), 0)
}

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
export async function getIncomingGap(supabase: SupabaseClient, apartmentId: string, month: string): Promise<number> {
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
}

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
export async function getCombinedWaterRate(supabase: SupabaseClient, apartmentId: string, month: string): Promise<number> {
  const [supplyCost, tankerRates, incomingGap] = await Promise.all([
    getWaterSupplyCost(supabase, apartmentId, month),
    getEffectiveTankerRates(supabase, apartmentId, month),
    getIncomingGap(supabase, apartmentId, month),
  ])
  if (!supplyCost || !tankerRates) return 0
  const liters = tankerAndMajeeraLiters(supplyCost, daysInMonth(month))
  const cost = waterSupplyCostTotal(supplyCost, tankerRates)
  return combinedWaterRatePer1000L(cost, liters, incomingGap) ?? 0
}

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
  month: string
): Promise<Bill> {
  const [allFlats, own] = await Promise.all([getFlats(supabase, apartment.id), getMeteredWaterCharge(supabase, apartment, flat, month)])
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

  const totalDue = round2(maintenanceShare + meteredCharge + lateFee + previousDue - advancePayment)
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

export type LedgerTransaction =
  | { kind: 'opening'; date: string; amount: number; balance: number }
  | { kind: 'bill'; date: string; periodStart: string; periodEnd: string; amount: number; balance: number }
  | { kind: 'payment'; date: string; method: Payment['method']; referenceNote: string | null; amount: number; balance: number }

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

  const firstBill = await computeBillAgainstPeriod(supabase, apartment, flat, periods[0], waterMonthFor(periods[0]))
  const openingBalance = round2(firstBill.previous_due)

  const transactions: LedgerTransaction[] = [{ kind: 'opening', date: periods[0].month, amount: openingBalance, balance: openingBalance }]
  let balance = openingBalance

  for (const period of periods) {
    const bill = await computeBillAgainstPeriod(supabase, apartment, flat, period, waterMonthFor(period))
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

    // Excludes method 'advance' — that row's effect is already fully captured by the
    // 'bill' transaction above (periodCharge, from total_due, which already nets
    // advance_payment); listing it again here would subtract it from balance twice.
    const payments = (await getPaymentsForFlat(supabase, period.id, flat.id)).filter((p) => p.method !== 'advance')
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

  return { openingBalance, transactions, closingBalance: balance }
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

/** Every expense recorded for a period, newest first — the Expenses page's log. */
export async function getExpensesForPeriod(supabase: SupabaseClient, maintenanceMonthId: string): Promise<Expense[]> {
  const { data } = await supabase
    .from('living_expenses')
    .select('*')
    .eq('maintenance_month_id', maintenanceMonthId)
    .order('expense_date', { ascending: false })
  return data ?? []
}

export function sumExpenses(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + e.amount, 0)
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

/** Shared master data — same list for every apartment, not filtered by apartment_id. */
export async function getExpenseCategories(supabase: SupabaseClient): Promise<ExpenseCategory[]> {
  const { data } = await supabase.from('living_expense_categories').select('*').order('name')
  return data ?? []
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
    const [payments, expenses] = await Promise.all([getPaymentsForPeriod(supabase, period.id), getExpensesForPeriod(supabase, period.id)])
    const collections = round2(sumPayments(payments))
    const expensesTotal = round2(sumExpenses(expenses))
    const openingBalance = round2(runningBalance)
    const closingBalance = round2(openingBalance + collections - expensesTotal)
    runningBalance = closingBalance

    const bills = await Promise.all(flats.map((flat) => computeBillAgainstPeriod(supabase, apartment, flat, period, waterMonthFor(period))))
    const outstandingDues = round2(bills.reduce((sum, b) => sum + b.balance_remaining, 0))

    statements.push({ period, openingBalance, collections, expenses: expensesTotal, closingBalance, outstandingDues })
  }

  return statements.reverse()
}
