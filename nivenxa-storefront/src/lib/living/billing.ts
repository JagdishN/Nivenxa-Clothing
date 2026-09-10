import type { EscalationCadence, Flat, MaintenanceLineItem, PaymentStatus, SlabCalculationMethod, SlabConfig, SlabTier, SplitMode, TankerRates, WaterSupplyCost, WaterTierBreakdownEntry } from './types'

/**
 * Pure, no I/O — matches the worked examples in the published spec exactly
 * (₹83,510 equal/weighted split; ₹450 → ₹900 → ₹1,800 broken-meter
 * escalation). Metered water is priced off a combined ₹/1,000L rate derived
 * from actual monthly tanker/Majeera spend (see `combinedWaterRatePer1000L`
 * and queries.ts's `getCombinedWaterRate`) — either flat against every flat's
 * consumption ('standard'), or multiplied per configured band ('slab', see
 * `slabWaterCharge`), never a fixed admin-entered rate. Intermediate math
 * here stays unrounded on purpose (splitting ₹83,510 across 20 flats
 * shouldn't lose a paisa to premature rounding) — `round2` exists for the
 * one place that needs a clean 2-decimal number: the final Bill returned to
 * callers.
 */

/** Rounds to 2 decimal places — for a final display/stored amount, never an intermediate step (see note above). */
export function round2(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100
}

/**
 * e.g. "NXL-2026-09-0102-001" — year/month the payment was made, the flat
 * it was made against, and a per-flat-per-month running count (1-indexed,
 * zero-padded to 3 digits) so two payments from the same flat in the same
 * month get distinct numbers. `sequence` is the caller's job to compute
 * (a count of that flat's payments already in the month) — this function
 * only formats it.
 */
export function formatReceiptNumber(paymentDate: string, flatNo: string, sequence: number): string {
  const [year, month] = paymentDate.split('-')
  return `NXL-${year}-${month}-${flatNo}-${String(sequence).padStart(3, '0')}`
}

/** Nothing owed (e.g. a fully-credited flat) → paid; nothing paid → unpaid; covers the due (or overpays it) → paid; anything in between → partial. */
export function paymentStatus(totalDue: number, amountPaid: number): PaymentStatus {
  if (totalDue <= 0) return 'paid'
  if (amountPaid <= 0) return 'unpaid'
  return amountPaid >= totalDue ? 'paid' : 'partial'
}

/**
 * The amount that actually gets split across flats — line items only.
 * Confirmed against a real maintenance sheet: its `amount_per_flat` matches
 * `sum(line_items) / flat_count` exactly. Water/tanker spend is a separate
 * pool entirely now — see `waterSupplyCostTotal` — split into the water
 * bill, not this one.
 */
export function maintenanceGrandTotal(lineItems: MaintenanceLineItem[]): number {
  return lineItems.reduce((sum, item) => sum + item.amount, 0)
}

/** This month's tanker spend only (private + government) — rate × count per tanker size. */
export function tankerCostTotal(
  cost: WaterSupplyCost,
  rates: Pick<TankerRates, 'rate_small_5000l' | 'rate_large_10000l' | 'rate_xlarge_25000l' | 'rate_govt_small_5000l' | 'rate_govt_large_10000l'>
): number {
  return (
    cost.small_tanker_count * rates.rate_small_5000l +
    cost.large_tanker_count * rates.rate_large_10000l +
    cost.xlarge_tanker_count * rates.rate_xlarge_25000l +
    cost.govt_small_tanker_count * rates.rate_govt_small_5000l +
    cost.govt_large_tanker_count * rates.rate_govt_large_10000l
  )
}

/** This month's Majeera spend only — not rate-multiplied, its amount (and optional extra) is entered directly. */
export function majeeraCostTotal(cost: WaterSupplyCost): number {
  return cost.majeera_amount + (cost.majeera_extra_enabled ? cost.majeera_extra_amount ?? 0 : 0)
}

/**
 * This month's total water-supply spend (tankers + Majeera) — the numerator
 * for the combined ₹/1,000L rate (see `combinedWaterRatePer1000L`), not a
 * pool split across flats on its own anymore.
 */
export function waterSupplyCostTotal(
  cost: WaterSupplyCost,
  rates: Pick<TankerRates, 'rate_small_5000l' | 'rate_large_10000l' | 'rate_xlarge_25000l' | 'rate_govt_small_5000l' | 'rate_govt_large_10000l'>
): number {
  return tankerCostTotal(cost, rates) + majeeraCostTotal(cost)
}

const MAJEERA_LITERS_PER_CONNECTION_PER_DAY = 500

/**
 * Litres this month's tankers + Majeera are assumed to have supplied —
 * tankers by their fixed capacity × count, Majeera by the government norm
 * (500L/day per connection × days in the month). The denominator for the
 * combined ₹/1,000L rate (see `combinedWaterRatePer1000L`).
 */
