import { notFound } from 'next/navigation'
import { requireMembership } from '@/lib/living/auth'
import { setLivingError, setLivingNotice } from '@/lib/living/flash'
import { formatCurrency, formatPaymentMethod } from '@/lib/living/format'
import { getBillableFlats, getEvent, getEventCollections, getEventExpenses, getFlats, sumEventCollections, sumEventExpenses } from '@/lib/living/queries'
import type { PaymentMethod } from '@/lib/living/types'
import ConfirmSubmitButton from '../../ConfirmSubmitButton'
import RecordCollectionsForm from './RecordCollectionsForm'
import MaterialIcon from '../../../MaterialIcon'
import theme from '../../../LivingTheme.module.scss'
import homeStyles from '../../Home.module.scss'
import Tabs from '../../Tabs'

const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'upi', 'bank_transfer', 'cheque', 'other']

/**
 * One row per billable flat, only for the ones an Admin actually filled an
 * amount in for (rows left at 0/blank are silently skipped, not errored —
 * not every flat necessarily pays into every event). Date and reference
 * note are shared across the whole batch; amount and method are per-flat.
 */
async function recordCollectionsForFlatsAction(eventId: string, formData: FormData) {
  'use server'
  const { supabase, apartment, userId } = await requireMembership(['admin', 'treasurer'])
  const flats = getBillableFlats(await getFlats(supabase, apartment.id))

  const collectedDate = String(formData.get('collected_date') ?? '').trim()
  if (!collectedDate) {
    await setLivingError('Pick a date.')
    return
  }
  const referenceNote = String(formData.get('reference_note') ?? '').trim()

  const rows = flats
    .map((flat) => {
      const amount = Number(formData.get(`amount_${flat.id}`) ?? 0)
      const method = String(formData.get(`method_${flat.id}`) ?? 'cash')
      return { flat, amount, method: PAYMENT_METHODS.includes(method as PaymentMethod) ? method : 'cash' }
    })
    .filter((row) => row.amount > 0)

  if (rows.length === 0) {
    await setLivingError('Enter an amount for at least one flat.')
    return
  }

  const { error } = await supabase.from('living_event_collections').insert(
    rows.map((row) => ({
      apartment_id: apartment.id,
      event_id: eventId,
      flat_id: row.flat.id,
      amount: row.amount,
      collected_date: collectedDate,
      method: row.method,
      reference_note: referenceNote || null,
      recorded_by: userId,
    }))
  )
  if (error) {
    await setLivingError(error.message)
    return
  }
  await setLivingNotice(`Recorded collections for ${rows.length} flat${rows.length === 1 ? '' : 's'}.`)
}

async function recordCollectionAction(eventId: string, formData: FormData) {
  'use server'
  const { supabase, apartment, userId } = await requireMembership(['admin', 'treasurer'])

  const amount = Number(formData.get('amount') ?? 0)
  const collectedDate = String(formData.get('collected_date') ?? '').trim()
  const contributorName = String(formData.get('contributor_name') ?? '').trim()
  const flatId = String(formData.get('flat_id') ?? '').trim()
  const method = String(formData.get('method') ?? 'cash')
  const referenceNote = String(formData.get('reference_note') ?? '').trim()

  if (!amount || amount <= 0) {
    await setLivingError('Enter an amount greater than zero.')
    return
  }
  if (!collectedDate) {
    await setLivingError('Pick a date.')
    return
  }
  if (!PAYMENT_METHODS.includes(method as PaymentMethod)) {
    await setLivingError('Invalid payment method.')
    return
  }

  const { error } = await supabase.from('living_event_collections').insert({
    apartment_id: apartment.id,
    event_id: eventId,
    amount,
    collected_date: collectedDate,
    contributor_name: contributorName || null,
    flat_id: flatId || null,
    method,
    reference_note: referenceNote || null,
    recorded_by: userId,
  })
  if (error) {
    await setLivingError(error.message)
    return
  }
  await setLivingNotice('Collection recorded.')
}

async function deleteCollectionAction(id: string) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const { error } = await supabase.from('living_event_collections').delete().eq('id', id).eq('apartment_id', apartment.id)
  if (error) {
    await setLivingError(error.message)
    return
  }
  await setLivingNotice('Collection removed.')
}

