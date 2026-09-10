import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireMembership } from '@/lib/living/auth'
import { setLivingError, setLivingNotice } from '@/lib/living/flash'
import { formatCurrency, formatMonthLabel, formatPaymentStatus, formatPeriodLabel, monthKeyFor } from '@/lib/living/format'
import { riseStreak } from '@/lib/living/billing'
import { computeBillForFlat, getBillHistoryForFlat, getCurrentMaintenancePeriod, getEffectiveSlabConfig, getFlats, getReadingHistory } from '@/lib/living/queries'
import theme from '../../LivingTheme.module.scss'
import homeStyles from '../Home.module.scss'

function disputeStatusPillClass(status: string): string {
  if (status === 'resolved') return theme.pillOk
  if (status === 'reviewed') return theme.pill
  return theme.pillBrass
}

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

  const [bill, history, slab, currentPeriod, billHistory] = await Promise.all([
    computeBillForFlat(supabase, apartment, flat, month),
    getReadingHistory(supabase, flat.id, 6),
    getEffectiveSlabConfig(supabase, apartment.id, month),
    getCurrentMaintenancePeriod(supabase, apartment.id),
    getBillHistoryForFlat(supabase, apartment, flat),
  ])
  const pastBills = billHistory.filter((entry) => entry.period.id !== currentPeriod?.id)

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
        My Bills
      </h1>
      <p className={theme.muted} style={{ marginBottom: '1.5rem' }}>
        Flat {flat.flat_no} — current cycle, {formatMonthLabel(month)}. Payments and receipts live under{' '}
        <Link href="/living/my-payments">Payments</Link>.
      </p>

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
            <span>
              Water{bill.water_is_fallback ? ' (estimated)' : ''}
              {!bill.water_is_fallback && bill.water_consumption_liters !== null && bill.water_rate_per_1000l !== null && (
                <span className={theme.muted} style={{ display: 'block', fontSize: '0.78rem' }}>
                  {bill.water_billing_method === 'slab' ? (
                    <>
                      {bill.water_consumption_liters.toLocaleString('en-IN')}L — Slab (
                      {bill.water_slab_calculation_method === 'whole_consumption' ? 'Whole-consumption' : 'Progressive'})
                      {bill.water_tier_breakdown && bill.water_tier_breakdown.length > 0 && (
                        <details style={{ marginTop: '0.25rem' }}>
                          <summary style={{ cursor: 'pointer' }}>View calculation</summary>
                          {bill.water_tier_breakdown.map((tier, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                              <span>
                                {tier.liters_billed.toLocaleString('en-IN')}L × {formatCurrency(tier.rate)}/1,000L ({tier.rate_multiplier}×)
                              </span>
                              <span>{formatCurrency(tier.amount)}</span>
                            </div>
                          ))}
                        </details>
                      )}
                    </>
                  ) : (
                    `${bill.water_consumption_liters.toLocaleString('en-IN')}L × ${formatCurrency(bill.water_rate_per_1000l)}/1,000L`
                  )}
                </span>
              )}
            </span>
            <span className={theme.num}>{formatCurrency(bill.water_charge)}</span>
          </div>
          {bill.water_manual_adjustment !== 0 && (
            <div className={homeStyles.billLine}>
              <span>Water adjustment</span>
              <span className={theme.num}>{bill.water_manual_adjustment > 0 ? '+' : ''}{formatCurrency(bill.water_manual_adjustment)}</span>
            </div>
          )}
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

      {pastBills.length > 0 && (
        <div className={homeStyles.section}>
          <h2 className={homeStyles.sectionTitle}>Past bills</h2>
          <div className={theme.card}>
            <div className={theme.tableScroll}>
              <table className={theme.table}>
                <thead>
                  <tr>
                    <th>Billing period</th>
                    <th className={theme.num}>Maintenance</th>
                    <th className={theme.num}>Water</th>
                    <th className={theme.num}>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pastBills.map(({ period, bill: pastBill }) => (
                    <tr key={period.id}>
                      <td>{formatPeriodLabel(period.month, period.period_end)}</td>
                      <td className={theme.num}>{formatCurrency(pastBill.maintenance_share)}</td>
                      <td className={theme.num}>{formatCurrency(pastBill.water_charge)}</td>
                      <td className={theme.num}>{formatCurrency(pastBill.total_due)}</td>
                      <td>
                        <span
                          className={
                            pastBill.payment_status === 'paid' ? theme.pillOk : pastBill.payment_status === 'partial' ? theme.pillBrass : theme.pillFlag
                          }
                        >
                          {formatPaymentStatus(pastBill.payment_status)}
                        </span>
                      </td>
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
                        {r.dispute && <span className={disputeStatusPillClass(r.dispute.status)}>{r.dispute.status}</span>}
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
