import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireMembership } from '@/lib/living/auth'
import { formatCurrency, formatPeriodLabel, monthKeyFor } from '@/lib/living/format'
import { maintenanceGrandTotal, splitMaintenance } from '@/lib/living/billing'
import { getBillableFlats, getCommonWaterCharge, getCurrentMaintenancePeriod, getFlatLedger, getFlats, getPreviousDueSuggestion } from '@/lib/living/queries'
import type { MaintenanceLineItem } from '@/lib/living/types'
import theme from '../../LivingTheme.module.scss'
import homeStyles from '../Home.module.scss'
import EditPeriodForm from './EditPeriodForm'

// "Common Water Bill" (the municipal utility bill) and "Majeera water
// pipeline repairing" (a repair line item) are real maintenance expenses,
// distinct from the tanker/Majeera-supply cost that now lives on the Water
// page — kept here.
const TEMPLATE_DESCRIPTIONS = [
  'Watchman Salary',
  'Electricity Bill',
  'Diesel',
  'Lift Maintenance',
  'Cleaning',
  'Garbage',
  'Common Water Bill',
  'Generator Maintenance',
  'Common Electrical',
  'Majeera water pipeline repairing',
  'Bore Motor',
  'General Motor',
  'Miscellaneous',
  'Dusser Mamulu',
  'Corpus Fund Recovery',
]

const COMMON_WATER_BILL_DESCRIPTION = 'Common Water Bill'

/**
 * Overwrites the "Common Water Bill" line item's amount with the shared
 * meter's live computed charge, if there's a flat marked as one — called
 * from every write action so it's always the fresh, computed number rather
 * than whatever the last manual edit left behind (the UI also disables that
 * one input, but this is the actual enforcement).
 */
function syncCommonWaterAmount(lineItems: MaintenanceLineItem[], commonWaterCharge: number | null): MaintenanceLineItem[] {
  if (commonWaterCharge === null) return lineItems
  return lineItems.map((item) =>
    item.description.trim().toLowerCase() === COMMON_WATER_BILL_DESCRIPTION.toLowerCase() ? { ...item, amount: commonWaterCharge } : item
  )
}

/**
 * Starts a brand-new billing period with an Admin-chosen date range — not
 * required to be a calendar month, or to pick up right after the previous
 * period ended. Becomes "the current period" immediately (getCurrentMaintenancePeriod
 * is just "most recently started"); the old one stays in the database, just
 * no longer the one shown/edited by default.
 *
 * Also seeds each billable flat's new previous_due from what was left unpaid
 * on the period being superseded (getPreviousDueSuggestion) — a one-time
 * carry-forward, not a live sync; the Admin can edit it afterward like any
 * other ledger field.
 */
async function startPeriodAction(formData: FormData) {
  'use server'
  const { supabase, apartment, userId } = await requireMembership(['admin', 'treasurer'])
  const periodStart = String(formData.get('period_start') ?? '').trim()
  const periodEnd = String(formData.get('period_end') ?? '').trim()
  if (!periodStart || !periodEnd) redirect('/living/app/maintenance?error=' + encodeURIComponent('Pick both a start and end date.'))
  if (periodEnd < periodStart) redirect('/living/app/maintenance?error=' + encodeURIComponent('End date must be on or after the start date.'))

  const priorPeriod = await getCurrentMaintenancePeriod(supabase, apartment.id)

  const { data: inserted, error } = await supabase
    .from('living_maintenance_months')
    .insert({
      apartment_id: apartment.id,
      month: periodStart,
      period_end: periodEnd,
      line_items: TEMPLATE_DESCRIPTIONS.map((description) => ({ description, amount: 0, comment: '', category: '' })),
      created_by: userId,
    })
    .select()
    .single()
  if (error || !inserted) redirect('/living/app/maintenance?error=' + encodeURIComponent(error?.message ?? 'Could not start the period.'))

  if (priorPeriod) {
    const flats = getBillableFlats(await getFlats(supabase, apartment.id))
    for (const flat of flats) {
      const previousDue = await getPreviousDueSuggestion(supabase, apartment, flat, priorPeriod)
      if (previousDue > 0) {
        await supabase
          .from('living_flat_ledger')
          .upsert(
            { apartment_id: apartment.id, maintenance_month_id: inserted.id, flat_id: flat.id, previous_due: previousDue },
            { onConflict: 'maintenance_month_id,flat_id' }
          )
      }
    }
  }
  redirect('/living/app/maintenance')
}