async function recordExpenseAction(eventId: string, formData: FormData) {
  'use server'
  const { supabase, apartment, userId } = await requireMembership(['admin', 'treasurer'])

  const description = String(formData.get('description') ?? '').trim()
  const amount = Number(formData.get('amount') ?? 0)
  const expenseDate = String(formData.get('expense_date') ?? '').trim()
  const paidTo = String(formData.get('paid_to') ?? '').trim()
  const method = String(formData.get('method') ?? 'cash')
  const referenceNote = String(formData.get('reference_note') ?? '').trim()

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

  const { error } = await supabase.from('living_event_expenses').insert({
    apartment_id: apartment.id,
    event_id: eventId,
    description,
    amount,
    expense_date: expenseDate,
    paid_to: paidTo || null,
    method,
    reference_note: referenceNote || null,
    recorded_by: userId,
  })
  if (error) {
    await setLivingError(error.message)
    return
  }
  await setLivingNotice('Expense recorded.')
}

async function deleteExpenseAction(id: string) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const { error } = await supabase.from('living_event_expenses').delete().eq('id', id).eq('apartment_id', apartment.id)
  if (error) {
    await setLivingError(error.message)
    return
  }
  await setLivingNotice('Expense removed.')
}

export default async function LivingEventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const event = await getEvent(supabase, apartment.id, id)
  if (!event) notFound()

  const [collections, expenses, flats] = await Promise.all([
    getEventCollections(supabase, event.id),
    getEventExpenses(supabase, event.id),
    getFlats(supabase, apartment.id),
  ])
  const collected = sumEventCollections(collections)
  const spent = sumEventExpenses(expenses)
  const billableFlats = getBillableFlats(flats)
  const flatById = new Map(flats.map((f) => [f.id, f]))
  const todayIso = new Date().toISOString().slice(0, 10)
  const boundRecordCollectionsForFlats = recordCollectionsForFlatsAction.bind(null, event.id)
  const boundRecordCollection = recordCollectionAction.bind(null, event.id)
  const boundRecordExpense = recordExpenseAction.bind(null, event.id)

  return (
    <>
      <h1 className={theme.heading} style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>
        {event.name}
      </h1>
      <p className={theme.muted} style={{ marginBottom: '1.5rem' }}>
        {event.category ?? 'Uncategorized'}
        {event.event_date ? ` · ${new Date(event.event_date).toLocaleDateString('en-IN')}` : ''}
        {event.notes ? ` · ${event.notes}` : ''}
      </p>

      <Tabs
        tabs={[
          {
            id: 'overview',
            label: 'Overview',
            content: (
              <div className={homeStyles.grid}>
                <div className={theme.card}>
                  <p className={theme.muted} style={{ marginBottom: '0.3rem' }}>
                    Collected
                  </p>
                  <p className={theme.num} style={{ fontSize: '1.4rem' }}>
                    {formatCurrency(collected)}
                  </p>
                </div>
                <div className={theme.card}>
                  <p className={theme.muted} style={{ marginBottom: '0.3rem' }}>
                    Spent
                  </p>
                  <p className={theme.num} style={{ fontSize: '1.4rem' }}>
                    {formatCurrency(spent)}
                  </p>
                </div>
                <div className={theme.card}>
                  <p className={theme.muted} style={{ marginBottom: '0.3rem' }}>
                    Net
                  </p>
                  <p className={collected - spent >= 0 ? theme.creditText : theme.warnText} style={{ fontSize: '1.4rem' }}>
                    {formatCurrency(collected - spent)}
                  </p>
                </div>
              </div>
            ),
          },
          {
            id: 'collections',
            label: 'Collections',
            badge: collections.length,
            content: (
              <>
                <RecordCollectionsForm flats={billableFlats.map((f) => ({ id: f.id, flat_no: f.flat_no }))} action={boundRecordCollectionsForFlats} defaultDate={todayIso} />

                <div className={theme.card} style={{ marginBottom: '1.5rem' }}>
                  <h2 className={homeStyles.sectionTitle}>Add a single contribution</h2>
                  <p className={theme.muted} style={{ marginBottom: '1rem' }}>
                    For a one-off contribution — from a specific flat, or from someone outside the apartment (a shop, a well-wisher).
                  </p>
                  <form action={boundRecordCollection} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div className={theme.field} style={{ marginBottom: 0 }}>
                      <label className={theme.label} htmlFor="amount">
                        Amount
                      </label>
                      <input id="amount" name="amount" type="number" step="0.01" min="0.01" className={theme.input} required />
                    </div>
                    <div className={theme.field} style={{ marginBottom: 0 }}>
                      <label className={theme.label} htmlFor="collected_date">
                        Date
                      </label>
                      <input id="collected_date" name="collected_date" type="date" className={theme.input} defaultValue={todayIso} required />
                    </div>
                    <div className={theme.field} style={{ marginBottom: 0, minWidth: '9rem' }}>
                      <label className={theme.label} htmlFor="flat_id">
                        Flat (optional)
                      </label>
                      <select id="flat_id" name="flat_id" className={theme.select} defaultValue="">
                        <option value="">— none —</option>
                        {flats.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.flat_no}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className={theme.field} style={{ marginBottom: 0, flex: 1, minWidth: '10rem' }}>
                      <label className={theme.label} htmlFor="contributor_name">
                        Contributor (optional)
                      </label>
                      <input id="contributor_name" name="contributor_name" className={theme.input} placeholder="Name, if not a flat" />
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
                      <input id="reference_note" name="reference_note" className={theme.input} placeholder="Receipt no." />
                    </div>
                    <button type="submit" className={theme.button}>
                      Record collection
                    </button>
                  </form>
                </div>

                <div className={theme.card}>
                  <div className={theme.tableScroll}>
                    <table className={theme.table}>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>From</th>
                          <th className={theme.num}>Amount</th>
                          <th>Method</th>
                          <th>Reference</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {collections.map((c) => (
                          <tr key={c.id}>
                            <td>{new Date(c.collected_date).toLocaleDateString('en-IN')}</td>
                            <td>{c.flat_id ? `Flat ${flatById.get(c.flat_id)?.flat_no ?? '—'}` : c.contributor_name ?? '—'}</td>
                            <td className={theme.num}>{formatCurrency(c.amount)}</td>
                            <td>{formatPaymentMethod(c.method)}</td>
                            <td>{c.reference_note ?? '—'}</td>
                            <td>
                              <form>
                                <ConfirmSubmitButton
                                  formAction={deleteCollectionAction.bind(null, c.id)}
                                  confirmMessage={`Delete this collection (${formatCurrency(c.amount)})?`}
                                  className={theme.iconButtonDanger}
                                  title="Delete this collection"
                                >
                                  <MaterialIcon name="delete" size={20} />
                                </ConfirmSubmitButton>
                              </form>
                            </td>
                          </tr>
                        ))}
                        {collections.length === 0 && (
                          <tr>
                            <td colSpan={6} className={theme.muted}>
                              Nothing collected yet.
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
            id: 'expenses',
            label: 'Expenses',
            badge: expenses.length,
            content: (
              <>
                <div className={theme.card} style={{ marginBottom: '1.5rem' }}>
                  <h2 className={homeStyles.sectionTitle}>Record an expense</h2>
                  <form action={boundRecordExpense} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div className={theme.field} style={{ marginBottom: 0, flex: 2, minWidth: '12rem' }}>
                      <label className={theme.label} htmlFor="description">
                        Description
                      </label>
                      <input id="description" name="description" className={theme.input} placeholder="e.g. Decoration, Priest fees" required />
                    </div>
                    <div className={theme.field} style={{ marginBottom: 0 }}>
                      <label className={theme.label} htmlFor="expense_amount">
                        Amount
                      </label>
                      <input id="expense_amount" name="amount" type="number" step="0.01" min="0.01" className={theme.input} required />
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
                      <label className={theme.label} htmlFor="expense_method">
                        Method
                      </label>
                      <select id="expense_method" name="method" className={theme.select} defaultValue="cash">
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m} value={m}>
                            {formatPaymentMethod(m)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className={theme.field} style={{ marginBottom: 0, flex: 1, minWidth: '10rem' }}>
                      <label className={theme.label} htmlFor="expense_reference_note">
                        Reference (optional)
                      </label>
                      <input id="expense_reference_note" name="reference_note" className={theme.input} placeholder="Receipt / invoice no." />
                    </div>
                    <button type="submit" className={theme.button}>
                      Record expense
                    </button>
                  </form>
                </div>

                <div className={theme.card}>
                  <div className={theme.tableScroll}>
                    <table className={theme.table}>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Description</th>
                          <th>Paid to</th>
                          <th className={theme.num}>Amount</th>
                          <th>Method</th>
                          <th>Reference</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenses.map((e) => (
                          <tr key={e.id}>
                            <td>{new Date(e.expense_date).toLocaleDateString('en-IN')}</td>
                            <td>{e.description}</td>
                            <td>{e.paid_to ?? '—'}</td>
                            <td className={theme.num}>{formatCurrency(e.amount)}</td>
                            <td>{formatPaymentMethod(e.method)}</td>
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
                        ))}
                        {expenses.length === 0 && (
                          <tr>
                            <td colSpan={7} className={theme.muted}>
                              Nothing spent yet.
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
    </>
  )
}
