import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireMembership } from '@/lib/living/auth'
import { setLivingError, setLivingNotice } from '@/lib/living/flash'
import { formatCurrency, formatPeriodLabel, monthKeyFor } from '@/lib/living/format'
import { maintenanceGrandTotal, round2, splitMaintenance } from '@/lib/living/billing'
import { computeBillForFlat, getAdvanceCarryForwardSuggestion, getAdvanceTransfers, getBillableFlats, getCarryForwardExpenses, getCommonWaterCharge, getCurrentMaintenancePeriod, getFlatLedger, getFlats, getPreviousDueSuggestion, syncAdvanceApplicationPayment } from '@/lib/living/queries'
import type { AdvanceTransfer, MaintenanceLineItem, MaintenanceMonth } from '@/lib/living/types'
import ConfirmSubmitButton from '../ConfirmSubmitButton'
import MaterialIcon from '../../MaterialIcon'
import theme from '../../LivingTheme.module.scss'
import homeStyles from '../Home.module.scss'
import Tabs from '../Tabs'
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
 * Line items (description + amount + category) carry forward from the period
 * being superseded, since most months' costs repeat — freely editable
 * afterward like any other field. Comments reset to blank since they tend to
 * be period-specific notes, not recurring values. The very first period for
 * an apartment (no prior period) falls back to TEMPLATE_DESCRIPTIONS at 0.
 *
 * Also folds in every Expense (from any prior period) still owed a future
 * billing cycle — "Include in next bill cycle" or "Split across months" was
 * checked when it was recorded. Each contributes amount / carry_forward_months
 * as a new line item (added to an existing line item with a matching
 * description instead of duplicating it), and its carry_forward_remaining
 * counter is decremented by one — so a 3-month split really only shows up on
 * the next 3 periods, not forever. An expense with neither box checked never
 * affects Maintenance at all.
 *
 * Also seeds each billable flat's new previous_due from what was left unpaid
 * (getPreviousDueSuggestion) and its new advance_payment from whatever
 * advance went unused (getAdvanceCarryForwardSuggestion) on the period being
 * superseded — a one-time carry-forward each direction, not a live sync; the
 * Admin can edit either afterward like any other ledger field.
 */