export function tankerAndMajeeraLiters(cost: WaterSupplyCost, daysInMonth: number): number {
  const tankerLiters =
    cost.small_tanker_count * 5000 +
    cost.large_tanker_count * 10000 +
    cost.xlarge_tanker_count * 25000 +
    cost.govt_small_tanker_count * 5000 +
    cost.govt_large_tanker_count * 10000
  const majeeraLiters = cost.majeera_connection_count * MAJEERA_LITERS_PER_CONNECTION_PER_DAY * daysInMonth
  return tankerLiters + majeeraLiters
}

/**
 * The single ₹/1,000L rate actually billed against every flat's own
 * metered consumption this month — this month's tanker/govt-tanker/Majeera
 * spend, PLUS whatever wasn't fully recovered last month (a positive
 * `incomingGap` means last month under-recovered and this month's rate
 * rises to make it up; negative means it over-recovered and this month's
 * rate falls), divided by this month's purchased litres. Replaces the old
 * two-part model (Admin-set Slab tiers for metered water + a separate
 * equal/weighted "supply share" split) — see queries.ts's getCombinedWaterRate
 * for how `incomingGap` itself gets carried forward month to month. Returns
 * null when there's nothing purchased this month to divide by; the caller
 * treats that as "no charge this month," and the incoming gap simply isn't
 * resolved yet — it passes through to the next month that DOES purchase water.
 */
export function combinedWaterRatePer1000L(purchasedCost: number, purchasedLiters: number, incomingGap: number): number | null {
  if (purchasedLiters <= 0) return null
  return ((purchasedCost + incomingGap) / purchasedLiters) * 1000
}

/** The tier whose [from_liters, to_liters) band contains `liters` — falls back to the last tier if every to_liters is exceeded (mirrors "above the top band" in the user's own examples). Assumes `tiers` is sorted ascending by from_liters. */
function tierFor(liters: number, tiers: SlabTier[]): SlabTier {
  for (const tier of tiers) {
    if (liters >= tier.from_liters && (tier.to_liters === null || liters < tier.to_liters)) return tier
  }
  return tiers[tiers.length - 1]
}

/**
 * Walks each configured tier in order, billing only the portion of
 * consumption that falls within it — the entire consumption never billed at
 * one rate unless there's only one tier. Each tier's rate is that month's
 * dynamic `baseRatePer1000L` × the tier's own multiplier, never a fixed
 * rupee amount, so the same tier configuration keeps producing correct
 * charges as the underlying tanker/Majeera cost changes month to month.
 */
export function progressiveSlabCharge(consumptionLiters: number, baseRatePer1000L: number, tiers: SlabTier[]): { amount: number; breakdown: WaterTierBreakdownEntry[] } {
  let remaining = Math.max(0, consumptionLiters)
  let total = 0
  const breakdown: WaterTierBreakdownEntry[] = []
  for (const tier of tiers) {
    if (remaining <= 0) break
    const tierSpan = tier.to_liters === null ? Infinity : tier.to_liters - tier.from_liters
    const litersInTier = Math.min(remaining, tierSpan)
    if (litersInTier <= 0) continue
    const rate = baseRatePer1000L * tier.rate_multiplier
    const amount = (litersInTier / 1000) * rate
    total += amount
    breakdown.push({ from_liters: tier.from_liters, to_liters: tier.to_liters, rate_multiplier: tier.rate_multiplier, rate, liters_billed: litersInTier, amount })
    remaining -= litersInTier
  }
  return { amount: total, breakdown }
}

/**
 * Total consumption determines exactly ONE applicable tier (whichever band
 * the whole amount falls into) — that tier's rate then bills the entire
 * consumption, not just the portion above its threshold. A different
 * interpretation of the same tier configuration than `progressiveSlabCharge`
 * — associations choose one or the other via SlabConfig.slab_calculation_method.
 */
export function wholeConsumptionSlabCharge(consumptionLiters: number, baseRatePer1000L: number, tiers: SlabTier[]): { amount: number; breakdown: WaterTierBreakdownEntry[] } {
  const liters = Math.max(0, consumptionLiters)
  if (tiers.length === 0) return { amount: 0, breakdown: [] }
  const tier = tierFor(liters, tiers)
  const rate = baseRatePer1000L * tier.rate_multiplier
  const amount = (liters / 1000) * rate
  return { amount, breakdown: [{ from_liters: tier.from_liters, to_liters: tier.to_liters, rate_multiplier: tier.rate_multiplier, rate, liters_billed: liters, amount }] }
}

