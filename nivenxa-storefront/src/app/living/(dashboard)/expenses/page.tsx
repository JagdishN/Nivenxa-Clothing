import Link from 'next/link'
import { requireMembership } from '@/lib/living/auth'
import { setLivingError, setLivingNotice } from '@/lib/living/flash'
import { maintenanceGrandTotal, majeeraCostTotal, tankerCostTotal } from '@/lib/living/billing'
import { formatCurrency, formatPaymentMethod, formatPeriodLabel, monthKeyFor } from '@/lib/living/format'
import { getCurrentMaintenancePeriod, getEffectiveTankerRates, getExpenseCategories, getExpensesForPeriod, getWaterSupplyCost, sumExpenses } from '@/lib/living/queries'
import type { Expense, PaymentMethod } from '@/lib/living/types'
import ConfirmSubmitButton from '../ConfirmSubmitButton'
import MaterialIcon from '../../MaterialIcon'
import theme from '../../LivingTheme.module.scss'
import homeStyles from '../Home.module.scss'
import Tabs from '../Tabs'

const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'upi', 'bank_transfer', 'cheque', 'other']

async function recordExpenseAction(formData: FormData) {
  'use server'
  const { supabase, apartment, userId } = await requireMembership(['admin', 'treasurer'])
  const current = await getCurrentMaintenancePeriod(supabase, apartment.id)
  if (!current) {
    await setLivingError('Start a billing period on the Maintenance page first.')
    return
  }

  const description = String(formData.get('description') ?? '').trim()
  const amount = Number(formData.get('amount') ?? 0)
  const expenseDate = String(formData.get('expense_date') ?? '').trim()
  const category = String(formData.get('category') ?? '').trim()
  const paidTo = String(formData.get('paid_to') ?? '').trim()
  const method = String(formData.get('method') ?? 'other')
  const referenceNote = String(formData.get('reference_note') ?? '').trim()
  const includeInNextCycle = formData.get('include_in_next_cycle') === 'on'
  const splitAcrossMonths = formData.get('split_across_months') === 'on'

  if (!description) {
    await setLivingError('Describe what this expense was for.')
    return
  }
  if (!amount || amount <= 0) {
    await setLivingError('Enter an amount greater than zero.')
    return
  }
  if (!expenseDate) {
    await setLivingError('Pick a date.')
    return
  }
  if (!PAYMENT_METHODS.includes(method as PaymentMethod)) {
    await setLivingError('Invalid payment method.')
    return
  }

  let carryForwardMonths: number | null = null
  if (splitAcrossMonths) {
    const months = Math.floor(Number(formData.get('split_months') ?? 0))
    if (!months || months < 1) {
      await setLivingError('Enter how many months to split this expense across.')
      return
    }
    carryForwardMonths = months
  } else if (includeInNextCycle) {
    carryForwardMonths = 1
  }

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
    carry_forward_months: carryForwardMonths,
    carry_forward_remaining: carryForwardMonths,
    recorded_by: userId,
  })
  if (error) {
    await setLivingError(error.message)
    return
  }
  await setLivingNotice('Expense recorded.')
}

const WATER_TANKER_CATEGORY = 'Water Tankers'
const MAJEERA_CATEGORY = 'Majeera Water'

/**
 * Backfills Expense rows from money already billed elsewhere but never
 * separately logged as an Expense transaction:
 *  - the current period's own Maintenance line items
 *  - this calendar month's Water page supply costs (tankers + Majeera),
 *    which live in their own table (living_water_supply_costs) and were
 *    otherwise invisible here
 * Skips anything whose category (or description, if it has no category)
 * already matches an existing expense, so this is safe to run more than
 * once without creating duplicates.
 */