async function startPeriodAction(formData: FormData) {
  'use server'
  const { supabase, apartment, userId } = await requireMembership(['admin', 'treasurer'])
  const periodStart = String(formData.get('period_start') ?? '').trim()
  const periodEnd = String(formData.get('period_end') ?? '').trim()
  if (!periodStart || !periodEnd) {
    await setLivingError('Pick both a start and end date.')
    redirect('/living/maintenance')
  }
  if (periodEnd < periodStart) {
    await setLivingError('End date must be on or after the start date.')
    redirect('/living/maintenance')
  }

  const priorPeriod = await getCurrentMaintenancePeriod(supabase, apartment.id)

  const lineItems: MaintenanceLineItem[] = priorPeriod
    ? priorPeriod.line_items.map((item) => ({ ...item, comment: '' }))
    : TEMPLATE_DESCRIPTIONS.map((description) => ({ description, amount: 0, comment: '', category: '' }))

  const carryForwardExpenses = await getCarryForwardExpenses(supabase, apartment.id)
  if (carryForwardExpenses.length > 0) {
    const totalsByLabel = new Map<string, number>()
    for (const expense of carryForwardExpenses) {
      const label = (expense.category || expense.description).trim()
      if (!label) continue
      const perCycle = expense.amount / (expense.carry_forward_months || 1)
      totalsByLabel.set(label, (totalsByLabel.get(label) ?? 0) + perCycle)
    }
    for (const [label, amount] of totalsByLabel) {
      const existingItem = lineItems.find((item) => item.description.trim().toLowerCase() === label.toLowerCase())
      if (existingItem) {
        existingItem.amount = round2(existingItem.amount + amount)
      } else {
        lineItems.push({ description: label, amount: round2(amount), comment: '', category: '' })
      }
    }
    for (const expense of carryForwardExpenses) {
      const remaining = (expense.carry_forward_remaining ?? 1) - 1
      await supabase
        .from('living_expenses')
        .update({ carry_forward_remaining: remaining > 0 ? remaining : null })
        .eq('id', expense.id)
    }
  }

  const { data: inserted, error } = await supabase
    .from('living_maintenance_months')
    .insert({
      apartment_id: apartment.id,
      month: periodStart,
      period_end: periodEnd,
      line_items: lineItems,
      created_by: userId,
    })
    .select()
    .single()
  if (error || !inserted) {
    await setLivingError(error?.message ?? 'Could not start the period.')
    redirect('/living/maintenance')
  }

  if (priorPeriod) {
    const flats = getBillableFlats(await getFlats(supabase, apartment.id))
    for (const flat of flats) {
      const previousDue = await getPreviousDueSuggestion(supabase, apartment, flat, priorPeriod)
      const advanceCarryForward = await getAdvanceCarryForwardSuggestion(supabase, apartment, flat, priorPeriod)
      if (previousDue > 0 || advanceCarryForward > 0) {
        await supabase.from('living_flat_ledger').upsert(
          {
            apartment_id: apartment.id,
            maintenance_month_id: inserted.id,
            flat_id: flat.id,
            previous_due: previousDue,
            advance_payment: advanceCarryForward,
          },
          { onConflict: 'maintenance_month_id,flat_id' }
        )
        if (advanceCarryForward > 0) await syncAdvanceApplicationPayment(supabase, apartment, flat, inserted as MaintenanceMonth, userId)
      }
    }
  }
  redirect('/living/maintenance')
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
  if (!current) redirect('/living/maintenance')

  const periodStart = String(formData.get('period_start') ?? '').trim()
  const periodEnd = String(formData.get('period_end') ?? '').trim()
  if (!periodStart || !periodEnd) {
    await setLivingError('Pick both a start and end date.')
    redirect('/living/maintenance')
  }
  if (periodEnd < periodStart) {
    await setLivingError('End date must be on or after the start date.')
    redirect('/living/maintenance')
  }

  const { error } = await supabase
    .from('living_maintenance_months')
    .update({ month: periodStart, period_end: periodEnd })
    .eq('id', current.id)
  if (error) {
    await setLivingError(error.message)
    redirect('/living/maintenance')
  }
  await setLivingNotice('Billing cycle updated.')
  redirect('/living/maintenance')
}

async function saveAction(formData: FormData) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const current = await getCurrentMaintenancePeriod(supabase, apartment.id)
  if (!current) redirect('/living/maintenance')

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
  if (error) {
    await setLivingError(error.message)
    redirect('/living/maintenance')
  }
  await setLivingNotice('Saved.')
  redirect('/living/maintenance')
}

async function addItemAction(formData: FormData) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const current = await getCurrentMaintenancePeriod(supabase, apartment.id)
  if (!current) redirect('/living/maintenance')

  const description = String(formData.get('description') ?? '').trim()
  if (!description) {
    await setLivingError('Give the item a description.')
    redirect('/living/maintenance')
  }

  let lineItems = [...current.line_items, { description, amount: Number(formData.get('amount') ?? 0) || 0, comment: '', category: '' }]
  lineItems = syncCommonWaterAmount(lineItems, await getCommonWaterCharge(supabase, apartment, monthKeyFor(new Date())))
  const { error } = await supabase.from('living_maintenance_months').update({ line_items: lineItems }).eq('id', current.id)
  if (error) {
    await setLivingError(error.message)
    redirect('/living/maintenance')
  }
  redirect('/living/maintenance')
}

async function removeItemAction(index: number) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const current = await getCurrentMaintenancePeriod(supabase, apartment.id)
  if (!current) redirect('/living/maintenance')

  let lineItems = current.line_items.filter((_, i) => i !== index)
  lineItems = syncCommonWaterAmount(lineItems, await getCommonWaterCharge(supabase, apartment, monthKeyFor(new Date())))
  const { error } = await supabase.from('living_maintenance_months').update({ line_items: lineItems }).eq('id', current.id)
  if (error) {
    await setLivingError(error.message)
    redirect('/living/maintenance')
  }
  redirect('/living/maintenance')
}

