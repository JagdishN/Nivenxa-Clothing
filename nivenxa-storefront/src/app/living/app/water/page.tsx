import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireMembership } from '@/lib/living/auth'
import { daysInMonth, formatCurrency, formatMonthLabel, monthKeyFor } from '@/lib/living/format'
import { splitMaintenance, suggestedBaseRatePer1000L, waterSupplyCostTotal } from '@/lib/living/billing'
import { getBillableFlats, getEffectiveTankerRates, getFlats, getReadingHistory, getWaterReading, getWaterSupplyCost } from '@/lib/living/queries'
import type { WaterReading } from '@/lib/living/types'
import theme from '../../LivingTheme.module.scss'
import homeStyles from '../Home.module.scss'
import ReadingsTable from './ReadingsTable'
import UploadReadingsForm from './UploadReadingsForm'

async function ensureReadingsAction() {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin'])
  const month = monthKeyFor(new Date())
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
  redirect('/living/app/water')
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
  redirect('/living/app/water?notice=' + encodeURIComponent('Saved.'))
}

async function saveWaterSupplyCostAction(formData: FormData) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin'])
  const month = monthKeyFor(new Date())
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
  if (error) redirect('/living/app/water?error=' + encodeURIComponent(error.message))
  redirect('/living/app/water?notice=' + encodeURIComponent('Water supply costs saved.'))
}

export default async function LivingWaterPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const { notice, error } = await searchParams
  const { supabase, apartment } = await requireMembership(['admin'])
  const month = monthKeyFor(new Date())
  const [flats, supplyCost, tankerRates] = await Promise.all([
    getFlats(supabase, apartment.id),
    getWaterSupplyCost(supabase, apartment.id, month),
    getEffectiveTankerRates(supabase, apartment.id, month),
  ])
  // Every real meter (including a shared/common one and a merged second
  // meter) still needs its own reading tracked, so `flats` above stays
  // unfiltered for the readings table — only the split preview below should
  // exclude common/merged flats, same reasoning as computeBillForFlat.
  const billableFlats = getBillableFlats(flats)
  const readings = new Map<string, WaterReading>()
  for (const flat of flats) {
    const r = await getWaterReading(supabase, flat.id, month)
    if (r) readings.set(flat.id, r)
  }

  const missing = flats.filter((f) => !readings.has(f.id))

  return (
    <>
      <h1 className={theme.heading} style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>
        Water readings — {formatMonthLabel(month)}
      </h1>
      {notice && <div className={theme.alertInfo}>{notice}</div>}
      {error && <div className={theme.alert}>{error}</div>}

      {flats.length > 0 && (
        <UploadReadingsForm
          flats={flats.map((flat) => ({ id: flat.id, flatNo: flat.flat_no, previous: readings.get(flat.id)?.previous_reading ?? null }))}
          apply={applyExtractedReadingsAction}
        />
      )}

      {flats.length === 0 ? (
        <div className={theme.card}>
          <p className={theme.muted}>Add flats in Setup first.</p>
        </div>
      ) : missing.length > 0 ? (
        <div className={theme.card}>
          <p className={theme.muted} style={{ marginBottom: '1rem' }}>
            {readings.size === 0
              ? "This month's readings haven't started yet — previous readings will be carried forward automatically."
              : `${missing.length} flat(s) still need this month's row started.`}
          </p>
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

      {flats.length > 0 && (
        <div className={homeStyles.section}>
          <h2 className={homeStyles.sectionTitle}>Water supply costs this month</h2>
          {!tankerRates && (
            <p className={theme.muted} style={{ marginBottom: '0.75rem' }}>
              No tanker rates configured yet — <Link href="/living/app/settings/tankers">set them up</Link> first, or leave tanker
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
                  Government norm: 500L/day supplied per connection — used only to suggest a base water rate on the Slab settings
                  page, never billed on its own.
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
                {billableFlats.length > 0 && (
                  <p className={theme.muted} style={{ marginTop: '0.5rem' }}>
                    {apartment.flat_split === 'equal' ? 'Equal split' : 'Weighted split'} across{' '}
                    {apartment.flat_split === 'equal' ? (apartment.shared_cost_divisor ?? billableFlats.length) : billableFlats.length} flats
                    {apartment.flat_split === 'equal' && apartment.shared_cost_divisor ? ' (divisor override)' : ''} — e.g. flat{' '}
                    {billableFlats[0].flat_no}:{' '}
                    {formatCurrency(
                      splitMaintenance(waterSupplyCostTotal(supplyCost, tankerRates), billableFlats, apartment.flat_split, apartment.shared_cost_divisor).get(
                        billableFlats[0].id
                      ) ?? 0
                    )}{' '}
                    added on top of that flat&rsquo;s own metered charge.
                  </p>
                )}
                {(() => {
                  const suggested = suggestedBaseRatePer1000L(supplyCost, tankerRates, daysInMonth(month))
                  return suggested !== null ? (
                    <p className={theme.muted} style={{ marginTop: '0.5rem' }}>
                      Works out to {formatCurrency(suggested)} per 1,000L supplied this month — a starting point for the base water
                      rate on{' '}
                      <Link href="/living/app/settings/slabs">Slab settings</Link>, not applied automatically.
                    </p>
                  ) : null
                })()}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
