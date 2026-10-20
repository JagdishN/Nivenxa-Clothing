import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireMembership } from '@/lib/living/auth'
import { setLivingError, setLivingNotice } from '@/lib/living/flash'
import { maintenanceGrandTotal, majeeraCostTotal, round2, tankerCostTotal } from '@/lib/living/billing'
import { formatActivityTimestamp, formatCurrency, formatPeriodLabel, monthKeyFor } from '@/lib/living/format'
import {
  countExpensesUsingCategory,
  getApartmentReimbursementsDue,
  getCategoryUsageCounts,
  getCurrentMaintenancePeriod,
  getEffectiveTankerRates,
  getExistingSourceRefs,
  getExpenseCategories,
  getExpensesForPeriod,
  getFlats,
  getOutstandingReimbursementExpenses,
  getReimbursementDetailForExpense,
  getWaterSupplyCost,
  sumExpenses,
} from '@/lib/living/queries'
import type { Apartment, Expense, ExpensePaidBy, ExpenseSource, PaymentMethod } from '@/lib/living/types'
import type { SupabaseClient } from '@supabase/supabase-js'
import ConfirmSubmitButton from '../ConfirmSubmitButton'
import MaterialIcon from '../../MaterialIcon'
import RecordExpenseForm from './RecordExpenseForm'
import theme from '../../LivingTheme.module.scss'
import homeStyles from '../Home.module.scss'
import Tabs from '../Tabs'

const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'upi', 'bank_transfer', 'cheque', 'other']
const RECEIPT_BUCKET = 'expense-receipts'
const WATER_TANKER_CATEGORY = 'Water Tankers'
const MAJEERA_CATEGORY = 'Majeera Water'

async function recordExpenseAction(formData: FormData) {
  'use server'
  const { supabase, apartment, userId } = await requireMembership(['admin', 'treasurer'])
  const current = await getCurrentMaintenancePeriod(supabase, apartment.id)
  if (!current) {
    await setLivingError('Start a billing period on the Maintenance page first.')
    redirect('/living/expenses')
  }

  const description = String(formData.get('description') ?? '').trim()
  const amount = Number(formData.get('amount') ?? 0)
  const expenseDate = String(formData.get('expense_date') ?? '').trim()
  const category = String(formData.get('category') ?? '').trim()
  const paidTo = String(formData.get('paid_to') ?? '').trim()
  const method = String(formData.get('method') ?? 'other')
  const referenceNote = String(formData.get('reference_note') ?? '').trim()
  const expenseNotes = String(formData.get('expense_notes') ?? '').trim()
  const paidBy = String(formData.get('paid_by') ?? 'association') as ExpensePaidBy
  const residentFlatId = String(formData.get('resident_flat_id') ?? '').trim()
  const addToBilling = formData.get('add_to_billing') === 'yes'
  const billingMethod = String(formData.get('billing_method') ?? 'next_cycle')

  if (!description) {
    await setLivingError('Describe what this expense was for.')
    redirect('/living/expenses')
  }
  if (!amount || amount <= 0) {
    await setLivingError('Enter an amount greater than zero.')
    redirect('/living/expenses')
  }
  if (!expenseDate) {
    await setLivingError('Pick a date.')
    redirect('/living/expenses')
  }
  if (!PAYMENT_METHODS.includes(method as PaymentMethod)) {
    await setLivingError('Invalid payment method.')
    redirect('/living/expenses')
  }
  if (paidBy !== 'association' && paidBy !== 'resident') {
    await setLivingError('Invalid Paid From selection.')
    redirect('/living/expenses')
  }
  if (paidBy === 'resident' && !residentFlatId) {
    await setLivingError('Choose which flat funded this expense.')
    redirect('/living/expenses')
  }

  // Who funded the expense (paid_by) and whether it's recovered from residents (carry-forward)
  // are independent decisions — a resident can fund an expense AND the association can still bill
  // the whole apartment for it, exactly like an association-funded one. Reimbursing the resident
  // for what they personally spent is a separate transaction, settled on the Reimbursements tab.
  let carryForwardMonths: number | null = null
  if (addToBilling) {
    if (billingMethod === 'spread') {
      const months = Math.floor(Number(formData.get('split_months') ?? 0))
      if (!months || months < 2) {
        await setLivingError('Enter how many billing cycles to spread this expense across.')
        redirect('/living/expenses')
      }
      carryForwardMonths = months
    } else {
      carryForwardMonths = 1
    }
  }

  let receiptPath: string | null = null
  const receiptFile = formData.get('receipt') as File | null
  if (receiptFile && receiptFile.size > 0) {
    const path = `${apartment.id}/${Date.now()}-${receiptFile.name}`
    const { error: uploadError } = await supabase.storage.from(RECEIPT_BUCKET).upload(path, receiptFile)
    if (uploadError) {
      await setLivingError(uploadError.message)
      redirect('/living/expenses')
    }
    receiptPath = path
  }

  const categories = await getExpenseCategories(supabase, apartment.id)
  const matchedCategory = categories.find((c) => c.name === category)

  const { error } = await supabase.from('living_expenses').insert({
    apartment_id: apartment.id,
    maintenance_month_id: current.id,
    expense_date: expenseDate,
    category: category || null,
    description,
    amount,
    paid_to: paidTo || null,
    method,
    reference_note: referenceNote || null,
    expense_notes: expenseNotes || null,
    paid_by: paidBy,
    resident_flat_id: paidBy === 'resident' ? residentFlatId : null,
    receipt_path: receiptPath,
    approved_by: userId,
    approved_at: new Date().toISOString(),
    source: 'manual',
    is_recurring: matchedCategory?.is_recurring ?? null,
    carry_forward_months: carryForwardMonths,
    carry_forward_remaining: carryForwardMonths,
    recorded_by: userId,
  })
  if (error) {
    await setLivingError(error.message)
    redirect('/living/expenses')
  }
  await setLivingNotice('Expense recorded.')
  redirect('/living/expenses')
}