async function saveLedgerAction(formData: FormData) {
  'use server'
  const { supabase, apartment, userId } = await requireMembership(['admin', 'treasurer'])
  const current = await getCurrentMaintenancePeriod(supabase, apartment.id)
  if (!current) redirect('/living/maintenance')

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
    if (error) {
      await setLivingError(`Flat ${flat.flat_no}: ${error.message}`)
      redirect('/living/maintenance')
    }
    await syncAdvanceApplicationPayment(supabase, apartment, flat, current, userId)
  }
  await setLivingNotice('Advance, late fees & due updated.')
  redirect('/living/maintenance')
}

/** Moves part or all of one flat's advance balance to another flat, for the current period — the source flat must have a positive advance to move from. */
async function transferAdvanceAction(formData: FormData) {
  'use server'
  const { supabase, apartment, userId } = await requireMembership(['admin', 'treasurer'])
  const current = await getCurrentMaintenancePeriod(supabase, apartment.id)
  if (!current) redirect('/living/maintenance')

  const fromFlatId = String(formData.get('from_flat_id'))
  const toFlatId = String(formData.get('to_flat_id'))
  const amount = round2(Number(formData.get('transfer_amount') ?? 0) || 0)

  if (!fromFlatId || !toFlatId || fromFlatId === toFlatId) {
    await setLivingError('Pick two different flats.')
    redirect('/living/maintenance')
  }
  if (amount <= 0) {
    await setLivingError('Enter a transfer amount greater than 0.')
    redirect('/living/maintenance')
  }

  const [fromLedger, toLedger] = await Promise.all([getFlatLedger(supabase, current.id, fromFlatId), getFlatLedger(supabase, current.id, toFlatId)])
  const fromAdvance = fromLedger?.advance_payment ?? 0
  if (fromAdvance <= 0) {
    await setLivingError('That flat has no advance balance to transfer.')
    redirect('/living/maintenance')
  }
  if (amount > fromAdvance) {
    await setLivingError(`Only ${formatCurrency(fromAdvance)} advance available on that flat.`)
    redirect('/living/maintenance')
  }

  const { error: fromError } = await supabase.from('living_flat_ledger').upsert(
    {
      apartment_id: apartment.id,
      maintenance_month_id: current.id,
      flat_id: fromFlatId,
      advance_payment: round2(fromAdvance - amount),
      late_fee: fromLedger?.late_fee ?? 0,
      previous_due: fromLedger?.previous_due ?? 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'maintenance_month_id,flat_id' }
  )
  if (fromError) {
    await setLivingError(fromError.message)
    redirect('/living/maintenance')
  }

  const { error: toError } = await supabase.from('living_flat_ledger').upsert(
    {
      apartment_id: apartment.id,
      maintenance_month_id: current.id,
      flat_id: toFlatId,
      advance_payment: round2((toLedger?.advance_payment ?? 0) + amount),
      late_fee: toLedger?.late_fee ?? 0,
      previous_due: toLedger?.previous_due ?? 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'maintenance_month_id,flat_id' }
  )
  if (toError) {
    await setLivingError(toError.message)
    redirect('/living/maintenance')
  }

  const allFlats = await getFlats(supabase, apartment.id)
  const fromFlat = allFlats.find((f) => f.id === fromFlatId)
  const toFlat = allFlats.find((f) => f.id === toFlatId)
  if (fromFlat) await syncAdvanceApplicationPayment(supabase, apartment, fromFlat, current, userId)
  if (toFlat) await syncAdvanceApplicationPayment(supabase, apartment, toFlat, current, userId)

  const { error: logError } = await supabase.from('living_advance_transfers').insert({
    apartment_id: apartment.id,
    maintenance_month_id: current.id,
    from_flat_id: fromFlatId,
    to_flat_id: toFlatId,
    amount,
    transferred_by: userId,
  })
  if (logError) {
    await setLivingError(logError.message)
    redirect('/living/maintenance')
  }

  await setLivingNotice(`Transferred ${formatCurrency(amount)} advance.`)
  redirect('/living/maintenance')
}

