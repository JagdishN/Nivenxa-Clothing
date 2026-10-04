import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireMembership } from '@/lib/living/auth'
import { setLivingError, setLivingNotice } from '@/lib/living/flash'
import { daysInMonth, formatCurrency, formatMonthLabel, monthKeyFor } from '@/lib/living/format'
import { tankerAndMajeeraLiters, waterSupplyCostTotal } from '@/lib/living/billing'
import {
  getCombinedWaterRate,
  getCommonWaterCharge,
  getEffectiveSlabConfig,
  getEffectiveTankerRates,
  getFlats,
  getIncomingGap,
  getReadingHistory,
  getReadingMonths,
  getTotalConsumptionForMonth,
  getWaterReading,
  getWaterSupplyCost,
  isCalendarMonthFinancialStatementLocked,
  setWaterChargeAdjustment,
} from '@/lib/living/queries'

const FINALIZED_MESSAGE = "This billing period's Financial Statement has been published — it's permanently locked. Start a new billing cycle for any further changes."
import type { WaterReading } from '@/lib/living/types'
import theme from '../../LivingTheme.module.scss'
import homeStyles from '../Home.module.scss'
import Tabs from '../Tabs'
import ReadingsTable from './ReadingsTable'
import UploadReadingsForm from './UploadReadingsForm'

async function ensureReadingsAction() {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin'])
  const month = monthKeyFor(new Date())
  if (await isCalendarMonthFinancialStatementLocked(supabase, apartment.id, month)) {
    await setLivingError(FINALIZED_MESSAGE)
    redirect('/living/water')
  }
  const flats = await getFlats(supabase, apartment.id)

  for (const flat of flats) {
    const existing = await getWaterReading(supabase, flat.id, month)
    if (existing) continue

    const history = await getReadingHistory(supabase, flat.id, 1)
    const previous = history[0]?.current_reading ?? null

    await supabase.from('living_water_readings').insert({
      apartment_id: apartment.id,
      flat_id: flat.id,
      month,
      previous_reading: previous,
    })
  }
  redirect('/living/water')
}

/**
 * Called directly from UploadReadingsForm (not a <form action>) once the
 * Admin has reviewed/corrected the extracted rows. Returns a result instead
 * of calling redirect() — redirect() throws internally to signal navigation,
 * and a plain-function server-action call awaited inside the caller's own
 * try/catch (as UploadReadingsForm's confirm() does) intercepts that throw
 * before Next's own handling ever sees it, so a successful save came back
 * looking like a failure. The client navigates itself once this resolves.
 */
