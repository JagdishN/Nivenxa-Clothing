import type { EscalationCadence, Flat, MaintenanceLineItem, SlabConfig, SplitMode, TankerRates, WaterSupplyCost } from './types'

/**
 * Pure, no I/O — matches the worked examples in the published spec exactly
 * (₹83,510 equal/weighted split; ₹116.80 tiered water charge for 12,400L;
 * ₹450 → ₹900 → ₹1,800 broken-meter escalation). Intermediate math here
 * stays unrounded on purpose (splitting ₹83,510 across 20 flats shouldn't
 * lose a paisa to premature rounding) — `round2` exists for the one place
 * that needs a clean 2-decimal number: the final Bill returned to callers.
 */

/** Rounds to 2 decimal places — for a final display/stored amount, never an intermediate step (see note above). */
export function round2(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100
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

/**
 * This month's total water-supply spend (tankers + Majeera) — the pool that
 * gets split across flats (same equal/weighted logic as maintenance, via
 * `splitMaintenance`) and added to each flat's own metered charge. Majeera
 * isn't rate-multiplied — its amount (and optional extra) is entered directly.
 */
export function waterSupplyCostTotal(
  cost: WaterSupplyCost,
  rates: Pick<TankerRates, 'rate_small_5000l' | 'rate_large_10000l' | 'rate_xlarge_25000l' | 'rate_govt_small_5000l' | 'rate_govt_large_10000l'>
): number {
  const tankerTotal =
    cost.small_tanker_count * rates.rate_small_5000l +
    cost.large_tanker_count * rates.rate_large_10000l +
    cost.xlarge_tanker_count * rates.rate_xlarge_25000l +
    cost.govt_small_tanker_count * rates.rate_govt_small_5000l +
    cost.govt_large_tanker_count * rates.rate_govt_large_10000l
  const majeeraTotal = cost.majeera_amount + (cost.majeera_extra_enabled ? cost.majeera_extra_amount ?? 0 : 0)
  return tankerTotal + majeeraTotal
}

const MAJEERA_LITERS_PER_CONNECTION_PER_DAY = 500

/**
 * Litres this month's tankers + Majeera are assumed to have supplied —
 * tankers by their fixed capacity × count, Majeera by the government norm
 * (500L/day per connection × days in the month). Used only to *suggest* a
 * base water rate below; never billed against directly.
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
 * What this month's tanker/Majeera spend works out to per 1,000L supplied —
 * a starting point for SlabConfig.base_rate_per_1000l, not a value that's
 * ever saved or applied automatically. The Admin sees it as a suggestion on
 * the Slab settings page and can copy it in, ignore it, or edit either way;
 * this function has no opinion on what actually gets billed. Returns null
 * when there's nothing to divide by (no tankers, no Majeera connections
 * recorded) rather than a misleading 0 or Infinity.
 */
export function suggestedBaseRatePer1000L(
  cost: WaterSupplyCost,
  rates: Pick<TankerRates, 'rate_small_5000l' | 'rate_large_10000l' | 'rate_xlarge_25000l' | 'rate_govt_small_5000l' | 'rate_govt_large_10000l'>,
  daysInMonth: number
): number | null {
  const liters = tankerAndMajeeraLiters(cost, daysInMonth)
  if (liters <= 0) return null
  return (waterSupplyCostTotal(cost, rates) / liters) * 1000
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

/** Walks each slab tier in order, billing only the portion of consumption that falls in it. */
export function waterCharge(consumptionLiters: number, slab: Pick<SlabConfig, 'base_rate_per_1000l' | 'slabs'>): number {
  let remaining = Math.max(0, consumptionLiters)
  let total = 0
  for (const tier of slab.slabs) {
    if (remaining <= 0) break
    const tierSpan = tier.to_liters === null ? Infinity : tier.to_liters - tier.from_liters
    const litersInTier = Math.min(remaining, tierSpan)
    if (litersInTier <= 0) continue
    total += (litersInTier / 1000) * slab.base_rate_per_1000l * tier.rate_multiplier
    remaining -= litersInTier
  }
  return total
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
