import { redirect } from 'next/navigation'
import { requireMembership } from '@/lib/living/auth'
import { setLivingError, setLivingNotice } from '@/lib/living/flash'
import { formatCurrency, formatMonthLabel, formatPaymentMethod, formatPaymentStatus, formatPeriodLabel, monthKeyFor } from '@/lib/living/format'
import { riseStreak } from '@/lib/living/billing'
import { computeBillForFlat, getCurrentMaintenancePeriod, getEffectiveSlabConfig, getFlats, getPaymentsForFlat, getReadingHistory } from '@/lib/living/queries'
import theme from '../../LivingTheme.module.scss'
import homeStyles from '../Home.module.scss'

async function setNoteAction(formData: FormData) {
  'use server'
  const { supabase } = await requireMembership(['owner'])
  const { error } = await supabase.rpc('living_set_reading_note', {
    p_reading_id: String(formData.get('reading_id')),
    p_note: String(formData.get('note') ?? '').trim() || null,
  })
  if (error) {
    await setLivingError(error.message)
    redirect('/living/bill')
  }
  await setLivingNotice('Note saved.')
  redirect('/living/bill')
}

async function raiseDisputeAction(formData: FormData) {
  'use server'
  const { supabase } = await requireMembership(['owner'])
  const reason = String(formData.get('reason') ?? '').trim()
  if (!reason) {
    await setLivingError('Add a short reason.')
    redirect('/living/bill')
  }

  const { error } = await supabase.rpc('living_raise_dispute', { p_reading_id: String(formData.get('reading_id')), p_reason: reason })
  if (error) {
    await setLivingError(error.message)
    redirect('/living/bill')
  }
  await setLivingNotice('Flagged — the Admin/Treasurer will review it.')
  redirect('/living/bill')
}