interface SyncCandidate {
  sourceRef: string
  source: ExpenseSource
  category: string
  amount: number
}

/** Shared by the page render (preview list) and the sync action itself (what actually gets inserted) so they can't drift. */
async function computeSyncCandidates(supabase: SupabaseClient, apartment: Apartment, current: { id: string; line_items: { description: string; amount: number }[] }): Promise<SyncCandidate[]> {
  const month = monthKeyFor(new Date())
  const [existingRefs, supplyCost, tankerRates] = await Promise.all([
    getExistingSourceRefs(supabase, current.id),
    getWaterSupplyCost(supabase, apartment.id, month),
    getEffectiveTankerRates(supabase, apartment.id, month),
  ])

  const rows: SyncCandidate[] = []
  for (const item of current.line_items) {
    if (item.amount <= 0) continue
    const sourceRef = `maintenance:${item.description}`
    if (existingRefs.has(sourceRef)) continue
    rows.push({ sourceRef, source: 'maintenance_sync', category: item.description, amount: item.amount })
  }
  if (supplyCost) {
    const tankerAmount = tankerRates ? tankerCostTotal(supplyCost, tankerRates) : 0
    if (tankerAmount > 0 && !existingRefs.has('water:tanker')) rows.push({ sourceRef: 'water:tanker', source: 'water_sync', category: WATER_TANKER_CATEGORY, amount: tankerAmount })
    const majeeraAmount = majeeraCostTotal(supplyCost)
    if (majeeraAmount > 0 && !existingRefs.has('water:majeera')) rows.push({ sourceRef: 'water:majeera', source: 'water_sync', category: MAJEERA_CATEGORY, amount: majeeraAmount })
  }
  return rows
}

async function syncMaintenanceWaterExpensesAction() {
  'use server'
  const { supabase, apartment, userId } = await requireMembership(['admin', 'treasurer'])
  const current = await getCurrentMaintenancePeriod(supabase, apartment.id)
  if (!current) {
    await setLivingError('Start a billing period on the Maintenance page first.')
    redirect('/living/expenses')
  }

  const rows = await computeSyncCandidates(supabase, apartment, current)
  if (rows.length === 0) {
    await setLivingError('Nothing to sync — everything is already up to date.')
    redirect('/living/expenses')
  }

  const now = new Date().toISOString()
  const { error } = await supabase.from('living_expenses').insert(
    rows.map((row) => ({
      apartment_id: apartment.id,
      maintenance_month_id: current.id,
      expense_date: current.month,
      category: row.category,
      description: row.category,
      amount: row.amount,
      method: 'other',
      reference_note: 'Synced from Maintenance / Water',
      source: row.source,
      source_ref: row.sourceRef,
      recorded_by: userId,
      approved_by: userId,
      approved_at: now,
    }))
  )
  if (error) {
    await setLivingError(error.message)
    redirect('/living/expenses')
  }
  await setLivingNotice(`Synced ${rows.length} item${rows.length === 1 ? '' : 's'} as expenses.`)
  redirect('/living/expenses')
}

