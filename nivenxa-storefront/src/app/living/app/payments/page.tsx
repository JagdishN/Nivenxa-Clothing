import { redirect } from 'next/navigation'
import { requireMembership } from '@/lib/living/auth'
import { formatCurrency, formatPaymentMethod, formatPaymentStatus, monthKeyFor } from '@/lib/living/format'
import { computeBillForFlat, getBillableFlats, getCurrentMaintenancePeriod, getFlats, getPaymentsForPeriod } from '@/lib/living/queries'
import type { PaymentMethod, PaymentStatus } from '@/lib/living/types'
import theme from '../../LivingTheme.module.scss'
import homeStyles from '../Home.module.scss'

const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'upi', 'bank_transfer', 'cheque', 'other']

function statusPillClass(status: PaymentStatus): string {
  if (status === 'paid') return theme.pillOk
  if (status === 'partial') return theme.pillBrass
  return theme.pillFlag
}

async function recordPaymentAction(formData: FormData) {
  'use server'
  const { supabase, apartment, userId } = await requireMembership(['admin', 'treasurer'])
  const current = await getCurrentMaintenancePeriod(supabase, apartment.id)
  if (!current) redirect('/living/app/payments?error=' + encodeURIComponent('Start a billing period on the Maintenance page first.'))

  const flatId = String(formData.get('flat_id') ?? '')
  const amount = Number(formData.get('amount') ?? 0)
  const paymentDate = String(formData.get('payment_date') ?? '').trim()
  const method = String(formData.get('method') ?? 'other')
  const referenceNote = String(formData.get('reference_note') ?? '').trim()

  if (!flatId) redirect('/living/app/payments?error=' + encodeURIComponent('Pick a flat.'))
  if (!amount || amount <= 0) redirect('/living/app/payments?error=' + encodeURIComponent('Enter an amount greater than zero.'))
  if (!paymentDate) redirect('/living/app/payments?error=' + encodeURIComponent('Pick a payment date.'))
  if (!PAYMENT_METHODS.includes(method as PaymentMethod)) redirect('/living/app/payments?error=' + encodeURIComponent('Invalid payment method.'))

  const { error } = await supabase.from('living_payments').insert({
    apartment_id: apartment.id,
    maintenance_month_id: current.id,
    flat_id: flatId,
    amount,
    payment_date: paymentDate,
    method,
    reference_note: referenceNote || null,
    recorded_by: userId,
  })
  if (error) redirect('/living/app/payments?error=' + encodeURIComponent(error.message))
  redirect('/living/app/payments?notice=' + encodeURIComponent('Payment recorded.'))
}

async function deletePaymentAction(formData: FormData) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const id = String(formData.get('id') ?? '')
  const { error } = await supabase.from('living_payments').delete().eq('id', id).eq('apartment_id', apartment.id)
  if (error) redirect('/living/app/payments?error=' + encodeURIComponent(error.message))
  redirect('/living/app/payments?notice=' + encodeURIComponent('Payment removed.'))
}

export default async function LivingPaymentsPage() {
  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const month = monthKeyFor(new Date())
  const current = await getCurrentMaintenancePeriod(supabase, apartment.id)
  const flats = getBillableFlats(await getFlats(supabase, apartment.id))

  const rows = current ? await Promise.all(flats.map(async (flat) => ({ flat, bill: await computeBillForFlat(supabase, apartment, flat, month) }))) : []
  const payments = current ? await getPaymentsForPeriod(supabase, current.id) : []
  const flatById = new Map(flats.map((f) => [f.id, f]))

  const todayIso = new Date().toISOString().slice(0, 10)

  return (
    <>
      <h1 className={theme.heading} style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>
        Payments
      </h1>
      <p className={theme.muted} style={{ marginBottom: '1.5rem' }}>
        What&rsquo;s actually been collected for the current billing period — each entry here reduces a flat&rsquo;s balance and, when you
        start the next period, seeds its Previous Due automatically.
      </p>

      {!current ? (
        <div className={theme.card}>
          <p className={theme.muted}>Start a billing period on the Maintenance page first.</p>
        </div>
      ) : (
        <>
          <div className={theme.card} style={{ marginBottom: '1.5rem' }}>
            <div className={theme.tableScroll}>
              <table className={theme.table}>
                <thead>
                  <tr>
                    <th>Flat</th>
                    <th className={theme.num}>Total due</th>
                    <th className={theme.num}>Paid</th>
                    <th className={theme.num}>Balance</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ flat, bill }) => (
                    <tr key={flat.id}>
                      <td>{flat.flat_no}</td>
                      <td className={theme.num}>{formatCurrency(bill.total_due)}</td>
                      <td className={theme.num}>{formatCurrency(bill.amount_paid)}</td>
                      <td className={theme.num}>{formatCurrency(bill.balance_remaining)}</td>
                      <td>
                        <span className={statusPillClass(bill.payment_status)}>{formatPaymentStatus(bill.payment_status)}</span>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={5} className={theme.muted}>
                        No billable flats yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className={homeStyles.section}>
            <h2 className={homeStyles.sectionTitle}>Record a payment</h2>
            <div className={theme.card} style={{ marginBottom: '1.5rem' }}>
              <form action={recordPaymentAction} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div className={theme.field} style={{ marginBottom: 0 }}>
                  <label className={theme.label} htmlFor="flat_id">
                    Flat
                  </label>
                  <select id="flat_id" name="flat_id" className={theme.select} required defaultValue="">
                    <option value="" disabled>
                      Select a flat
                    </option>
                    {flats.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.flat_no}
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
                  <label className={theme.label} htmlFor="payment_date">
                    Date
                  </label>
                  <input id="payment_date" name="payment_date" type="date" className={theme.input} defaultValue={todayIso} required />
                </div>
                <div className={theme.field} style={{ marginBottom: 0 }}>
                  <label className={theme.label} htmlFor="method">
                    Method
                  </label>
                  <select id="method" name="method" className={theme.select} defaultValue="upi">
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
                  <input id="reference_note" name="reference_note" className={theme.input} placeholder="UTR / cheque no." />
                </div>
                <button type="submit" className={theme.button}>
                  Record payment
                </button>
              </form>
            </div>
          </div>

          <div className={homeStyles.section}>
            <h2 className={homeStyles.sectionTitle}>This period&rsquo;s payments</h2>
            <div className={theme.card}>
              <div className={theme.tableScroll}>
                <table className={theme.table}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Flat</th>
                      <th className={theme.num}>Amount</th>
                      <th>Method</th>
                      <th>Reference</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td>{new Date(p.payment_date).toLocaleDateString('en-IN')}</td>
                        <td>{flatById.get(p.flat_id)?.flat_no ?? '—'}</td>
                        <td className={theme.num}>{formatCurrency(p.amount)}</td>
                        <td>{formatPaymentMethod(p.method)}</td>
                        <td>{p.reference_note ?? '—'}</td>
                        <td>
                          <form action={deletePaymentAction}>
                            <input type="hidden" name="id" value={p.id} />
                            <button type="submit" className={theme.buttonGhost}>
                              Delete
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))}
                    {payments.length === 0 && (
                      <tr>
                        <td colSpan={6} className={theme.muted}>
                          No payments recorded for this period yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