export default async function LivingBillPage() {
  const { supabase, membership, apartment } = await requireMembership(['owner'])
  const month = monthKeyFor(new Date())

  if (!membership.flat_id) {
    return (
      <div className={theme.card}>
        <p className={theme.muted}>Your account isn&rsquo;t linked to a flat yet — check with your Admin.</p>
      </div>
    )
  }

  const flats = await getFlats(supabase, apartment.id)
  const flat = flats.find((f) => f.id === membership.flat_id)
  if (!flat) redirect('/living/home')

  const [bill, history, slab, currentPeriod] = await Promise.all([
    computeBillForFlat(supabase, apartment, flat, month),
    getReadingHistory(supabase, flat.id, 6),
    getEffectiveSlabConfig(supabase, apartment.id, month),
    getCurrentMaintenancePeriod(supabase, apartment.id),
  ])
  const payments = currentPeriod ? await getPaymentsForFlat(supabase, currentPeriod.id, flat.id) : []

  const streak = slab
    ? riseStreak(
        history.map((r) => ({ consumption_liters: r.current_reading !== null && r.previous_reading !== null ? r.current_reading - r.previous_reading : null })),
        slab.rise_threshold_percent
      )
    : 0

  const currentReading = history.find((r) => r.month === month)

  return (
    <>
      <h1 className={theme.heading} style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>
        Flat {flat.flat_no} — {formatMonthLabel(month)}
      </h1>

      <div className={theme.card} style={{ marginBottom: '1.5rem' }}>
        <div className={homeStyles.billSummary}>
          <div className={homeStyles.billLine}>
            <span>
              Maintenance share
              {bill.maintenance_period && (
                <span className={theme.muted} style={{ display: 'block', fontSize: '0.78rem' }}>
                  {formatPeriodLabel(bill.maintenance_period.start, bill.maintenance_period.end)}
                </span>
              )}
            </span>
            <span className={theme.num}>{formatCurrency(bill.maintenance_share)}</span>
          </div>
          <div className={homeStyles.billLine}>
            <span>Metered water{bill.water_is_fallback ? ' (estimated)' : ''}</span>
            <span className={theme.num}>{formatCurrency(bill.water_metered_charge)}</span>
          </div>
          <div className={homeStyles.billLine}>
            <span>Water supply share (tankers/Majeera)</span>
            <span className={theme.num}>{formatCurrency(bill.water_supply_share)}</span>
          </div>
          <div className={homeStyles.billLine} style={{ fontWeight: 600 }}>
            <span>Current Cycle Total</span>
            <span className={theme.num}>{formatCurrency(bill.current_period_total)}</span>
          </div>
          {bill.late_fee !== 0 && (
            <div className={homeStyles.billLine}>
              <span>Late fee</span>
              <span className={theme.num}>{formatCurrency(bill.late_fee)}</span>
            </div>
          )}
          {bill.previous_due !== 0 && (
            <div className={homeStyles.billLine}>
              <span>Previous due</span>
              <span className={theme.num}>{formatCurrency(bill.previous_due)}</span>
            </div>
          )}
          {bill.advance_payment !== 0 && (
            <div className={homeStyles.billLine}>
              <span>Advance payment</span>
              <span className={theme.num}>−{formatCurrency(bill.advance_payment)}</span>
            </div>
          )}
          <div className={homeStyles.billTotal}>
            <span>Total due</span>
            <span className={theme.num}>{formatCurrency(bill.total_due)}</span>
          </div>
          {bill.amount_paid !== 0 && (
            <div className={homeStyles.billLine}>
              <span>Paid so far</span>
              <span className={theme.num}>−{formatCurrency(bill.amount_paid)}</span>
            </div>
          )}
          <div className={homeStyles.billLine}>
            <span>
              Balance{' '}
              <span className={bill.payment_status === 'paid' ? theme.pillOk : bill.payment_status === 'partial' ? theme.pillBrass : theme.pillFlag}>
                {formatPaymentStatus(bill.payment_status)}
              </span>
            </span>
            <span className={theme.num}>{formatCurrency(bill.balance_remaining)}</span>
          </div>
        </div>
        {bill.water_fallback_reason && (
          <p className={homeStyles.statSub} style={{ marginTop: '0.75rem' }}>
            {bill.water_fallback_reason}
          </p>
        )}
      </div>

      {payments.length > 0 && (
        <div className={homeStyles.section}>
          <h2 className={homeStyles.sectionTitle}>Payments this period</h2>
          <div className={theme.card}>
            <div className={theme.tableScroll}>
              <table className={theme.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th className={theme.num}>Amount</th>
                    <th>Method</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td>{new Date(p.payment_date).toLocaleDateString('en-IN')}</td>
                      <td className={theme.num}>{formatCurrency(p.amount)}</td>
                      <td>{formatPaymentMethod(p.method)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {streak === 2 && (
        <div className={theme.alertInfo}>Your water usage has risen for 2 months in a row. Worth a note if it&rsquo;s expected, or a check for a leak.</div>
      )}
      {streak >= 3 && (
        <div className={theme.alert}>
          Your water usage has risen for {streak} months in a row — this is unusual. Check your plumbing, or flag this reading below for review.
        </div>
      )}

      <div className={homeStyles.section}>
        <h2 className={homeStyles.sectionTitle}>Reading history</h2>
        <div className={theme.card}>
          <div className={theme.tableScroll}>
            <table className={theme.table}>
              <thead>
                <tr>
                  <th>Month</th>
                  <th className={theme.num}>Previous</th>
                  <th className={theme.num}>Current</th>
                  <th className={theme.num}>Consumption</th>
                  <th>Note</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r) => {
                  const consumption = r.current_reading !== null && r.previous_reading !== null ? r.current_reading - r.previous_reading : null
                  return (
                    <tr key={r.id}>
                      <td>{formatMonthLabel(r.month)}</td>
                      <td className={theme.num}>{r.previous_reading ?? '—'}</td>
                      <td className={theme.num}>{r.current_reading ?? '—'}</td>
                      <td className={theme.num}>{consumption !== null ? consumption.toLocaleString('en-IN') : '—'}</td>
                      <td>{r.owner_note ?? '—'}</td>
                      <td>
                        {r.flagged && <span className={theme.pillFlag}>Meter flagged</span>}
                        {r.dispute && <span className={theme.pillBrass}>{r.dispute.status}</span>}
                        {!r.flagged && !r.dispute && '—'}
                      </td>
                    </tr>
                  )
                })}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={6} className={theme.muted}>
                      No readings yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {currentReading && (
        <div className={homeStyles.section}>
          <h2 className={homeStyles.sectionTitle}>This month&rsquo;s reading</h2>
          <div className={theme.card} style={{ marginBottom: '1rem' }}>
            <form action={setNoteAction}>
              <input type="hidden" name="reading_id" value={currentReading.id} />
              <div className={theme.field}>
                <label className={theme.label} htmlFor="note">
                  Add a note (e.g. &ldquo;had guests&rdquo;) — for your own record, doesn&rsquo;t notify anyone
                </label>
                <input id="note" name="note" className={theme.input} defaultValue={currentReading.owner_note ?? ''} />
              </div>
              <button type="submit" className={theme.buttonGhost}>
                Save note
              </button>
            </form>
          </div>

          <div className={theme.card}>
            {currentReading.dispute ? (
              <>
                <p className={theme.muted}>
                  Flagged {new Date(currentReading.dispute.raised_at).toLocaleDateString('en-IN')} — status: {currentReading.dispute.status}
                </p>
                <p style={{ marginTop: '0.5rem' }}>{currentReading.dispute.reason}</p>
                {currentReading.dispute.admin_response && (
                  <p className={theme.muted} style={{ marginTop: '0.5rem' }}>
                    Response: {currentReading.dispute.admin_response}
                  </p>
                )}
              </>
            ) : (
              <form action={raiseDisputeAction}>
                <input type="hidden" name="reading_id" value={currentReading.id} />
                <div className={theme.field}>
                  <label className={theme.label} htmlFor="reason">
                    Think this reading or amount is wrong?
                  </label>
                  <textarea id="reason" name="reason" className={theme.textarea} placeholder="Short reason" />
                </div>
                <button type="submit" className={theme.buttonDanger}>
                  Flag for review
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