// Delete/Reverse both live on the expense detail page (/living/expenses/[id]) now, not the Log row
// — item 12/13's redesign moved that decision (and its "is this expense already referenced
// elsewhere" gate) off the list and onto the record itself.

async function addExpenseCategoryAction(formData: FormData) {
  'use server'
  const { supabase, apartment, userId } = await requireMembership(['admin', 'treasurer'])
  const name = String(formData.get('name') ?? '').trim()
  if (!name) {
    await setLivingError('Enter a category name.')
    redirect('/living/expenses')
  }
  const { error } = await supabase.from('living_expense_categories').insert({ name, apartment_id: apartment.id, created_by: userId })
  if (error) {
    await setLivingError(error.code === '23505' ? 'That category already exists.' : error.message)
    redirect('/living/expenses')
  }
  await setLivingNotice('Category added.')
  redirect('/living/expenses')
}

async function renameExpenseCategoryAction(id: string, formData: FormData) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const oldName = String(formData.get('old_name') ?? '').trim()
  const newName = String(formData.get('new_name') ?? '').trim()
  if (!newName) {
    await setLivingError('Enter a new name.')
    redirect('/living/expenses')
  }
  if (newName === oldName) {
    await setLivingNotice('No change.')
    redirect('/living/expenses')
  }
  const { error: renameError } = await supabase.from('living_expense_categories').update({ name: newName }).eq('id', id).eq('apartment_id', apartment.id)
  if (renameError) {
    await setLivingError(renameError.code === '23505' ? 'That name is already used.' : renameError.message)
    redirect('/living/expenses')
  }
  // Categories are matched by name string, not a foreign key — every existing expense already
  // filed under the old name needs to move with it, or they'd silently fall out of the category.
  if (oldName) {
    await supabase.from('living_expenses').update({ category: newName }).eq('apartment_id', apartment.id).eq('category', oldName)
  }
  await setLivingNotice('Category renamed.')
  redirect('/living/expenses')
}

async function toggleExpenseCategoryActiveAction(id: string, nextActive: boolean) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const { error } = await supabase.from('living_expense_categories').update({ is_active: nextActive }).eq('id', id).eq('apartment_id', apartment.id)
  if (error) {
    await setLivingError(error.message)
    redirect('/living/expenses')
  }
  await setLivingNotice(nextActive ? 'Category reactivated.' : 'Category deactivated — hidden from Record Expense, existing expenses keep it.')
  redirect('/living/expenses')
}

async function deleteExpenseCategoryAction(id: string, name: string) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const usageCount = await countExpensesUsingCategory(supabase, apartment.id, name)
  if (usageCount > 0) {
    await setLivingError(`"${name}" is used by ${usageCount} expense${usageCount === 1 ? '' : 's'} — rename or deactivate it instead of deleting.`)
    redirect('/living/expenses')
  }
  const { error } = await supabase.from('living_expense_categories').delete().eq('id', id).eq('apartment_id', apartment.id)
  if (error) {
    await setLivingError(error.message)
    redirect('/living/expenses')
  }
  await setLivingNotice('Category removed.')
  redirect('/living/expenses')
}