async function importExpensesFromMaintenanceAction() {
  'use server'
  const { supabase, apartment, userId } = await requireMembership(['admin', 'treasurer'])
  const current = await getCurrentMaintenancePeriod(supabase, apartment.id)
  if (!current) {
    await setLivingError('Start a billing period on the Maintenance page first.')
    return
  }

  const month = monthKeyFor(new Date())
  const [existing, supplyCost, tankerRates] = await Promise.all([
    getExpensesForPeriod(supabase, current.id),
    getWaterSupplyCost(supabase, apartment.id, month),
    getEffectiveTankerRates(supabase, apartment.id, month),
  ])
  const existingLabels = new Set(existing.map((e) => (e.category || e.description).trim().toLowerCase()))

  const rows: { category: string; description: string; amount: number }[] = current.line_items
    .filter((item) => item.amount > 0 && !existingLabels.has(item.description.trim().toLowerCase()))
    .map((item) => ({ category: item.description, description: item.description, amount: item.amount }))

  if (supplyCost) {
    const tankerAmount = tankerRates ? tankerCostTotal(supplyCost, tankerRates) : 0
    if (tankerAmount > 0 && !existingLabels.has(WATER_TANKER_CATEGORY.toLowerCase())) {
      rows.push({ category: WATER_TANKER_CATEGORY, description: WATER_TANKER_CATEGORY, amount: tankerAmount })
    }
    const majeeraAmount = majeeraCostTotal(supplyCost)
    if (majeeraAmount > 0 && !existingLabels.has(MAJEERA_CATEGORY.toLowerCase())) {
      rows.push({ category: MAJEERA_CATEGORY, description: MAJEERA_CATEGORY, amount: majeeraAmount })
    }
  }

  if (rows.length === 0) {
    await setLivingError('Nothing to pull in — everything already has a matching expense.')
    return
  }

  const { error } = await supabase.from('living_expenses').insert(
    rows.map((row) => ({
      apartment_id: apartment.id,
      maintenance_month_id: current.id,
      expense_date: current.month,
      category: row.category,
      description: row.description,
      amount: row.amount,
      method: 'other',
      reference_note: 'Pulled from Maintenance / Water',
      recorded_by: userId,
    }))
  )
  if (error) {
    await setLivingError(error.message)
    return
  }
  await setLivingNotice(`Pulled in ${rows.length} item${rows.length === 1 ? '' : 's'} as expenses.`)
}

async function deleteExpenseAction(id: string) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const { error } = await supabase.from('living_expenses').delete().eq('id', id).eq('apartment_id', apartment.id)
  if (error) {
    await setLivingError(error.message)
    return
  }
  await setLivingNotice('Expense removed.')
}

async function addExpenseCategoriesAction(formData: FormData) {
  'use server'
  const { supabase, userId } = await requireMembership(['admin', 'treasurer'])
  const raw = String(formData.get('names') ?? '')
  const requested = Array.from(new Set(raw.split(/[,\n]/).map((n) => n.trim()).filter(Boolean)))
  if (requested.length === 0) {
    await setLivingError('Enter at least one category name.')
    return
  }

  const existing = await getExpenseCategories(supabase)
  const existingLower = new Set(existing.map((c) => c.name.toLowerCase()))
  const toAdd = requested.filter((n) => !existingLower.has(n.toLowerCase()))

  if (toAdd.length === 0) {
    await setLivingError('Those categories already exist.')
    return
  }

  const { error } = await supabase.from('living_expense_categories').insert(toAdd.map((name) => ({ name, created_by: userId })))
  if (error) {
    await setLivingError(error.message)
    return
  }
  const skipped = requested.length - toAdd.length
  await setLivingNotice(
    skipped > 0
      ? `Added ${toAdd.length} categor${toAdd.length === 1 ? 'y' : 'ies'} (${skipped} already existed).`
      : `Added ${toAdd.length} categor${toAdd.length === 1 ? 'y' : 'ies'}.`
  )
}

async function deleteExpenseCategoryAction(id: string) {
  'use server'
  const { supabase } = await requireMembership(['admin', 'treasurer'])
  const { error } = await supabase.from('living_expense_categories').delete().eq('id', id)
  if (error) {
    await setLivingError(error.message)
    return
  }
  await setLivingNotice('Removed.')
}

/** Whether this expense carries forward into future bill cycles at all — the
 * scannable Yes/No a grid column needs — plus the split/remaining detail as
 * a secondary line, so "split over 3 months, 2 left" isn't lost, just no
 * longer the FIRST thing the column says. */
function carryForwardLabel(e: Expense): { yesNo: 'Yes' | 'No'; detail: string | null } {
  if (!e.carry_forward_months) return { yesNo: 'No', detail: null }
  if (e.carry_forward_months === 1) return { yesNo: 'Yes', detail: e.carry_forward_remaining ? null : 'Applied' }
  const remaining = e.carry_forward_remaining ?? 0
  return {
    yesNo: 'Yes',
    detail: remaining > 0 ? `Split over ${e.carry_forward_months} mo. (${remaining} left)` : `Split over ${e.carry_forward_months} mo. (done)`,
  }
}

