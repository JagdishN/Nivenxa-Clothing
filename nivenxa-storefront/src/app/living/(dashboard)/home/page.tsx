import Link from 'next/link'
import { requireMembership } from '@/lib/living/auth'
import { formatCurrency, formatMonthLabel, formatPeriodLabel, monthKeyFor } from '@/lib/living/format'
import {
  computeBillForFlat,
  getAllPaymentsForFlat,
  getBillableFlats,
  getCurrentMaintenancePeriod,
  getExpensesForPeriod,
  getFlats,
  getOpenDisputes,
  getPendingClaims,
  getRiseAlerts,
  sumExpenses,
} from '@/lib/living/queries'
import theme from '../../LivingTheme.module.scss'
import styles from '../Home.module.scss'
import ownerStyles from './OwnerHome.module.scss'

export default async function LivingAppHomePage() {
  const { supabase, membership, apartment } = await requireMembership()
  const month = monthKeyFor(new Date())

  if (membership.role === 'owner') {
    const flatId = membership.flat_id
    const flat = flatId ? (await getFlats(supabase, apartment.id)).find((f) => f.id === flatId) : undefined
    const firstName = flat?.owner_name?.trim().split(/\s+/)[0]

    return (
      <>
        <div className={ownerStyles.topRow}>
          <span className={ownerStyles.greeting}>Hello{firstName ? `, ${firstName}` : ''}</span>
          {flat && <span className={ownerStyles.flatTag}>Flat {flat.flat_no}</span>}
        </div>
        <p className={ownerStyles.monthLabel}>{formatMonthLabel(month)}</p>

        {flat ? (
          <OwnerHero supabase={supabase} apartment={apartment} flat={flat} month={month} />
        ) : (
          <div className={theme.card}>
            <p className={theme.muted}>Your account isn&rsquo;t linked to a flat yet — check with your Admin.</p>
          </div>
        )}
      </>
    )
  }

  const [flats, pendingClaims, openDisputes, riseAlerts] = await Promise.all([
    getFlats(supabase, apartment.id),
    getPendingClaims(supabase, apartment.id),
    getOpenDisputes(supabase, apartment.id),
    getRiseAlerts(supabase, apartment, month),
  ])

  const billableFlats = getBillableFlats(flats)
  const currentPeriod = await getCurrentMaintenancePeriod(supabase, apartment.id)
  const [bills, periodExpenses] = await Promise.all([
    Promise.all(billableFlats.map((flat) => computeBillForFlat(supabase, apartment, flat, month))),
    currentPeriod ? getExpensesForPeriod(supabase, currentPeriod.id) : Promise.resolve([]),
  ])

  const monthlyExpenses = sumExpenses(periodExpenses)
  const collected = bills.reduce((sum, b) => sum + b.amount_paid, 0)
  const outstanding = bills.reduce((sum, b) => sum + b.balance_remaining, 0)
  const flatsPaidCount = bills.filter((b) => b.payment_status === 'paid').length

  return (
    <>
      <h1 className={theme.heading} style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>
        {apartment.name}
      </h1>
      <p className={theme.muted} style={{ marginBottom: '1.5rem' }}>{formatMonthLabel(month)}</p>

      {/* "How's my apartment doing this month" — the headline cards an Admin/Treasurer actually opens this page to check. */}
      <div className={styles.grid}>
        <div className={theme.card}>
          <div className={styles.statLabel}>Monthly expenses</div>
          <div className={styles.statValue}>{formatCurrency(monthlyExpenses)}</div>
          <div className={styles.statSub}>
            <Link href="/living/expenses">Open →</Link>
          </div>
        </div>
        <div className={theme.card}>
          <div className={styles.statLabel}>Collected</div>
          <div className={`${styles.statValue} ${theme.creditText}`}>{formatCurrency(collected)}</div>
          <div className={styles.statSub}>
            <Link href="/living/payments">Open →</Link>
          </div>
        </div>
        <div className={theme.card}>
          <div className={styles.statLabel}>Outstanding</div>
          <div className={`${styles.statValue} ${outstanding > 0 ? theme.warnText : ''}`}>{formatCurrency(outstanding)}</div>
          <div className={styles.statSub}>
            <Link href="/living/billing/ledgers">Open →</Link>
          </div>
        </div>
        <div className={theme.card}>
          <div className={styles.statLabel}>Flats paid</div>
          <div className={styles.statValue}>
            {flatsPaidCount} / {billableFlats.length}
          </div>
          <div className={styles.statSub}>
            <Link href="/living/bills">Open →</Link>
          </div>
        </div>
      </div>

      {/* Configuration/administrative numbers — demoted to one compact strip rather than four equally-weighted cards. */}
      <div className={theme.card} style={{ marginBottom: '1.5rem' }}>
        <h2 className={styles.sectionTitle} style={{ marginBottom: '1rem' }}>
          Community overview
        </h2>
        <div className={styles.miniStats}>
          <div className={styles.miniStat}>
            <span className={styles.miniStatLabel}>Flats</span>
            <span className={styles.miniStatValue}>
              {flats.length} / {apartment.flat_count}
            </span>
            <span className={styles.statSub}>{apartment.flat_split === 'equal' ? 'Equal split' : 'Weighted by sq ft'}</span>
          </div>
          {membership.role === 'admin' && (
            <div className={styles.miniStat}>
              <span className={styles.miniStatLabel}>Join code</span>
              <span className={`${styles.miniStatValue} ${styles.joinCode}`}>{apartment.join_code}</span>
              <span className={styles.statSub}>Share with owners to join</span>
            </div>
          )}
          <div className={styles.miniStat}>
            <span className={styles.miniStatLabel}>Open disputes</span>
            <span className={styles.miniStatValue}>{openDisputes.length}</span>
            <span className={styles.statSub}>
              <Link href="/living/disputes">Review queue →</Link>
            </span>
          </div>
          {membership.role === 'admin' && (
            <div className={styles.miniStat}>
              <span className={styles.miniStatLabel}>Pending flat requests</span>
              <span className={styles.miniStatValue}>{pendingClaims.length}</span>
              <span className={styles.statSub}>
                <Link href="/living/setup">Review in Setup →</Link>
              </span>
            </div>
          )}
        </div>
      </div>

      {riseAlerts.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Sustained water-usage rises</h2>
          <div className={styles.rowList}>
            {riseAlerts.map((alert) => (
              <div key={alert.flat.id} className={styles.row}>
                <span>
                  Flat {alert.flat.flat_no} — risen {alert.streak} months in a row
                </span>
                <span className={theme.pillFlag}>Check in</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Quick links</h2>
        <div className={styles.rowList}>
          <div className={styles.row}>
            <span>This month&rsquo;s maintenance line items</span>
            <Link href="/living/maintenance">Open →</Link>
          </div>
          {membership.role === 'admin' && (
            <div className={styles.row}>
              <span>Water readings entry</span>
              <Link href="/living/water">Open →</Link>
            </div>
          )}
          <div className={styles.row}>
            <span>Bill &amp; payment documents</span>
            <Link href="/living/documents">Open →</Link>
          </div>
        </div>
      </div>
    </>
  )
}

/**
 * The owner's "what do I owe / have I paid" hero — the whole reason they
 * opened the app. Two distinct shapes on purpose: a full breakdown card
 * while something's owed, and a small settled strip once it isn't, so the
 * page itself visibly changes rather than just re-labeling the same card.
 */
async function OwnerHero({
  supabase,
  apartment,
  flat,
  month,
}: {
  supabase: Awaited<ReturnType<typeof requireMembership>>['supabase']
  apartment: Awaited<ReturnType<typeof requireMembership>>['apartment']
  flat: Awaited<ReturnType<typeof getFlats>>[number]
  month: string
}) {
  const [bill, recentPayments] = await Promise.all([
    computeBillForFlat(supabase, apartment, flat, month),
    getAllPaymentsForFlat(supabase, apartment.id, flat.id),
  ])
  const lastPayment = recentPayments[0]

  return (
    <>
      {bill.balance_remaining <= 0 ? (
        <div className={`${theme.card} ${ownerStyles.heroPaid}`} style={{ marginBottom: '1.5rem' }}>
          <span className={ownerStyles.paidBadge}>✓ Paid</span>
          <span className={ownerStyles.paidAmount}>{formatCurrency(bill.total_due)}</span>
          {lastPayment && (
            <span className={ownerStyles.paidMeta}>Paid on {new Date(lastPayment.payment_date).toLocaleDateString('en-IN')}</span>
          )}
          {lastPayment && (
            <Link href={`/living/payments/receipts/${lastPayment.id}`} className={theme.buttonGhost}>
              View Receipt
            </Link>
          )}
        </div>
      ) : (
        <div className={`${theme.card} ${bill.amount_paid > 0 ? ownerStyles.heroPartial : ownerStyles.hero}`} style={{ marginBottom: '1.5rem' }}>
          <div className={ownerStyles.heroLabel}>{bill.amount_paid > 0 ? 'Balance due' : 'Current bill'}</div>
          <div className={ownerStyles.heroAmount}>{formatCurrency(bill.balance_remaining)}</div>
          {bill.maintenance_period && (
            <div className={ownerStyles.heroPeriod}>Billing period: {formatPeriodLabel(bill.maintenance_period.start, bill.maintenance_period.end)}</div>
          )}

          <div className={ownerStyles.heroBreakdown}>
            <div className={ownerStyles.heroLine}>
              <span>Maintenance</span>
              <span className={theme.num}>{formatCurrency(bill.maintenance_share)}</span>
            </div>
            <div className={ownerStyles.heroLine}>
              <span>
                Water{bill.water_is_fallback ? ' (estimated)' : ''}
                {!bill.water_is_fallback && bill.water_consumption_liters !== null && bill.water_rate_per_1000l !== null && (
                  <span className={ownerStyles.paidMeta} style={{ display: 'block', fontSize: '0.75rem' }}>
                    {bill.water_billing_method === 'slab' ? (
                      <>
                        {bill.water_consumption_liters.toLocaleString('en-IN')}L — Slab (
                        {bill.water_slab_calculation_method === 'whole_consumption' ? 'Whole-consumption' : 'Progressive'})
                        {bill.water_tier_breakdown && bill.water_tier_breakdown.length > 0 && (
                          <details style={{ marginTop: '0.2rem' }}>
                            <summary style={{ cursor: 'pointer' }}>View calculation</summary>
                            {bill.water_tier_breakdown.map((tier, i) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                                <span>
                                  {tier.liters_billed.toLocaleString('en-IN')}L × {formatCurrency(tier.rate)}/1,000L
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
              <div className={ownerStyles.heroLine}>
                <span>Water adjustment</span>
                <span className={theme.num}>
                  {bill.water_manual_adjustment > 0 ? '+' : ''}
                  {formatCurrency(bill.water_manual_adjustment)}
                </span>
              </div>
            )}
            {bill.previous_due !== 0 && (
              <div className={ownerStyles.heroLine}>
                <span>Previous due</span>
                <span className={theme.num}>{formatCurrency(bill.previous_due)}</span>
              </div>
            )}
            {bill.late_fee !== 0 && (
              <div className={ownerStyles.heroLine}>
                <span>Late fee</span>
                <span className={theme.num}>{formatCurrency(bill.late_fee)}</span>
              </div>
            )}
            <div className={ownerStyles.heroTotal}>
              <span>Total</span>
              <span className={theme.num}>{formatCurrency(bill.total_due)}</span>
            </div>
            {bill.amount_paid > 0 && (
              <div className={ownerStyles.heroLine}>
                <span>Paid so far</span>
                <span className={theme.num}>−{formatCurrency(bill.amount_paid)}</span>
              </div>
            )}
          </div>
          {bill.water_fallback_reason && <p className={styles.statSub}>{bill.water_fallback_reason}</p>}

          <div className={ownerStyles.heroActions}>
            <Link href="/living/bill" className={theme.button}>
              View Bill
            </Link>
            <Link href="/living/my-payments" className={theme.buttonGhost}>
              Payment History
            </Link>
          </div>
        </div>
      )}

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Recent activity</h2>
        {recentPayments.length > 0 ? (
          <div className={ownerStyles.activityList}>
            {recentPayments.slice(0, 3).map((p) => (
              <div key={p.id} className={ownerStyles.activityRow}>
                <span className={ownerStyles.activityIcon}>✓</span>
                <div className={ownerStyles.activityBody}>
                  <span>Payment received — {new Date(p.payment_date).toLocaleDateString('en-IN')}</span>
                  <span className={ownerStyles.activityAmount}>{formatCurrency(p.amount)}</span>
                </div>
                <Link href={`/living/payments/receipts/${p.id}`}>View receipt →</Link>
              </div>
            ))}
          </div>
        ) : (
          <p className={theme.muted}>No recent activity yet.</p>
        )}
      </div>
    </>
  )
}