async function settleReimbursementAction(formData: FormData) {
  'use server'
  const { supabase, apartment, userId } = await requireMembership(['admin', 'treasurer'])
  const expenseId = String(formData.get('expense_id') ?? '').trim()
  const settlementType = String(formData.get('settlement_type') ?? '')
  const amount = Number(formData.get('amount') ?? 0)
  const note = String(formData.get('note') ?? '').trim()

  if (!expenseId) {
    await setLivingError('Choose which expense this settles.')
    redirect('/living/expenses')
  }
  if (settlementType !== 'cash' && settlementType !== 'bill_adjustment') {
    await setLivingError('Choose a settlement method.')
    redirect('/living/expenses')
  }
  if (!amount || amount <= 0) {
    await setLivingError('Enter an amount greater than zero.')
    redirect('/living/expenses')
  }

  const detail = await getReimbursementDetailForExpense(supabase, expenseId)
  if (!detail || detail.expense.apartment_id !== apartment.id) {
    await setLivingError('Expense not found.')
    redirect('/living/expenses')
  }
  if (!detail.expense.resident_flat_id) {
    await setLivingError('This expense has no resident flat on file.')
    redirect('/living/expenses')
  }
  if (amount > detail.remaining + 0.005) {
    await setLivingError(`That's more than the ${formatCurrency(detail.remaining)} still remaining on this expense.`)
    redirect('/living/expenses')
  }

  const current = await getCurrentMaintenancePeriod(supabase, apartment.id)
  const { error } = await supabase.from('living_reimbursement_settlements').insert({
    apartment_id: apartment.id,
    expense_id: expenseId,
    flat_id: detail.expense.resident_flat_id,
    settlement_type: settlementType,
    amount,
    maintenance_month_id: current?.id ?? null,
    note: note || null,
    settled_by: userId,
  })
  if (error) {
    await setLivingError(error.message)
    redirect('/living/expenses')
  }
  await setLivingNotice(settlementType === 'cash' ? 'Reimbursement recorded.' : "Adjusted against the flat's bill.")
  redirect('/living/expenses')
}

function categoryBreakdown(expenses: Expense[]): { category: string; total: number; percent: number }[] {
  const active = expenses.filter((e) => !e.voided_at)
  const totals = new Map<string, number>()
  for (const e of active) {
    const key = e.category || 'Uncategorized'
    totals.set(key, (totals.get(key) ?? 0) + e.amount)
  }
  const grandTotal = active.reduce((sum, e) => sum + e.amount, 0)
  return Array.from(totals, ([category, total]) => ({ category, total, percent: grandTotal > 0 ? (total / grandTotal) * 100 : 0 })).sort((a, b) => b.total - a.total)
}

function paidByLabel(e: Expense, flatsById: Map<string, { flat_no: string }>): string {
  if (e.paid_by !== 'resident') return 'Association'
  const flat = e.resident_flat_id ? flatsById.get(e.resident_flat_id) : undefined
  return flat ? `Flat ${flat.flat_no}` : 'Resident'
}

type ExpenseStatusFilter = 'all' | 'recorded' | 'reversed'

function expensesFilterHref(q: string, status: ExpenseStatusFilter): string {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (status !== 'all') params.set('status', status)
  const qs = params.toString()
  return qs ? `/living/expenses?${qs}` : '/living/expenses'
}