/** Reverses one logged transfer (adds the amount back to the source flat, takes it back off the destination) and removes the log entry — an undo, not just a record delete. */
async function deleteAdvanceTransferAction(id: string) {
  'use server'
  const { supabase, apartment, userId } = await requireMembership(['admin', 'treasurer'])

  const { data: transfer } = await supabase.from('living_advance_transfers').select('*').eq('id', id).eq('apartment_id', apartment.id).maybeSingle<AdvanceTransfer>()
  if (!transfer) redirect('/living/maintenance')

  const [fromLedger, toLedger] = await Promise.all([
    getFlatLedger(supabase, transfer.maintenance_month_id, transfer.from_flat_id),
    getFlatLedger(supabase, transfer.maintenance_month_id, transfer.to_flat_id),
  ])

  const { error: fromError } = await supabase.from('living_flat_ledger').upsert(
    {
      apartment_id: apartment.id,
      maintenance_month_id: transfer.maintenance_month_id,
      flat_id: transfer.from_flat_id,
      advance_payment: round2((fromLedger?.advance_payment ?? 0) + transfer.amount),
      late_fee: fromLedger?.late_fee ?? 0,
      previous_due: fromLedger?.previous_due ?? 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'maintenance_month_id,flat_id' }
  )
  if (fromError) {
    await setLivingError(fromError.message)
    redirect('/living/maintenance')
  }

  const { error: toError } = await supabase.from('living_flat_ledger').upsert(
    {
      apartment_id: apartment.id,
      maintenance_month_id: transfer.maintenance_month_id,
      flat_id: transfer.to_flat_id,
      advance_payment: round2((toLedger?.advance_payment ?? 0) - transfer.amount),
      late_fee: toLedger?.late_fee ?? 0,
      previous_due: toLedger?.previous_due ?? 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'maintenance_month_id,flat_id' }
  )
  if (toError) {
    await setLivingError(toError.message)
    redirect('/living/maintenance')
  }

  const { data: maintenanceMonth } = await supabase
    .from('living_maintenance_months')
    .select('*')
    .eq('id', transfer.maintenance_month_id)
    .maybeSingle<MaintenanceMonth>()
  const allFlats = await getFlats(supabase, apartment.id)
  const fromFlat = allFlats.find((f) => f.id === transfer.from_flat_id)
  const toFlat = allFlats.find((f) => f.id === transfer.to_flat_id)
  if (maintenanceMonth && fromFlat) await syncAdvanceApplicationPayment(supabase, apartment, fromFlat, maintenanceMonth, userId)
  if (maintenanceMonth && toFlat) await syncAdvanceApplicationPayment(supabase, apartment, toFlat, maintenanceMonth, userId)

  const { error: deleteError } = await supabase.from('living_advance_transfers').delete().eq('id', id).eq('apartment_id', apartment.id)
  if (deleteError) {
    await setLivingError(deleteError.message)
    redirect('/living/maintenance')
  }

  await setLivingNotice('Transfer undone.')
  redirect('/living/maintenance')
}