/**
 * Edits the CURRENT period's own dates in place (no new row) — the client
 * form (EditPeriodForm) gates this behind a window.confirm() first, since
 * changing dates on a period that may already be published/shared is worth
 * a deliberate second look, not a plain click.
 */
async function updatePeriodDatesAction(formData: FormData) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const current = await getCurrentMaintenancePeriod(supabase, apartment.id)
  if (!current) redirect('/living/app/maintenance')

  const periodStart = String(formData.get('period_start') ?? '').trim()
  const periodEnd = String(formData.get('period_end') ?? '').trim()
  if (!periodStart || !periodEnd) redirect('/living/app/maintenance?error=' + encodeURIComponent('Pick both a start and end date.'))
  if (periodEnd < periodStart) redirect('/living/app/maintenance?error=' + encodeURIComponent('End date must be on or after the start date.'))

  const { error } = await supabase
    .from('living_maintenance_months')
    .update({ month: periodStart, period_end: periodEnd })
    .eq('id', current.id)
  if (error) redirect('/living/app/maintenance?error=' + encodeURIComponent(error.message))
  redirect('/living/app/maintenance?notice=' + encodeURIComponent('Billing cycle updated.'))
}

async function saveAction(formData: FormData) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const current = await getCurrentMaintenancePeriod(supabase, apartment.id)
  if (!current) redirect('/living/app/maintenance')

  let lineItems: MaintenanceLineItem[] = current.line_items.map((item, i) => ({
    description: item.description,
    amount: Number(formData.get(`item_amount_${i}`) ?? 0) || 0,
    comment: String(formData.get(`item_comment_${i}`) ?? ''),
    // Category has no input on this screen (hidden — no reporting view reads
    // it yet) — carry whatever was already there forward unchanged instead
    // of reading a form field that no longer exists.
    category: item.category ?? '',
  }))
  lineItems = syncCommonWaterAmount(lineItems, await getCommonWaterCharge(supabase, apartment, monthKeyFor(new Date())))

  const { error } = await supabase.from('living_maintenance_months').update({ line_items: lineItems }).eq('id', current.id)
  if (error) redirect('/living/app/maintenance?error=' + encodeURIComponent(error.message))
  redirect('/living/app/maintenance?notice=' + encodeURIComponent('Saved.'))
}

async function addItemAction(formData: FormData) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const current = await getCurrentMaintenancePeriod(supabase, apartment.id)
  if (!current) redirect('/living/app/maintenance')

  const description = String(formData.get('description') ?? '').trim()
  if (!description) redirect('/living/app/maintenance?error=' + encodeURIComponent('Give the item a description.'))

  let lineItems = [...current.line_items, { description, amount: Number(formData.get('amount') ?? 0) || 0, comment: '', category: '' }]
  lineItems = syncCommonWaterAmount(lineItems, await getCommonWaterCharge(supabase, apartment, monthKeyFor(new Date())))
  const { error } = await supabase.from('living_maintenance_months').update({ line_items: lineItems }).eq('id', current.id)
  if (error) redirect('/living/app/maintenance?error=' + encodeURIComponent(error.message))
  redirect('/living/app/maintenance')
}