export default async function LivingExpensesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { q: qParam, status: statusParam } = await searchParams
  const q = (qParam ?? '').trim()
  const status: ExpenseStatusFilter = statusParam === 'recorded' || statusParam === 'reversed' ? statusParam : 'all'

  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const current = await getCurrentMaintenancePeriod(supabase, apartment.id)
  const [categories, flats] = await Promise.all([getExpenseCategories(supabase, apartment.id), getFlats(supabase, apartment.id)])
  const expenses = current ? await getExpensesForPeriod(supabase, current.id) : []
  const totalExpenses = sumExpenses(expenses)
  const totalMaintenanceBilled = current ? maintenanceGrandTotal(current.line_items) : 0
  const todayIso = new Date().toISOString().slice(0, 10)
  const flatsById = new Map(flats.map((f) => [f.id, f]))

  const qLower = q.toLowerCase()
  const visibleExpenses = expenses.filter((e) => {
    if (status === 'recorded' && e.voided_at) return false
    if (status === 'reversed' && !e.voided_at) return false
    if (qLower && !e.description.toLowerCase().includes(qLower) && !(e.category ?? '').toLowerCase().includes(qLower)) return false
    return true
  })

  // Maintenance line items never include tanker/Majeera spend — that's its own pool on the Water
  // page (living_water_supply_costs) — so comparing Maintenance billed alone against Actual expenses
  // (which DOES include Water Tankers/Majeera Water once synced) made Difference misleading. Fold
  // this month's water supply cost in too so the comparison is apples to apples.
  const month = monthKeyFor(new Date())
  const [supplyCost, tankerRates] = current
    ? await Promise.all([getWaterSupplyCost(supabase, apartment.id, month), getEffectiveTankerRates(supabase, apartment.id, month)])
    : [null, null]
  const totalWaterBilled = supplyCost ? (tankerRates ? tankerCostTotal(supplyCost, tankerRates) : 0) + majeeraCostTotal(supplyCost) : 0
  const totalBilled = totalMaintenanceBilled + totalWaterBilled
  const diff = round2(totalBilled - totalExpenses)
  const diffIsZero = Math.abs(diff) < 0.005

  const syncCandidates = current ? await computeSyncCandidates(supabase, apartment, current) : []
  const lastSyncedAt = expenses
    .filter((e) => e.source !== 'manual')
    .reduce((latest: string | null, e) => (!latest || e.created_at > latest ? e.created_at : latest), null as string | null)

  const categoryRows = categoryBreakdown(expenses)
  const attentionRow = categoryRows.find((r) => r.percent > 15 && /uncategorized|miscellaneous/i.test(r.category))

  const isStale = current ? current.period_end < todayIso : false
  const billingCycleLabel = current ? formatPeriodLabel(current.month, current.period_end) : ''

  const systemCategories = categories.filter((c) => c.apartment_id === null)
  const apartmentCategories = categories.filter((c) => c.apartment_id !== null)
  const [usageCounts, reimbursementsDue, outstandingReimbursements] = await Promise.all([
    getCategoryUsageCounts(supabase, apartment.id),
    getApartmentReimbursementsDue(supabase, apartment.id, flats),
    getOutstandingReimbursementExpenses(supabase, apartment.id, flats),
  ])

  const categoryOptionNames = Array.from(
    new Set([...apartmentCategories.filter((c) => c.is_active).map((c) => c.name), ...systemCategories.map((c) => c.name), ...(current?.line_items.map((i) => i.description) ?? [])])
  )

  return (
    <>
      <h1 className={theme.heading} style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>
        Expenses
      </h1>
      <p className={theme.muted} style={{ marginBottom: '1.5rem' }}>
        What&rsquo;s actually been spent — who spent it, who was paid, and whether it needs to be recovered from residents or
        reimbursed to one who funded it personally.
      </p>

      {!current ? (
        <div className={theme.card}>
          <p className={theme.muted}>Start a billing period on the Maintenance page first.</p>
        </div>
      ) : (
        <Tabs
          defaultTab={q || status !== 'all' ? 'expenses' : undefined}
          tabs={[
            {
              id: 'overview',
              label: 'Overview',
              content: (
                <>
                  <p className={theme.muted} style={{ marginBottom: '0.4rem' }}>
                    Recovery period: <strong style={{ color: 'var(--living-ink)' }}>{billingCycleLabel}</strong>
                  </p>
                  {isStale && (
                    <p className={theme.alert} style={{ marginBottom: '1rem' }}>
                      This period ended {new Date(current.period_end).toLocaleDateString('en-IN')} — start a new one on Maintenance
                      before recording new spend, or it keeps landing in this closed period.
                    </p>
                  )}

                  <div className={homeStyles.grid} style={{ marginBottom: '1.5rem' }}>
                    <div className={theme.card}>
                      <p className={theme.muted} style={{ marginBottom: '0.3rem' }}>
                        Billed to residents
                      </p>
                      <p className={theme.num} style={{ fontSize: '1.4rem' }}>
                        {formatCurrency(totalBilled)}
                      </p>
                      <p className={theme.muted} style={{ fontSize: '0.8rem', marginTop: '0.3rem' }}>
                        Maintenance {formatCurrency(totalMaintenanceBilled)} · Water {formatCurrency(totalWaterBilled)}
                      </p>
                    </div>
                    <div className={theme.card}>
                      <p className={theme.muted} style={{ marginBottom: '0.3rem' }}>
                        Actual expenses
                      </p>
                      <p className={theme.num} style={{ fontSize: '1.4rem' }}>
                        {formatCurrency(totalExpenses)}
                      </p>
                    </div>
                    <div className={theme.card}>
                      <p className={theme.muted} style={{ marginBottom: '0.3rem' }}>
                        Difference
                      </p>
                      <p className={diffIsZero ? theme.muted : diff > 0 ? theme.creditText : theme.warnText} style={{ fontSize: '1.4rem' }}>
                        {diffIsZero ? 'On Budget' : `${formatCurrency(Math.abs(diff))} ${diff > 0 ? 'Under' : 'Over'}`}
                      </p>
                    </div>
                  </div>

                  <div className={theme.card} style={{ marginBottom: '1.5rem' }}>
                    <h2 className={homeStyles.sectionTitle}>Sync Maintenance &amp; Water Expenses</h2>
                    <p className={theme.muted} style={{ marginBottom: '0.75rem' }}>
                      Pulls in this period&rsquo;s Maintenance line items and this month&rsquo;s <Link href="/living/water">Water</Link>{' '}
                      page tanker/Majeera costs as real expense entries. Safe to run more than once — already-synced items are
                      identified individually, never by category, so they&rsquo;re never duplicated.
                    </p>
                    {syncCandidates.length > 0 ? (
                      <div style={{ marginBottom: '1rem' }}>
                        <p className={theme.muted} style={{ marginBottom: '0.4rem' }}>
                          Will pull in:
                        </p>
                        <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                          {syncCandidates.map((row) => (
                            <li key={row.sourceRef} className={theme.muted}>
                              {row.category} — {formatCurrency(row.amount)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className={theme.muted} style={{ marginBottom: '1rem' }}>
                        Everything is already synced.
                      </p>
                    )}
                    <form action={syncMaintenanceWaterExpensesAction}>
                      <button type="submit" className={theme.buttonGhost} disabled={syncCandidates.length === 0}>
                        Sync Maintenance &amp; Water Expenses
                      </button>
                    </form>
                    {lastSyncedAt && (
                      <p className={theme.muted} style={{ marginTop: '0.6rem', fontSize: '0.8rem' }}>
                        Last synced: {formatActivityTimestamp(lastSyncedAt)}
                      </p>
                    )}
                  </div>

                  <div className={theme.card}>
                    <h2 className={homeStyles.sectionTitle}>By category</h2>
                    <div className={theme.tableScroll}>
                      <table className={theme.table}>
                        <thead>
                          <tr>
                            <th>Category</th>
                            <th className={theme.num}>Spent</th>
                            <th className={theme.num}>% of total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {categoryRows.map((row) => (
                            <tr key={row.category}>
                              <td>{row.category}</td>
                              <td className={theme.num}>{formatCurrency(row.total)}</td>
                              <td className={theme.num}>{row.percent.toFixed(1)}%</td>
                            </tr>
                          ))}
                          {categoryRows.length === 0 && (
                            <tr>
                              <td colSpan={3} className={theme.muted}>
                                Nothing recorded for this period yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    {attentionRow && (
                      <p className={theme.muted} style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>
                        {formatCurrency(attentionRow.total)} under {attentionRow.category} — consider categorising these expenses
                        for clearer reporting.
                      </p>
                    )}
                  </div>
                </>
              ),
            },
            {
              id: 'record',
              label: 'Record Expense',
              content: (
                <div className={theme.card}>
                  <RecordExpenseForm action={recordExpenseAction} flats={flats} categoryOptionNames={categoryOptionNames} todayIso={todayIso} />
                </div>
              ),
            },
            {
              id: 'expenses',
              label: 'Expenses',
              badge: expenses.length,
              content: (
                <>
                  <h2 className={homeStyles.sectionTitle}>Expense History</h2>
                  <div className={theme.filterBar}>
                    <form method="GET" className={theme.searchForm}>
                      <input type="hidden" name="status" value={status} />
                      <input type="search" name="q" defaultValue={q} placeholder="Search description / category" className={theme.searchInput} />
                      <button type="submit" className={theme.buttonGhost}>
                        Search
                      </button>
                    </form>
                    <Link href={expensesFilterHref(q, 'all')} className={status === 'all' ? theme.filterChipActive : theme.filterChip}>
                      All
                    </Link>
                    <Link href={expensesFilterHref(q, 'recorded')} className={status === 'recorded' ? theme.filterChipActive : theme.filterChip}>
                      Recorded
                    </Link>
                    <Link href={expensesFilterHref(q, 'reversed')} className={status === 'reversed' ? theme.filterChipActive : theme.filterChip}>
                      Reversed
                    </Link>
                  </div>
                  <div className={theme.card}>
                    <div className={theme.tableScroll}>
                      <table className={theme.table}>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Expense</th>
                            <th>Category</th>
                            <th>Paid By</th>
                            <th className={theme.num}>Amount</th>
                            <th>Status</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleExpenses.map((e) => (
                            <tr key={e.id} style={e.voided_at ? { opacity: 0.55 } : undefined}>
                              <td style={e.voided_at ? { textDecoration: 'line-through' } : undefined}>{new Date(e.expense_date).toLocaleDateString('en-IN')}</td>
                              <td style={e.voided_at ? { textDecoration: 'line-through' } : undefined}>{e.description}</td>
                              <td>{e.category ?? '—'}</td>
                              <td>{paidByLabel(e, flatsById)}</td>
                              <td className={theme.num}>{formatCurrency(e.amount)}</td>
                              <td>{e.voided_at ? 'Reversed' : 'Recorded'}</td>
                              <td>
                                <Link href={`/living/expenses/${e.id}`} className={theme.muted}>
                                  Details →
                                </Link>
                              </td>
                            </tr>
                          ))}
                          {visibleExpenses.length === 0 && (
                            <tr>
                              <td colSpan={7} className={theme.muted}>
                                {expenses.length === 0 ? 'No expenses recorded for this period yet.' : 'No expenses match this search/filter.'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ),
            },
            {
              id: 'reimbursements',
              label: 'Reimbursements',
              badge: outstandingReimbursements.length || undefined,
              content: (
                <>
                  <div className={theme.card} style={{ marginBottom: '1.5rem' }}>
                    <p className={theme.muted} style={{ marginBottom: '0.3rem' }}>
                      Association owes residents (total)
                    </p>
                    <p className={theme.num} style={{ fontSize: '1.4rem' }}>
                      {formatCurrency(reimbursementsDue.total)}
                    </p>
                    <p className={theme.muted} style={{ fontSize: '0.85rem', marginTop: '0.3rem' }}>
                      {reimbursementsDue.flatCount} flat{reimbursementsDue.flatCount === 1 ? '' : 's'} owed
                    </p>
                  </div>

                  <div className={theme.card} style={{ marginBottom: '1.5rem' }}>
                    <h2 className={homeStyles.sectionTitle}>Outstanding reimbursements</h2>
                    <p className={theme.muted} style={{ marginBottom: '1rem' }}>
                      An expense here and a settlement are never the same transaction — recording the expense is one accrual
                      event, settling it below is a later payout against that existing liability, never counted as spend twice.
                    </p>
                    <div className={theme.tableScroll}>
                      <table className={theme.table}>
                        <thead>
                          <tr>
                            <th>Flat</th>
                            <th>Resident</th>
                            <th>Expense</th>
                            <th className={theme.num}>Amount</th>
                            <th className={theme.num}>Settled</th>
                            <th className={theme.num}>Remaining</th>
                            <th>Date</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {outstandingReimbursements.map((row) => (
                            <tr key={row.expense.id}>
                              <td>Flat {row.flat.flat_no}</td>
                              <td>{row.flat.owner_name ?? '—'}</td>
                              <td>
                                <Link href={`/living/expenses/${row.expense.id}`}>{row.expense.description}</Link>
                              </td>
                              <td className={theme.num}>{formatCurrency(row.expense.amount)}</td>
                              <td className={theme.num}>{formatCurrency(row.settled)}</td>
                              <td className={theme.num}>{formatCurrency(row.remaining)}</td>
                              <td>{new Date(row.expense.expense_date).toLocaleDateString('en-IN')}</td>
                              <td>
                                <Link href={`/living/billing/ledgers/${row.flat.id}`} className={theme.muted}>
                                  View Ledger
                                </Link>
                              </td>
                            </tr>
                          ))}
                          {outstandingReimbursements.length === 0 && (
                            <tr>
                              <td colSpan={8} className={theme.muted}>
                                Nothing outstanding.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {outstandingReimbursements.length > 0 && (
                    <div className={theme.card}>
                      <h2 className={homeStyles.sectionTitle}>Settle a reimbursement</h2>
                      <form action={settleReimbursementAction} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                        <div className={theme.field} style={{ marginBottom: 0, flex: 2, minWidth: '16rem' }}>
                          <label className={theme.label} htmlFor="expense_id">
                            Expense
                          </label>
                          <select id="expense_id" name="expense_id" className={theme.select} required defaultValue="">
                            <option value="" disabled>
                              — choose an expense —
                            </option>
                            {outstandingReimbursements.map((row) => (
                              <option key={row.expense.id} value={row.expense.id}>
                                Flat {row.flat.flat_no} — {row.expense.description} ({formatCurrency(row.remaining)} left)
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className={theme.field} style={{ marginBottom: 0, minWidth: '12rem' }}>
                          <label className={theme.label} htmlFor="settlement_type">
                            Settle by
                          </label>
                          <select id="settlement_type" name="settlement_type" className={theme.select} defaultValue="cash">
                            <option value="cash">Reimburse Resident (cash)</option>
                            <option value="bill_adjustment">Adjust Against Bill</option>
                          </select>
                        </div>
                        <div className={theme.field} style={{ marginBottom: 0 }}>
                          <label className={theme.label} htmlFor="settle_amount">
                            Amount
                          </label>
                          <input id="settle_amount" name="amount" type="number" step="0.01" min="0.01" className={theme.input} required />
                        </div>
                        <div className={theme.field} style={{ marginBottom: 0, flex: 1, minWidth: '10rem' }}>
                          <label className={theme.label} htmlFor="settle_note">
                            Note (optional)
                          </label>
                          <input id="settle_note" name="note" className={theme.input} />
                        </div>
                        <button type="submit" className={theme.button}>
                          Record settlement
                        </button>
                      </form>
                    </div>
                  )}
                </>
              ),
            },
            {
              id: 'categories',
              label: 'Categories',
              content: (
                <>
                  <div className={theme.card} style={{ marginBottom: '1.5rem' }}>
                    <h2 className={homeStyles.sectionTitle}>System Categories</h2>
                    <p className={theme.muted} style={{ marginBottom: '0.75rem' }}>
                      Provided by Nivenxa and shared across every apartment on the platform — always available on Record Expense,
                      not editable here.
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {systemCategories.map((c) => (
                        <span key={c.id} className={theme.pill}>
                          {c.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className={theme.card}>
                    <h2 className={homeStyles.sectionTitle}>{apartment.name} Categories</h2>
                    <p className={theme.muted} style={{ marginBottom: '1rem' }}>
                      Your own categories, only visible to this apartment — for expenses that aren&rsquo;t already a Maintenance
                      line item or one of the system categories above.
                    </p>
                    <form action={addExpenseCategoryAction} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', marginBottom: '1.25rem' }}>
                      <div className={theme.field} style={{ marginBottom: 0, flex: 1, minWidth: '16rem' }}>
                        <label className={theme.label} htmlFor="name">
                          Category name
                        </label>
                        <input id="name" name="name" className={theme.input} placeholder="e.g. Ganesh Festival Decorations" required />
                      </div>
                      <button type="submit" className={theme.button}>
                        <MaterialIcon name="add" size={16} style={{ marginRight: '0.3rem' }} />
                        Add
                      </button>
                    </form>

                    <div className={theme.tableScroll}>
                      <table className={theme.table}>
                        <thead>
                          <tr>
                            <th>Category</th>
                            <th className={theme.num}>Used by</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {apartmentCategories.map((c) => (
                            <tr key={c.id}>
                              <td>
                                {c.name}
                                {!c.is_active && <span className={theme.muted}> · inactive</span>}
                              </td>
                              <td className={theme.num}>{usageCounts.get(c.name) ?? 0}</td>
                              <td>
                                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', justifyContent: 'flex-end' }}>
                                  <form action={renameExpenseCategoryAction.bind(null, c.id)} style={{ display: 'flex', gap: '0.3rem' }}>
                                    <input type="hidden" name="old_name" value={c.name} />
                                    <input name="new_name" defaultValue={c.name} className={theme.input} style={{ width: '9rem' }} />
                                    <button type="submit" className={theme.iconButton} title="Rename">
                                      <MaterialIcon name="edit" size={18} />
                                    </button>
                                  </form>
                                  <form action={toggleExpenseCategoryActiveAction.bind(null, c.id, !c.is_active)}>
                                    <button type="submit" className={theme.iconButton} title={c.is_active ? 'Deactivate' : 'Reactivate'}>
                                      <MaterialIcon name={c.is_active ? 'visibility_off' : 'visibility'} size={18} />
                                    </button>
                                  </form>
                                  <form>
                                    <ConfirmSubmitButton
                                      formAction={deleteExpenseCategoryAction.bind(null, c.id, c.name)}
                                      confirmMessage={`Delete category "${c.name}"? Only works if it isn't used by any expense yet.`}
                                      className={theme.iconButtonDanger}
                                      title="Delete category"
                                    >
                                      <MaterialIcon name="delete" size={18} />
                                    </ConfirmSubmitButton>
                                  </form>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {apartmentCategories.length === 0 && (
                            <tr>
                              <td colSpan={3} className={theme.muted}>
                                No categories yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
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