async function publishAction() {
  'use server'
  const { supabase, apartment, userId } = await requireMembership(['admin', 'treasurer'])
  const current = await getCurrentMaintenancePeriod(supabase, apartment.id)
  if (!current) redirect('/living/maintenance')

  const { error } = await supabase
    .from('living_maintenance_months')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', current.id)
  if (error) {
    await setLivingError(error.message)
    redirect('/living/maintenance')
  }

  // maintenance_share stops being 0 the moment this period is published, which
  // changes every billable flat's own charges — resync each one's advance-applied
  // payment record against the now-correct total.
  const published: MaintenanceMonth = { ...current, status: 'published' }
  const flats = getBillableFlats(await getFlats(supabase, apartment.id))
  for (const flat of flats) {
    await syncAdvanceApplicationPayment(supabase, apartment, flat, published, userId)
  }

  await setLivingNotice('Published — owners can now see their share.')
  redirect('/living/maintenance')
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
          // Read-only, live — how much of the entered Advance is still left (or
          // still owed) once THIS period's own bill is applied against it. The
          // Advance/Previous due INPUTS below stay exactly what was entered —
          // total_due is computed from those entered figures, so collapsing an
          // input down to its own remaining would double-apply it (the bill
          // would look unpaid again even though the original entered amount
          // already fully covered it). This column exists so that doesn't have
          // to be worked out by hand.
          bill: await computeBillForFlat(supabase, apartment, flat, thisMonth),
        }))
      )
    : []
  const flatsWithAdvance = ledgerRows.filter((row) => (row.ledger?.advance_payment ?? 0) > 0)
  const advanceTransfers = maintenanceMonth ? await getAdvanceTransfers(supabase, maintenanceMonth.id) : []
  const flatNoById = new Map(allFlats.map((f) => [f.id, f.flat_no]))

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
        Water and tanker costs live on the <Link href="/living/water">Water</Link> page now — they&rsquo;re part of the water bill,
        not common maintenance.
      </p>

      {!maintenanceMonth && (
        <div className={theme.card} style={{ marginBottom: '1.5rem' }}>
          <p className={theme.muted} style={{ marginBottom: '1rem' }}>
            Nothing entered yet.
          </p>
        </div>
      )}

      {maintenanceMonth && (
        <Tabs
          tabs={[
            {
              id: 'items',
              label: 'Line Items',
              content: (
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
                              const isCommonWater =
                                commonWaterCharge !== null && item.description.trim().toLowerCase() === COMMON_WATER_BILL_DESCRIPTION.toLowerCase()
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
                                    {isCommonWater && (
                                      <p className={theme.muted} style={{ marginTop: '0.2rem' }}>
                                        Auto-filled from the shared meter&rsquo;s reading.
                                      </p>
                                    )}
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
                        <MaterialIcon name="add" size={16} style={{ marginRight: '0.3rem' }} />
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
                          <ConfirmSubmitButton
                            formAction={removeItemAction.bind(null, i)}
                            confirmMessage={`Remove "${item.description}" from this period?`}
                            className={theme.iconButtonDanger}
                            title="Remove item"
                          >
                            <MaterialIcon name="delete" size={18} />
                          </ConfirmSubmitButton>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={theme.card}>
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
                          splitMaintenance(maintenanceGrandTotal(maintenanceMonth.line_items), flats, apartment.flat_split, apartment.shared_cost_divisor).get(
                            flats[0].id
                          ) ?? 0
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
                </>
              ),
            },
            {
              id: 'ledger',
              label: 'Advance & Dues',
              content: (
                <>
                  <p className={theme.muted} style={{ marginBottom: '1rem' }}>
                    Per flat, for this billing period. Total due = maintenance + water + late fee + previous due − advance payment.
                    Starting a new period auto-suggests previous due from what&rsquo;s still unpaid, and advance payment from
                    whatever advance went unused this period (see <Link href="/living/payments">Payments</Link>) — both freely
                    editable here either way, and neither re-applied afterward. The Advance/Previous due columns are what was
                    entered at the start of the period, unchanged by this period&rsquo;s bill — <strong>Remaining</strong> shows
                    what&rsquo;s actually still owed or left over right now, live.
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
                              <th className={theme.num}>Remaining</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ledgerRows.map(({ flat, ledger, bill }) => (
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
                                  <input name={`late_fee_${flat.id}`} className={theme.input} type="number" step="0.01" defaultValue={ledger?.late_fee ?? 0} />
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
                                <td className={theme.num}>
                                  {bill.balance_remaining > 0 ? (
                                    <span className={theme.pillFlag}>Due {formatCurrency(bill.balance_remaining)}</span>
                                  ) : bill.balance_remaining < 0 ? (
                                    <span className={theme.pillOk}>Advance {formatCurrency(-bill.balance_remaining)}</span>
                                  ) : (
                                    <span className={theme.pillOk}>Settled ₹0</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                            {ledgerRows.length === 0 && (
                              <tr>
                                <td colSpan={5} className={theme.muted}>
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

                  <div className={theme.card} style={{ marginTop: '1.5rem' }}>
                    <h2 className={homeStyles.sectionTitle}>Transfer advance between flats</h2>
                    {flatsWithAdvance.length === 0 ? (
                      <p className={theme.muted}>No flat currently has an advance balance to transfer.</p>
                    ) : (
                      <>
                        <p className={theme.muted} style={{ marginBottom: '1rem' }}>
                          Moves part or all of one flat&rsquo;s advance to another, for this period — only flats with an advance
                          balance above ₹0 can be a source.
                        </p>
                        <form action={transferAdvanceAction}>
                          <div className={homeStyles.grid}>
                            <div className={theme.field}>
                              <label className={theme.label} htmlFor="from_flat_id">
                                From flat
                              </label>
                              <select id="from_flat_id" name="from_flat_id" className={theme.select} required>
                                {flatsWithAdvance.map(({ flat, ledger }) => (
                                  <option key={flat.id} value={flat.id}>
                                    {flat.flat_no} — {formatCurrency(ledger?.advance_payment ?? 0)} available
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className={theme.field}>
                              <label className={theme.label} htmlFor="to_flat_id">
                                To flat
                              </label>
                              <select id="to_flat_id" name="to_flat_id" className={theme.select} required>
                                {flats.map((flat) => (
                                  <option key={flat.id} value={flat.id}>
                                    {flat.flat_no}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className={theme.field}>
                              <label className={theme.label} htmlFor="transfer_amount">
                                Amount
                              </label>
                              <input id="transfer_amount" name="transfer_amount" className={theme.input} type="number" step="0.01" min="0.01" required />
                            </div>
                          </div>
                          <button type="submit" className={theme.button}>
                            Transfer
                          </button>
                        </form>
                      </>
                    )}
                  </div>

                  <div className={theme.card} style={{ marginTop: '1.5rem' }}>
                    <h2 className={homeStyles.sectionTitle}>Transfer history</h2>
                    {advanceTransfers.length > 0 ? (
                      <div className={theme.tableScroll}>
                        <table className={theme.table}>
                          <thead>
                            <tr>
                              <th>When</th>
                              <th>From</th>
                              <th>To</th>
                              <th className={theme.num}>Amount</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {advanceTransfers.map((t) => (
                              <tr key={t.id}>
                                <td>{new Date(t.created_at).toLocaleString('en-IN')}</td>
                                <td>{flatNoById.get(t.from_flat_id) ?? '—'}</td>
                                <td>{flatNoById.get(t.to_flat_id) ?? '—'}</td>
                                <td className={theme.num}>{formatCurrency(t.amount)}</td>
                                <td>
                                  <ConfirmSubmitButton
                                    formAction={deleteAdvanceTransferAction.bind(null, t.id)}
                                    confirmMessage="Undo this transfer? The amount moves back to the source flat."
                                    className={theme.iconButtonDanger}
                                    title="Undo transfer"
                                  >
                                    <MaterialIcon name="delete" size={20} />
                                  </ConfirmSubmitButton>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className={theme.muted}>No transfers yet for this period.</p>
                    )}
                  </div>
                </>
              ),
            },
            {
              id: 'period',
              label: 'Billing Period',
              content: (
                <>
                  <div className={theme.card} style={{ marginBottom: '1.5rem' }}>
                    <h2 className={homeStyles.sectionTitle}>Edit current billing period</h2>
                    <p className={theme.muted} style={{ marginBottom: '1rem' }}>
                      Changes the dates on this same period, in place — asks for confirmation first since it may already be published.
                    </p>
                    <EditPeriodForm action={updatePeriodDatesAction} defaultStart={maintenanceMonth.month} defaultEnd={maintenanceMonth.period_end} />
                  </div>

                  <div className={theme.card}>
                    <h2 className={homeStyles.sectionTitle}>Start a new billing period</h2>
                    <p className={theme.muted} style={{ marginBottom: '1rem' }}>
                      Not tied to a calendar month — pick whatever range this apartment actually bills for (a month, a quarter, half a
                      year). Line item amounts carry forward from the current period so you&rsquo;re not retyping the same numbers, and
                      any <Link href="/living/expenses">Expense</Link> marked &ldquo;Include in next bill cycle&rdquo; or &ldquo;Split
                      across months&rdquo; gets folded in as a line item automatically — edit anything that changed on the Line Items
                      tab afterward. Starting one makes it the current period shown here and to Owners; the old one stays in the
                      record, just no longer the active one.
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
                </>
              ),
            },
          ]}
        />
      )}

      {!maintenanceMonth && (
        <div className={theme.card}>
          <h2 className={homeStyles.sectionTitle}>Start a new billing period</h2>
          <p className={theme.muted} style={{ marginBottom: '1rem' }}>
            Not tied to a calendar month — pick whatever range this apartment actually bills for (a month, a quarter, half a year).
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
      )}
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