async function removeItemAction(formData: FormData) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const current = await getCurrentMaintenancePeriod(supabase, apartment.id)
  if (!current) redirect('/living/app/maintenance')

  const index = Number(formData.get('index'))
  let lineItems = current.line_items.filter((_, i) => i !== index)
  lineItems = syncCommonWaterAmount(lineItems, await getCommonWaterCharge(supabase, apartment, monthKeyFor(new Date())))
  const { error } = await supabase.from('living_maintenance_months').update({ line_items: lineItems }).eq('id', current.id)
  if (error) redirect('/living/app/maintenance?error=' + encodeURIComponent(error.message))
  redirect('/living/app/maintenance')
}

async function saveLedgerAction(formData: FormData) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const current = await getCurrentMaintenancePeriod(supabase, apartment.id)
  if (!current) redirect('/living/app/maintenance')

  const flats = getBillableFlats(await getFlats(supabase, apartment.id))
  for (const flat of flats) {
    const advancePayment = Number(formData.get(`advance_${flat.id}`) ?? 0) || 0
    const lateFee = Number(formData.get(`late_fee_${flat.id}`) ?? 0) || 0
    const previousDue = Number(formData.get(`previous_due_${flat.id}`) ?? 0) || 0

    const { error } = await supabase.from('living_flat_ledger').upsert(
      {
        apartment_id: apartment.id,
        maintenance_month_id: current.id,
        flat_id: flat.id,
        advance_payment: advancePayment,
        late_fee: lateFee,
        previous_due: previousDue,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'maintenance_month_id,flat_id' }
    )
    if (error) redirect('/living/app/maintenance?error=' + encodeURIComponent(`Flat ${flat.flat_no}: ${error.message}`))
  }
  redirect('/living/app/maintenance?notice=' + encodeURIComponent('Advance, late fees & due updated.'))
}

async function publishAction() {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const current = await getCurrentMaintenancePeriod(supabase, apartment.id)
  if (!current) redirect('/living/app/maintenance')

  const { error } = await supabase
    .from('living_maintenance_months')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', current.id)
  if (error) redirect('/living/app/maintenance?error=' + encodeURIComponent(error.message))
  redirect('/living/app/maintenance?notice=' + encodeURIComponent('Published — owners can now see their share.'))
}