/** Dispatches to the configured slab calculation method — the one place `queries.ts` needs to know which function to call. */
export function slabWaterCharge(
  consumptionLiters: number,
  baseRatePer1000L: number,
  method: SlabCalculationMethod,
  tiers: SlabTier[]
): { amount: number; breakdown: WaterTierBreakdownEntry[] } {
  return method === 'whole_consumption'
    ? wholeConsumptionSlabCharge(consumptionLiters, baseRatePer1000L, tiers)
    : progressiveSlabCharge(consumptionLiters, baseRatePer1000L, tiers)
}

/**
 * `share_override` is treated as a weight in the same unit space as
 * `sq_ft` — not a literal rupee amount and not an independently-normalized
 * percentage (mixing "some flats by sq_ft, some by an independent
 * percentage" in one pool can't be made to sum to the grand total
 * coherently). A flat with `share_override = 1450` gets exactly the same
 * share a flat with `sq_ft = 1450` would. The spec's own wording
 * ("percentage/amount override") doesn't pin this down further — this is
 * the interpretation that keeps every flat's share summing to the grand total.
 *
 * `equalDivisorOverride` (Apartment.shared_cost_divisor) replaces
 * `flats.length` as the equal-split divisor when set — a flat with two
 * water meters, or a row in `living_flats` that isn't really a separate
 * billable unit, means "number of flat rows" and "number of units to
 * average common costs across" aren't always the same number. When
 * overridden, per-flat shares no longer necessarily sum to `grandTotal` —
 * that's the Admin's own deliberate call, not a bug to fix here.
 */
export function splitMaintenance(
  grandTotal: number,
  flats: Pick<Flat, 'id' | 'sq_ft' | 'share_override'>[],
  splitMode: SplitMode,
  equalDivisorOverride?: number | null
): Map<string, number> {
  const shares = new Map<string, number>()
  if (flats.length === 0) return shares

  const equalDivisor = equalDivisorOverride && equalDivisorOverride > 0 ? equalDivisorOverride : flats.length

  if (splitMode === 'equal') {
    const perFlat = grandTotal / equalDivisor
    for (const flat of flats) shares.set(flat.id, perFlat)
    return shares
  }

  const weights = flats.map((f) => f.share_override ?? f.sq_ft ?? 0)
  const totalWeight = weights.reduce((a, b) => a + b, 0)
  if (totalWeight <= 0) {
    // No flat has a usable weight — fall back to equal rather than divide by zero.
    const perFlat = grandTotal / equalDivisor
    for (const flat of flats) shares.set(flat.id, perFlat)
    return shares
  }

  flats.forEach((flat, i) => shares.set(flat.id, grandTotal * (weights[i] / totalWeight)))
  return shares
}

const CADENCE_DAYS: Record<EscalationCadence, number> = { weekly: 7, monthly: 30 }

/**
 * `lastBilledAmount` is the flat's water charge from the last month its
 * meter actually worked — fixed once at flagging time, then escalated from
 * there, never re-derived from unknown consumption while flagged.
 */
export function brokenMeterCharge(
  lastBilledAmount: number,
  flaggedSince: string,
  asOf: Date,
  slab: Pick<SlabConfig, 'grace_period_days' | 'escalation_cadence' | 'escalation_multiplier'>
): { amount: number; escalationSteps: number } {
  const since = new Date(flaggedSince)
  const daysFlagged = Math.floor((asOf.getTime() - since.getTime()) / 86_400_000)

  if (daysFlagged <= slab.grace_period_days) {
    return { amount: lastBilledAmount, escalationSteps: 0 }
  }

  const daysPastGrace = daysFlagged - slab.grace_period_days
  const cadenceDays = CADENCE_DAYS[slab.escalation_cadence]
  const steps = Math.floor(daysPastGrace / cadenceDays) + 1
  return { amount: lastBilledAmount * slab.escalation_multiplier ** steps, escalationSteps: steps }
}

/**
 * Counts consecutive rising months ending at the most recent reading —
 * `readingsNewestFirst[0]` is this month. Returns 0 as soon as a month
 * doesn't exceed the threshold (or a prior consumption is missing/zero,
 * which can't establish a rise). Drives the 1st/2nd/3rd-month UI tiers in
 * Workflow D and the `notify_admin_at_streak` queue item.
 */
export function riseStreak(readingsNewestFirst: { consumption_liters: number | null }[], riseThresholdPercent: number): number {
  let streak = 0
  for (let i = 0; i < readingsNewestFirst.length - 1; i++) {
    const current = readingsNewestFirst[i].consumption_liters
    const previous = readingsNewestFirst[i + 1].consumption_liters
    if (current === null || previous === null || previous <= 0) break
    const risePercent = ((current - previous) / previous) * 100
    if (risePercent <= riseThresholdPercent) break
    streak++
  }
  return streak
}