async function applyExtractedReadingsAction(entries: { flatId: string; current: number }[]): Promise<{ error?: string }> {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin'])
  const month = monthKeyFor(new Date())
  if (await isCalendarMonthFinancialStatementLocked(supabase, apartment.id, month)) {
    return { error: FINALIZED_MESSAGE }
  }

  for (const entry of entries) {
    const existing = await getWaterReading(supabase, entry.flatId, month)
    if (existing) {
      const { error } = await supabase
        .from('living_water_readings')
        .update({ current_reading: entry.current, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
      if (error) return { error: error.message }
    } else {
      const history = await getReadingHistory(supabase, entry.flatId, 1)
      const previous = history[0]?.current_reading ?? null
      const { error } = await supabase.from('living_water_readings').insert({
        apartment_id: apartment.id,
        flat_id: entry.flatId,
        month,
        previous_reading: previous,
        current_reading: entry.current,
      })
      if (error) return { error: error.message }
    }
  }
  return {}
}

async function saveReadingsAction(formData: FormData) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin'])
  const month = monthKeyFor(new Date())
  if (await isCalendarMonthFinancialStatementLocked(supabase, apartment.id, month)) {
    await setLivingError(FINALIZED_MESSAGE)
    redirect('/living/water')
  }
  const flats = await getFlats(supabase, apartment.id)
  const today = new Date().toISOString().slice(0, 10)

  for (const flat of flats) {
    const reading = await getWaterReading(supabase, flat.id, month)
    if (!reading) continue

    const previousRaw = formData.get(`previous_${flat.id}`)
    const previous = previousRaw === null || previousRaw === '' ? null : Number(previousRaw)
    const currentRaw = formData.get(`current_${flat.id}`)
    const current = currentRaw === null || currentRaw === '' ? null : Number(currentRaw)
    const flagged = formData.get(`flagged_${flat.id}`) === 'on'
    const flaggedNote = String(formData.get(`flagged_note_${flat.id}`) ?? '').trim() || null

    await supabase
      .from('living_water_readings')
      .update({
        previous_reading: previous,
        current_reading: current,
        flagged,
        flagged_note: flagged ? flaggedNote : null,
        flagged_since: flagged ? (reading.flagged ? reading.flagged_since : today) : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reading.id)
  }
  await setLivingNotice('Saved.')
  redirect('/living/water')
}

async function saveWaterSupplyCostAction(formData: FormData) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin'])
  const month = monthKeyFor(new Date())
  if (await isCalendarMonthFinancialStatementLocked(supabase, apartment.id, month)) {
    await setLivingError(FINALIZED_MESSAGE)
    redirect('/living/water')
  }
  const majeeraExtraEnabled = formData.get('majeera_extra_enabled') === 'on'

  const { error } = await supabase.from('living_water_supply_costs').upsert(
    {
      apartment_id: apartment.id,
      month,
      small_tanker_count: Number(formData.get('small_tanker_count') ?? 0) || 0,
      large_tanker_count: Number(formData.get('large_tanker_count') ?? 0) || 0,
      xlarge_tanker_count: Number(formData.get('xlarge_tanker_count') ?? 0) || 0,
      govt_small_tanker_count: Number(formData.get('govt_small_tanker_count') ?? 0) || 0,
      govt_large_tanker_count: Number(formData.get('govt_large_tanker_count') ?? 0) || 0,
      majeera_connection_count: Number(formData.get('majeera_connection_count') ?? 0) || 0,
      majeera_amount: Number(formData.get('majeera_amount') ?? 0) || 0,
      majeera_extra_enabled: majeeraExtraEnabled,
      majeera_extra_amount: majeeraExtraEnabled ? Number(formData.get('majeera_extra_amount') ?? 0) || 0 : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'apartment_id,month' }
  )
  if (error) {
    await setLivingError(error.message)
    redirect('/living/water')
  }
  await setLivingNotice('Water supply costs saved.')
  redirect('/living/water')
}

async function adjustWaterChargeAction(formData: FormData) {
  'use server'
  const { supabase, apartment, userId } = await requireMembership(['admin'])
  const flatId = String(formData.get('flat_id'))
  const month = String(formData.get('adjustment_month'))
  const amount = Number(formData.get('adjustment_amount') ?? 0)
  const reason = String(formData.get('adjustment_reason') ?? '').trim()

  if (!reason) {
    await setLivingError('Add a reason for the adjustment.')
    redirect('/living/water')
  }
  if (await isCalendarMonthFinancialStatementLocked(supabase, apartment.id, month)) {
    await setLivingError(FINALIZED_MESSAGE)
    redirect('/living/water')
  }

  try {
    await setWaterChargeAdjustment(supabase, apartment.id, flatId, month, amount, reason, userId)
  } catch (err) {
    await setLivingError(err instanceof Error ? err.message : 'Could not save the adjustment.')
    redirect('/living/water')
  }
  await setLivingNotice('Adjustment saved.')
  redirect('/living/water')
}

export default async function LivingWaterPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { supabase, apartment } = await requireMembership(['admin'])
  const month = monthKeyFor(new Date())
  const resolvedSearchParams = await searchParams
  // Which month the Readings tab is showing — defaults to the current month,
  // but an Admin can browse any past month that has at least one reading on
  // file (there was previously no way to see a past month's readings at all
  // outside the database directly). Supply Costs/Adjustments stay tied to
  // the current month regardless — only the Readings tab's own view changes.
  const viewMonth = resolvedSearchParams.month ?? month
  const isViewingCurrentMonth = viewMonth === month

  const [flats, supplyCost, tankerRates, combinedRate, incomingGap, slab, totalConsumption, readingMonths] = await Promise.all([
    getFlats(supabase, apartment.id),
    getWaterSupplyCost(supabase, apartment.id, month),
    getEffectiveTankerRates(supabase, apartment.id, month),
    getCombinedWaterRate(supabase, apartment.id, month),
    getIncomingGap(supabase, apartment.id, month),
    getEffectiveSlabConfig(supabase, apartment.id, month),
    getTotalConsumptionForMonth(supabase, apartment.id, month),
    getReadingMonths(supabase, apartment.id),
  ])
  const purchasedLiters = supplyCost ? tankerAndMajeeraLiters(supplyCost, daysInMonth(month)) : 0
  const reconciliationGap = purchasedLiters - totalConsumption
  const readings = new Map<string, WaterReading>()
  for (const flat of flats) {
    const r = await getWaterReading(supabase, flat.id, viewMonth)
    if (r) readings.set(flat.id, r)
  }

  const missing = flats.filter((f) => !readings.has(f.id))
  const notStartedYet = isViewingCurrentMonth && readings.size === 0 && missing.length > 0

  // Every month that has at least one reading, plus the current month even
  // if nothing's been entered for it yet — so the picker always has
  // somewhere sensible to land.
  const monthOptions = [...new Set([month, ...readingMonths])].sort((a, b) => b.localeCompare(a))

  // The shared/common meter's own water cost — tracked here only, never split
  // across residents' maintenance bills (that used to be a "Common Water
  // Bill" line item on Maintenance; deliberately removed from there, then
  // restored per a later decision — see getCommonWaterChargeForPeriod).
  const commonFlat = flats.find((f) => f.excluded_from_billing)
  const commonWaterCharge = commonFlat ? await getCommonWaterCharge(supabase, apartment, viewMonth) : null
  const commonReading = commonFlat ? readings.get(commonFlat.id) : undefined
  const commonConsumption =
    commonReading?.current_reading != null && commonReading?.previous_reading != null
      ? commonReading.current_reading - commonReading.previous_reading
      : null

  // Nothing's been entered for the new month yet — show last month's closing
  // readings as a visible reference instead of leaving the admin looking at a
  // bare "not started" message with no way to see the data that's about to
  // carry forward. ensureReadingsAction below already carries this forward
  // automatically (previous_reading = last recorded current_reading); this is
  // just making that visible before the admin commits to starting the month.
  const lastReadings = notStartedYet
    ? await Promise.all(
        flats.map(async (flat) => {
          const history = await getReadingHistory(supabase, flat.id, 1)
          const last = history[0]
          return { flatId: flat.id, flatNo: flat.flat_no, lastReadingMonth: last?.month ?? null, lastCurrentReading: last?.current_reading ?? null }
        })
      )
    : []

  return (
    <>
      <h1 className={theme.heading} style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>
        Water readings — {formatMonthLabel(viewMonth)}
      </h1>

      <form method="get" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <label className={theme.label} htmlFor="month" style={{ margin: 0 }}>
          Viewing month
        </label>
        <select id="month" name="month" className={theme.select} defaultValue={viewMonth}>
          {monthOptions.map((m) => (
            <option key={m} value={m}>
              {formatMonthLabel(m)}
              {m === month ? ' (current)' : ''}
            </option>
          ))}
        </select>
        <button type="submit" className={theme.buttonGhost}>
          View
        </button>
      </form>

      {!isViewingCurrentMonth && (
        <div className={theme.alertInfo} style={{ marginBottom: '1.5rem' }}>
          Viewing a past month — read-only. <Link href={`/living/water?month=${month}`}>Back to the current month</Link> to make edits.
        </div>
      )}

      {flats.length === 0 ? (
        <div className={theme.card}>
          <p className={theme.muted}>Add flats in Setup first.</p>
        </div>
      ) : (
        <Tabs
          tabs={[
            {
              id: 'readings',
              label: 'Readings',
              content: (
                <>
                  {commonFlat && (
                    <div className={theme.card} style={{ marginBottom: '1.25rem' }}>
                      <p className={theme.label} style={{ marginBottom: '0.5rem' }}>
                        Common area water charge — {formatMonthLabel(viewMonth)}
                      </p>
                      {commonWaterCharge !== null && commonConsumption !== null ? (
                        <p className={theme.muted}>
                          <strong className={theme.num}>{formatCurrency(commonWaterCharge)}</strong> for{' '}
                          {commonConsumption.toLocaleString('en-IN')}L, from flat {commonFlat.flat_no}&rsquo;s reading below. Tracked here
                          only — not split across residents&rsquo; maintenance bills.
                        </p>
                      ) : (
                        <p className={theme.muted}>No reading entered yet for the shared meter (flat {commonFlat.flat_no}) this month.</p>
                      )}
                    </div>
                  )}

                  {isViewingCurrentMonth && (
                    <UploadReadingsForm
                      flats={flats.map((flat) => ({ id: flat.id, flatNo: flat.flat_no, previous: readings.get(flat.id)?.previous_reading ?? null }))}
                      apply={applyExtractedReadingsAction}
                    />
                  )}

                  {!isViewingCurrentMonth ? (
                    <div className={theme.tableScroll}>
                      <table className={theme.table}>
                        <thead>
                          <tr>
                            <th>Flat</th>
                            <th className={theme.num}>Previous</th>
                            <th className={theme.num}>Current</th>
                            <th className={theme.num}>Consumption</th>
                          </tr>
                        </thead>
                        <tbody>
                          {flats.map((flat) => {
                            const reading = readings.get(flat.id)
                            const consumption =
                              reading?.current_reading != null && reading?.previous_reading != null
                                ? reading.current_reading - reading.previous_reading
                                : null
                            return (
                              <tr key={flat.id}>
                                <td>{flat.flat_no}</td>
                                <td className={theme.num}>{reading?.previous_reading?.toLocaleString('en-IN') ?? '—'}</td>
                                <td className={theme.num}>{reading?.current_reading?.toLocaleString('en-IN') ?? '—'}</td>
                                <td className={theme.num}>{consumption !== null ? consumption.toLocaleString('en-IN') : '—'}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : missing.length > 0 ? (
                    <div className={theme.card}>
                      <p className={theme.muted} style={{ marginBottom: '1rem' }}>
                        {notStartedYet
                          ? "This month's readings haven't started yet. Last month's closing readings (below) will carry forward automatically as this month's previous reading once you start it."
                          : `${missing.length} flat(s) still need this month's row started.`}
                      </p>
                      {notStartedYet && (
                        <div className={theme.tableScroll} style={{ marginBottom: '1rem' }}>
                          <table className={theme.table}>
                            <thead>
                              <tr>
                                <th>Flat</th>
                                <th>Last reading month</th>
                                <th className={theme.num}>Closing meter value</th>
                              </tr>
                            </thead>
                            <tbody>
                              {lastReadings.map((r) => (
                                <tr key={r.flatId}>
                                  <td>{r.flatNo}</td>
                                  <td>{r.lastReadingMonth ? formatMonthLabel(r.lastReadingMonth) : '—'}</td>
                                  <td className={theme.num}>
                                    {r.lastCurrentReading !== null ? r.lastCurrentReading.toLocaleString('en-IN') : 'No reading on record'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      <form action={ensureReadingsAction}>
                        <button type="submit" className={theme.button}>
                          Start this month&rsquo;s readings
                        </button>
                      </form>
                    </div>
                  ) : (
                    <ReadingsTable
                      rows={flats.map((flat) => {
                        const reading = readings.get(flat.id)!
                        return {
                          flatId: flat.id,
                          flatNo: flat.flat_no,
                          previous: reading.previous_reading,
                          current: reading.current_reading,
                          flagged: reading.flagged,
                          flaggedNote: reading.flagged_note,
                        }
                      })}
                      save={saveReadingsAction}
                    />
                  )}
                </>
              ),
            },
            {
              id: 'supply',
              label: 'Supply Costs',
              content: (
                <>
                  {!tankerRates && (
                    <p className={theme.muted} style={{ marginBottom: '0.75rem' }}>
                      No tanker rates configured yet — <Link href="/living/settings/tankers">set them up</Link> first, or leave tanker
                      counts at 0 and just enter Majeera&rsquo;s amount below.
                    </p>
                  )}
                  <div className={theme.card}>
                    <form action={saveWaterSupplyCostAction}>
              <p className={theme.label} style={{ marginBottom: '0.5rem' }}>
                Private tankers
              </p>
              <div className={theme.field}>
                <label className={theme.label} htmlFor="small_tanker_count">
                  Small (5,000L) — count
                </label>
                <input
                  id="small_tanker_count"
                  name="small_tanker_count"
                  type="number"
                  className={theme.input}
                  defaultValue={supplyCost?.small_tanker_count ?? 0}
                />
              </div>
              <div className={theme.field}>
                <label className={theme.label} htmlFor="large_tanker_count">
                  Large (10,000L) — count
                </label>
                <input
                  id="large_tanker_count"
                  name="large_tanker_count"
                  type="number"
                  className={theme.input}
                  defaultValue={supplyCost?.large_tanker_count ?? 0}
                />
              </div>
              <div className={theme.field}>
                <label className={theme.label} htmlFor="xlarge_tanker_count">
                  Extra-large (25,000L) — count
                </label>
                <input
                  id="xlarge_tanker_count"
                  name="xlarge_tanker_count"
                  type="number"
                  className={theme.input}
                  defaultValue={supplyCost?.xlarge_tanker_count ?? 0}
                />
              </div>

              <p className={theme.label} style={{ marginTop: '1.25rem', marginBottom: '0.5rem' }}>
                Government tankers
              </p>
              <div className={theme.field}>
                <label className={theme.label} htmlFor="govt_small_tanker_count">
                  Small (5,000L) — count
                </label>
                <input
                  id="govt_small_tanker_count"
                  name="govt_small_tanker_count"
                  type="number"
                  className={theme.input}
                  defaultValue={supplyCost?.govt_small_tanker_count ?? 0}
                />
              </div>
              <div className={theme.field}>
                <label className={theme.label} htmlFor="govt_large_tanker_count">
                  Large (10,000L) — count
                </label>
                <input
                  id="govt_large_tanker_count"
                  name="govt_large_tanker_count"
                  type="number"
                  className={theme.input}
                  defaultValue={supplyCost?.govt_large_tanker_count ?? 0}
                />
              </div>

              <p className={theme.label} style={{ marginTop: '1.25rem', marginBottom: '0.5rem' }}>
                Majeera
              </p>
              <div className={theme.field}>
                <label className={theme.label} htmlFor="majeera_connection_count">
                  Number of Majeera connections
                </label>
                <input
                  id="majeera_connection_count"
                  name="majeera_connection_count"
                  type="number"
                  className={theme.input}
                  defaultValue={supplyCost?.majeera_connection_count ?? 0}
                />
                <p className={theme.muted} style={{ marginTop: '0.3rem' }}>
                  Government norm: 500L/day supplied per connection — feeds this month&rsquo;s combined water rate below directly.
                </p>
              </div>
              <div className={theme.field}>
                <label className={theme.label} htmlFor="majeera_amount">
                  Majeera amount
                </label>
                <input
                  id="majeera_amount"
                  name="majeera_amount"
                  type="number"
                  step="0.01"
                  className={theme.input}
                  defaultValue={supplyCost?.majeera_amount ?? 0}
                />
              </div>
              <div className={theme.field}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    name="majeera_extra_enabled"
                    defaultChecked={supplyCost?.majeera_extra_enabled ?? true}
                  />
                  <span className={theme.label} style={{ margin: 0 }}>
                    Additional amount to the person
                  </span>
                </label>
                <input
                  name="majeera_extra_amount"
                  type="number"
                  step="0.01"
                  className={theme.input}
                  style={{ marginTop: '0.5rem' }}
                  defaultValue={supplyCost?.majeera_extra_amount ?? ''}
                  placeholder="Extra amount"
                />
              </div>

                      <button type="submit" className={theme.button}>
                        Save
                      </button>
                    </form>

                    {supplyCost && tankerRates && (
                      <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--living-rule)', paddingTop: '1rem' }}>
                        <div className={homeStyles.billLine}>
                          <span>Total water supply cost</span>
                          <span className={theme.num}>{formatCurrency(waterSupplyCostTotal(supplyCost, tankerRates))}</span>
                        </div>
                        {incomingGap !== 0 && (
                          <div className={homeStyles.billLine}>
                            <span>{incomingGap > 0 ? 'Carried over (under-recovered last month)' : 'Carried over (over-recovered last month)'}</span>
                            <span className={theme.num}>{formatCurrency(incomingGap)}</span>
                          </div>
                        )}
                        <div className={homeStyles.billTotal}>
                          <span>Combined rate this month</span>
                          <span className={theme.num}>{formatCurrency(combinedRate)} / 1,000L</span>
                        </div>
                        <p className={theme.muted} style={{ marginTop: '0.5rem' }}>
                          Every flat&rsquo;s own metered consumption is billed at this rate{slab?.water_billing_method === 'slab' ? ', multiplied per the tier it falls in' : ''} —
                          no separate equal-split water charge anymore. Any ₹ gap between what&rsquo;s billed and what&rsquo;s actually
                          spent this month carries into next month&rsquo;s rate automatically.
                        </p>

                        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--living-rule)', paddingTop: '1rem' }}>
                          <div className={homeStyles.billLine}>
                            <span>Total litres purchased this month</span>
                            <span className={theme.num}>{purchasedLiters.toLocaleString('en-IN')}L</span>
                          </div>
                          <div className={homeStyles.billLine}>
                            <span>Total litres recorded consumed by flats</span>
                            <span className={theme.num}>{totalConsumption.toLocaleString('en-IN')}L</span>
                          </div>
                          <div className={homeStyles.billLine}>
                            <span>Difference</span>
                            <span className={theme.num}>{reconciliationGap.toLocaleString('en-IN')}L</span>
                          </div>
                          <p className={theme.muted} style={{ marginTop: '0.5rem' }}>
                            Not silently distributed — a gap here can come from common-area/cleaning/gardening/security usage, a
                            free source (borewell/municipal) blended into meters, meter differences, tank overflow, leakage, or
                            unrecorded consumption. Worth a look if it&rsquo;s large or growing.
                          </p>
                        </div>

                        {slab?.water_billing_method === 'slab' && slab.slabs.length > 0 && (
                          <div style={{ marginTop: '1rem', borderTop: '1px solid var(--living-rule)', paddingTop: '1rem' }}>
                            <p className={theme.label} style={{ marginBottom: '0.5rem' }}>
                              Effective tier rates this month ({slab.slab_calculation_method === 'whole_consumption' ? 'Whole-consumption' : 'Progressive'})
                            </p>
                            <div className={theme.tableScroll}>
                              <table className={theme.table}>
                                <thead>
                                  <tr>
                                    <th>From</th>
                                    <th>To</th>
                                    <th className={theme.num}>Multiplier</th>
                                    <th className={theme.num}>Rate</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {slab.slabs.map((tier, i) => (
                                    <tr key={i}>
                                      <td>{tier.from_liters.toLocaleString('en-IN')}L</td>
                                      <td>{tier.to_liters === null ? 'Unbounded' : `${tier.to_liters.toLocaleString('en-IN')}L`}</td>
                                      <td className={theme.num}>{tier.rate_multiplier}×</td>
                                      <td className={theme.num}>{formatCurrency(combinedRate * tier.rate_multiplier)}/1,000L</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className={theme.card} style={{ marginTop: '1.25rem' }}>
                    <p className={theme.label} style={{ marginBottom: '0.5rem' }}>
                      Adjust a flat&rsquo;s water charge
                    </p>
                    <p className={theme.muted} style={{ marginBottom: '0.75rem' }}>
                      A manual correction on top of the computed charge, with a reason kept on record. Applying it to the current
                      month locks that month&rsquo;s water charge going forward, so it won&rsquo;t drift if tanker counts or
                      readings change later.
                    </p>
                    <form action={adjustWaterChargeAction}>
                      <div className={homeStyles.grid}>
                        <div className={theme.field}>
                          <label className={theme.label} htmlFor="flat_id">
                            Flat
                          </label>
                          <select id="flat_id" name="flat_id" className={theme.select} required>
                            {flats.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.flat_no}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className={theme.field}>
                          <label className={theme.label} htmlFor="adjustment_month">
                            Month
                          </label>
                          <input id="adjustment_month" name="adjustment_month" type="date" className={theme.input} defaultValue={month} required />
                        </div>
                        <div className={theme.field}>
                          <label className={theme.label} htmlFor="adjustment_amount">
                            Adjustment amount (± ₹)
                          </label>
                          <input id="adjustment_amount" name="adjustment_amount" type="number" step="0.01" className={theme.input} required />
                        </div>
                      </div>
                      <div className={theme.field}>
                        <label className={theme.label} htmlFor="adjustment_reason">
                          Reason
                        </label>
                        <input id="adjustment_reason" name="adjustment_reason" className={theme.input} required />
                      </div>
                      <button type="submit" className={theme.button}>
                        Save adjustment
                      </button>
                    </form>
                  </div>
                </>
              ),
            },
          ]}
        />
      )}
    </>
  )
}