export default async function LivingMaintenancePage() {
  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const thisMonth = monthKeyFor(new Date())
  const [maintenanceMonth, allFlats, commonWaterCharge] = await Promise.all([
    getCurrentMaintenancePeriod(supabase, apartment.id),
    getFlats(supabase, apartment.id),
    getCommonWaterCharge(supabase, apartment, thisMonth),
  ])
  const flats = getBillableFlats(allFlats)

  const ledgerRows = maintenanceMonth
    ? await Promise.all(
        flats.map(async (flat) => ({
          flat,
          ledger: await getFlatLedger(supabase, maintenanceMonth.id, flat.id),
        }))
      )
    : []

  // Default the "start a new period" form to the day after the current
  // period ends (or today's month, if none exists yet) — a sane one-click
  // default for the common case, freely overridden for a longer span.
  const defaultStart = maintenanceMonth ? addDays(maintenanceMonth.period_end, 1) : `${thisMonth}`
  const defaultEnd = lastDayOfMonth(defaultStart)

  return (
    <>
      <h1 className={theme.heading} style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>
        Maintenance{maintenanceMonth ? ` — ${formatPeriodLabel(maintenanceMonth.month, maintenanceMonth.period_end)}` : ''}
      </h1>
      <p className={theme.muted} style={{ marginBottom: '1.5rem' }}>
        Water and tanker costs live on the <Link href="/living/app/water">Water</Link> page now — they&rsquo;re part of the water bill,
        not common maintenance.
      </p>

      {!maintenanceMonth ? (
        <div className={theme.card} style={{ marginBottom: '1.5rem' }}>
          <p className={theme.muted} style={{ marginBottom: '1rem' }}>
            Nothing entered yet.
          </p>
        </div>
      ) : (
        <>
          {maintenanceMonth.status === 'published' && (
            <div className={theme.alertInfo}>Published — owners can see their share. Still editable; any change here reflects immediately.</div>
          )}

          <form action={saveAction}>
            <div className={theme.card} style={{ marginBottom: '1rem' }}>
              <div className={theme.tableScroll}>
                <table className={theme.table}>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th className={theme.num}>Amount</th>
                      <th>Comment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {maintenanceMonth.line_items.map((item, i) => {
                      const isCommonWater = commonWaterCharge !== null && item.description.trim().toLowerCase() === COMMON_WATER_BILL_DESCRIPTION.toLowerCase()
                      return (
                        <tr key={i}>
                          <td>{item.description}</td>
                          <td>
                            <input
                              name={`item_amount_${i}`}
                              className={theme.input}
                              type="number"
                              step="0.01"
                              value={isCommonWater ? (commonWaterCharge as number) : undefined}
                              defaultValue={isCommonWater ? undefined : item.amount}
                              disabled={isCommonWater}
                            />
                            {isCommonWater && <p className={theme.muted} style={{ marginTop: '0.2rem' }}>Auto-filled from the shared meter&rsquo;s reading.</p>}
                          </td>
                          <td>
                            <input name={`item_comment_${i}`} className={theme.input} defaultValue={item.comment ?? ''} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <button type="submit" className={theme.button} style={{ marginTop: '1rem' }}>
                Save
              </button>
            </div>
          </form>

          <div className={theme.card} style={{ marginBottom: '1rem' }}>
            <h2 className={homeStyles.sectionTitle}>Add an item</h2>
            <form action={addItemAction} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className={theme.field} style={{ marginBottom: 0, flex: 2 }}>
                <label className={theme.label}>Description</label>
                <input name="description" className={theme.input} required />
              </div>
              <div className={theme.field} style={{ marginBottom: 0 }}>
                <label className={theme.label}>Amount</label>
                <input name="amount" type="number" step="0.01" className={theme.input} />
              </div>
              <button type="submit" className={theme.buttonGhost}>
                Add
              </button>
            </form>

            <h2 className={homeStyles.sectionTitle} style={{ marginTop: '1.25rem' }}>
              Remove an item
            </h2>
            <div className={homeStyles.rowList}>
              {maintenanceMonth.line_items.map((item, i) => (
                <div key={i} className={homeStyles.row}>
                  <span>{item.description}</span>
                  <form action={removeItemAction}>
                    <input type="hidden" name="index" value={i} />
                    <button type="submit" className={theme.buttonGhost}>
                      Remove
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </div>

          <div className={theme.card} style={{ marginBottom: '1.5rem' }}>
            <div className={homeStyles.billLine}>
              <span>Grand total (split across flats)</span>
              <span className={theme.num}>{formatCurrency(maintenanceGrandTotal(maintenanceMonth.line_items))}</span>
            </div>
            {flats.length > 0 && (
              <p className={theme.muted} style={{ marginTop: '0.5rem' }}>
                {apartment.flat_split === 'equal' ? 'Equal split' : 'Weighted split'} across{' '}
                {apartment.flat_split === 'equal' ? (apartment.shared_cost_divisor ?? flats.length) : flats.length} flats
                {apartment.flat_split === 'equal' && apartment.shared_cost_divisor ? ' (divisor override)' : ''} — e.g. flat{' '}
                {flats[0].flat_no}:{' '}
                {formatCurrency(
                  splitMaintenance(maintenanceGrandTotal(maintenanceMonth.line_items), flats, apartment.flat_split, apartment.shared_cost_divisor).get(flats[0].id) ?? 0
                )}
              </p>
            )}
            {maintenanceMonth.status !== 'published' && (
              <form action={publishAction} style={{ marginTop: '1rem' }}>
                <button type="submit" className={theme.button}>
                  Publish
                </button>
              </form>
            )}
          </div>

          <div className={homeStyles.section}>
            <h2 className={homeStyles.sectionTitle}>Advance, late fees &amp; due</h2>
            <p className={theme.muted} style={{ marginBottom: '1rem' }}>
              Per flat, for this billing period. Total due = maintenance + water + late fee + previous due − advance payment.
              Previous due is auto-suggested from the prior period&rsquo;s unpaid balance when you start a new period (see{' '}
              <Link href="/living/app/payments">Payments</Link>) — freely editable here either way.
            </p>
            <div className={theme.card}>
              <form action={saveLedgerAction}>
                <div className={theme.tableScroll}>
                  <table className={theme.table}>
                    <thead>
                      <tr>
                        <th>Flat</th>
                        <th className={theme.num}>Advance payment</th>
                        <th className={theme.num}>Late fee</th>
                        <th className={theme.num}>Previous due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerRows.map(({ flat, ledger }) => (
                        <tr key={flat.id}>
                          <td>{flat.flat_no}</td>
                          <td>
                            <input
                              name={`advance_${flat.id}`}
                              className={theme.input}
                              type="number"
                              step="0.01"
                              defaultValue={ledger?.advance_payment ?? 0}
                            />
                          </td>
                          <td>
                            <input
                              name={`late_fee_${flat.id}`}
                              className={theme.input}
                              type="number"
                              step="0.01"
                              defaultValue={ledger?.late_fee ?? 0}
                            />
                          </td>
                          <td>
                            <input
                              name={`previous_due_${flat.id}`}
                              className={theme.input}
                              type="number"
                              step="0.01"
                              defaultValue={ledger?.previous_due ?? 0}
                            />
                          </td>
                        </tr>
                      ))}
                      {ledgerRows.length === 0 && (
                        <tr>
                          <td colSpan={4} className={theme.muted}>
                            No billable flats yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {ledgerRows.length > 0 && (
                  <button type="submit" className={theme.button} style={{ marginTop: '1rem' }}>
                    Save
                  </button>
                )}
              </form>
            </div>
          </div>

          <div className={homeStyles.section}>
            <h2 className={homeStyles.sectionTitle}>Edit current billing period</h2>
            <div className={theme.card}>
              <p className={theme.muted} style={{ marginBottom: '1rem' }}>
                Changes the dates on this same period, in place — asks for confirmation first since it may already be published.
              </p>
              <EditPeriodForm action={updatePeriodDatesAction} defaultStart={maintenanceMonth.month} defaultEnd={maintenanceMonth.period_end} />
            </div>
          </div>
        </>
      )}

      <div className={homeStyles.section}>
        <h2 className={homeStyles.sectionTitle}>Start a new billing period</h2>
        <div className={theme.card}>
          <p className={theme.muted} style={{ marginBottom: '1rem' }}>
            Not tied to a calendar month — pick whatever range this apartment actually bills for (a month, a quarter, half a year).
            Starting one makes it the current period shown here and to Owners; the old one stays in the record, just no longer the
            active one.
          </p>
          <form action={startPeriodAction} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className={theme.field} style={{ marginBottom: 0 }}>
              <label className={theme.label} htmlFor="period_start">
                From
              </label>
              <input id="period_start" name="period_start" type="date" className={theme.input} defaultValue={defaultStart} required />
            </div>
            <div className={theme.field} style={{ marginBottom: 0 }}>
              <label className={theme.label} htmlFor="period_end">
                To
              </label>
              <input id="period_end" name="period_end" type="date" className={theme.input} defaultValue={defaultEnd} required />
            </div>
            <button type="submit" className={theme.button}>
              Start period
            </button>
          </form>
        </div>
      </div>
    </>
  )
}

function addDays(dateString: string, days: number): string {
  const date = new Date(dateString)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function lastDayOfMonth(dateString: string): string {
  const [year, month] = dateString.split('-').map(Number)
  return new Date(year, month, 0).toISOString().slice(0, 10)
}