function categoryBreakdown(expenses: Expense[]): { category: string; total: number }[] {
  const totals = new Map<string, number>()
  for (const e of expenses) {
    const key = e.category || 'Uncategorized'
    totals.set(key, (totals.get(key) ?? 0) + e.amount)
  }
  return Array.from(totals, ([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total)
}

export default async function LivingExpensesPage() {
  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const current = await getCurrentMaintenancePeriod(supabase, apartment.id)
  const categories = await getExpenseCategories(supabase)
  const expenses = current ? await getExpensesForPeriod(supabase, current.id) : []
  const totalExpenses = sumExpenses(expenses)
  const totalMaintenanceBilled = current ? maintenanceGrandTotal(current.line_items) : 0
  const todayIso = new Date().toISOString().slice(0, 10)

  // Maintenance line items never include tanker/Majeera spend — that's its
  // own pool on the Water page (living_water_supply_costs) — so comparing
  // "Maintenance billed" alone against Actual expenses (which DOES include
  // Water Tankers/Majeera Water once pulled in) made Difference go negative
  // even when nothing was actually over budget. Fold this month's water
  // supply cost in too so the comparison is apples to apples.
  const month = monthKeyFor(new Date())
  const [supplyCost, tankerRates] = current
    ? await Promise.all([getWaterSupplyCost(supabase, apartment.id, month), getEffectiveTankerRates(supabase, apartment.id, month)])
    : [null, null]
  const totalWaterBilled = supplyCost ? (tankerRates ? tankerCostTotal(supplyCost, tankerRates) : 0) + majeeraCostTotal(supplyCost) : 0
  const totalBilled = totalMaintenanceBilled + totalWaterBilled

  // Every current Maintenance line item is selectable as a category too, on
  // top of the shared master list — no need to re-type "Watchman Salary" as
  // a category when it's already a line item description. Water Tankers and
  // Majeera Water are always offered too, even though they live in their own
  // table (living_water_supply_costs) rather than as a line item.
  const maintenanceCategoryNames = current ? current.line_items.map((item) => item.description) : []
  const categoryOptionNames = Array.from(
    new Set([...categories.map((c) => c.name), ...maintenanceCategoryNames, WATER_TANKER_CATEGORY, MAJEERA_CATEGORY])
  )
  const billingCycleLabel = current ? formatPeriodLabel(current.month, current.period_end) : ''

  return (
    <>
      <h1 className={theme.heading} style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>
        Expenses
      </h1>
      <p className={theme.muted} style={{ marginBottom: '1.5rem' }}>
        What&rsquo;s actually been spent for the current billing period — a real transaction log (date, category, who was paid, how),
        separate from the budgeted line items on the Maintenance page.
      </p>

      {!current ? (
        <div className={theme.card}>
          <p className={theme.muted}>Start a billing period on the Maintenance page first.</p>
        </div>
      ) : (
        <Tabs
          tabs={[
            {
              id: 'overview',
              label: 'Overview',
              content: (
                <>
                  <p className={theme.muted} style={{ marginBottom: '0.75rem' }}>
                    Billing cycle: <strong style={{ color: 'var(--living-ink)' }}>{billingCycleLabel}</strong>
                  </p>

                  <div className={homeStyles.grid} style={{ marginBottom: '1.5rem' }}>
                    <div className={theme.card}>
                      <p className={theme.muted} style={{ marginBottom: '0.3rem' }}>
                        Maintenance billed (this period)
                      </p>
                      <p className={theme.num} style={{ fontSize: '1.4rem' }}>
                        {formatCurrency(totalMaintenanceBilled)}
                      </p>
                    </div>
                    <div className={theme.card}>
                      <p className={theme.muted} style={{ marginBottom: '0.3rem' }}>
                        Water billed (tankers + Majeera)
                      </p>
                      <p className={theme.num} style={{ fontSize: '1.4rem' }}>
                        {formatCurrency(totalWaterBilled)}
                      </p>
                    </div>
                    <div className={theme.card}>
                      <p className={theme.muted} style={{ marginBottom: '0.3rem' }}>
                        Actual expenses recorded
                      </p>
                      <p className={theme.num} style={{ fontSize: '1.4rem' }}>
                        {formatCurrency(totalExpenses)}
                      </p>
                    </div>
                    <div className={theme.card}>
                      <p className={theme.muted} style={{ marginBottom: '0.3rem' }}>
                        Difference
                      </p>
                      <p className={totalBilled - totalExpenses >= 0 ? theme.creditText : theme.warnText} style={{ fontSize: '1.4rem' }}>
                        {formatCurrency(totalBilled - totalExpenses)}
                      </p>
                    </div>
                  </div>

                  <div className={theme.card} style={{ marginBottom: '1.5rem' }}>
                    <h2 className={homeStyles.sectionTitle}>Pull in from Maintenance &amp; Water</h2>
                    <p className={theme.muted} style={{ marginBottom: '1rem' }}>
                      Already billed a Maintenance line item, or entered this month&rsquo;s tanker/Majeera costs on the{' '}
                      <Link href="/living/water">Water</Link> page, but never logged it here separately? Pull all of it in as expenses
                      in one go — anything that already has a matching expense (by category) is skipped, so this is safe to run again
                      later.
                    </p>
                    <form action={importExpensesFromMaintenanceAction}>
                      <button type="submit" className={theme.buttonGhost}>
                        Pull in Maintenance &amp; Water costs
                      </button>
                    </form>
                  </div>

                  <div className={theme.card}>
                    <h2 className={homeStyles.sectionTitle}>By category</h2>
                    <div className={theme.tableScroll}>
                      <table className={theme.table}>
                        <thead>
                          <tr>
                            <th>Category</th>
                            <th className={theme.num}>Spent</th>
                          </tr>
                        </thead>
                        <tbody>
                          {categoryBreakdown(expenses).map((row) => (
                            <tr key={row.category}>
                              <td>{row.category}</td>
                              <td className={theme.num}>{formatCurrency(row.total)}</td>
                            </tr>
                          ))}
                          {expenses.length === 0 && (
                            <tr>
                              <td colSpan={2} className={theme.muted}>
                                Nothing recorded for this period yet.
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
              id: 'record',
              label: 'Record Expense',
              content: (
                <div className={theme.card}>
                  <form action={recordExpenseAction} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div className={theme.field} style={{ marginBottom: 0, flex: 2, minWidth: '12rem' }}>
                      <label className={theme.label} htmlFor="description">
                        Description
                      </label>
                      <input id="description" name="description" className={theme.input} placeholder="e.g. Diesel for generator" required />
                    </div>
                    <div className={theme.field} style={{ marginBottom: 0, minWidth: '9rem' }}>
                      <label className={theme.label} htmlFor="category">
                        Category
                      </label>
                      <select id="category" name="category" className={theme.select} defaultValue="">
                        <option value="">— none —</option>
                        {categoryOptionNames.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className={theme.field} style={{ marginBottom: 0 }}>
                      <label className={theme.label} htmlFor="amount">
                        Amount
                      </label>
                      <input id="amount" name="amount" type="number" step="0.01" min="0.01" className={theme.input} required />
                    </div>
                    <div className={theme.field} style={{ marginBottom: 0 }}>
                      <label className={theme.label} htmlFor="expense_date">
                        Date
                      </label>
                      <input id="expense_date" name="expense_date" type="date" className={theme.input} defaultValue={todayIso} required />
                    </div>
                    <div className={theme.field} style={{ marginBottom: 0, minWidth: '9rem' }}>
                      <label className={theme.label} htmlFor="paid_to">
                        Paid to
                      </label>
                      <input id="paid_to" name="paid_to" className={theme.input} placeholder="Vendor / person" />
                    </div>
                    <div className={theme.field} style={{ marginBottom: 0 }}>
                      <label className={theme.label} htmlFor="method">
                        Method
                      </label>
                      <select id="method" name="method" className={theme.select} defaultValue="cash">
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m} value={m}>
                            {formatPaymentMethod(m)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className={theme.field} style={{ marginBottom: 0, flex: 1, minWidth: '10rem' }}>
                      <label className={theme.label} htmlFor="reference_note">
                        Reference (optional)
                      </label>
                      <input id="reference_note" name="reference_note" className={theme.input} placeholder="Receipt / invoice no." />
                    </div>

                    <div className={theme.field} style={{ marginBottom: 0, width: '100%', borderTop: '1px solid var(--living-rule)', paddingTop: '0.75rem' }}>
                      <p className={theme.muted} style={{ marginBottom: '0.5rem' }}>
                        Should this feed into future Maintenance bills automatically? Leave both unchecked for a one-off expense that
                        shouldn&rsquo;t recur.
                      </p>
                      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                        <label className={theme.toggleRow}>
                          <input type="checkbox" name="include_in_next_cycle" className={theme.toggleInput} />
                          <span className={theme.toggleTrack}>
                            <span className={theme.toggleThumb} />
                          </span>
                          <span className={theme.label} style={{ margin: 0 }}>
                            Include in next bill cycle
                          </span>
                        </label>
                        <div>
                          <label className={theme.toggleRow}>
                            <input type="checkbox" name="split_across_months" className={theme.toggleInput} />
                            <span className={theme.toggleTrack}>
                              <span className={theme.toggleThumb} />
                            </span>
                            <span className={theme.label} style={{ margin: 0 }}>
                              Split across months
                            </span>
                          </label>
                          <input
                            name="split_months"
                            type="number"
                            min="2"
                            step="1"
                            className={theme.input}
                            style={{ width: '7rem', marginTop: '0.4rem' }}
                            placeholder="No. of months"
                          />
                        </div>
                      </div>
                    </div>

                    <button type="submit" className={theme.button}>
                      Record expense
                    </button>
                  </form>
                </div>
              ),
            },
            {
              id: 'log',
              label: 'Log',
              badge: expenses.length,
              content: (
                <div className={theme.card}>
                  <div className={theme.tableScroll}>
                    <table className={theme.table}>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Description</th>
                          <th>Category</th>
                          <th>Billing cycle</th>
                          <th>Paid to</th>
                          <th className={theme.num}>Amount</th>
                          <th>Method</th>
                          <th>Include in next cycle</th>
                          <th>Reference</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenses.map((e) => {
                          const carryForward = carryForwardLabel(e)
                          return (
                          <tr key={e.id}>
                            <td>{new Date(e.expense_date).toLocaleDateString('en-IN')}</td>
                            <td>{e.description}</td>
                            <td>{e.category ?? '—'}</td>
                            <td>{billingCycleLabel}</td>
                            <td>{e.paid_to ?? '—'}</td>
                            <td className={theme.num}>{formatCurrency(e.amount)}</td>
                            <td>{formatPaymentMethod(e.method)}</td>
                            <td>
                              {carryForward.yesNo}
                              {carryForward.detail && <span className={theme.muted}> · {carryForward.detail}</span>}
                            </td>
                            <td>{e.reference_note ?? '—'}</td>
                            <td>
                              <form>
                                <ConfirmSubmitButton
                                  formAction={deleteExpenseAction.bind(null, e.id)}
                                  confirmMessage={`Delete this expense — "${e.description}" (${formatCurrency(e.amount)})?`}
                                  className={theme.iconButtonDanger}
                                  title="Delete this expense"
                                >
                                  <MaterialIcon name="delete" size={20} />
                                </ConfirmSubmitButton>
                              </form>
                            </td>
                          </tr>
                          )
                        })}
                        {expenses.length === 0 && (
                          <tr>
                            <td colSpan={10} className={theme.muted}>
                              No expenses recorded for this period yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ),
            },
            {
              id: 'categories',
              label: 'Categories',
              badge: categories.length,
              content: (
                <>
                  <div className={theme.card} style={{ marginBottom: '1.5rem' }}>
                    <h2 className={homeStyles.sectionTitle}>Add categories</h2>
                    <p className={theme.muted} style={{ marginBottom: '1rem' }}>
                      Every current Maintenance line item is already selectable as a category on the Record Expense tab — add ones
                      here only for expenses that aren&rsquo;t a line item (e.g. a one-off purchase). Shared across every apartment on
                      the platform, so anything added here shows up for everyone. Comma or newline separated, add as many as you like
                      at once.
                    </p>
                    <form action={addExpenseCategoriesAction} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                      <div className={theme.field} style={{ marginBottom: 0, flex: 1, minWidth: '16rem' }}>
                        <label className={theme.label} htmlFor="names">
                          Category names
                        </label>
                        <input id="names" name="names" className={theme.input} placeholder="Salaries, Utilities, Repairs" required />
                      </div>
                      <button type="submit" className={theme.button}>
                        <MaterialIcon name="add" size={16} style={{ marginRight: "0.3rem" }} />Add
                      </button>
                    </form>
                  </div>

                  <div className={theme.card}>
                    <div className={theme.tableScroll}>
                      <table className={theme.table}>
                        <thead>
                          <tr>
                            <th>Category</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {categories.map((c) => (
                            <tr key={c.id}>
                              <td>{c.name}</td>
                              <td>
                                <form>
                                  <ConfirmSubmitButton
                                    formAction={deleteExpenseCategoryAction.bind(null, c.id)}
                                    confirmMessage={`Delete category "${c.name}"?`}
                                    className={theme.iconButtonDanger}
                                    title="Delete category"
                                  >
                                    <MaterialIcon name="delete" size={20} />
                                  </ConfirmSubmitButton>
                                </form>
                              </td>
                            </tr>
                          ))}
                          {categories.length === 0 && (
                            <tr>
                              <td colSpan={2} className={theme.muted}>
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
