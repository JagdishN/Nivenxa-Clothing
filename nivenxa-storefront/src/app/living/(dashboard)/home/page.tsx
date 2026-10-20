import Link from 'next/link'
import { requireMembership } from '@/lib/living/auth'
import { formatActivityTimestamp, formatCurrency, formatCurrencyCompact, formatMonthLabel, formatPeriodLabel, monthKeyFor } from '@/lib/living/format'
import {
  computeBillForFlat,
  getAllPaymentsForFlat,
  getBillableFlats,
  getCurrentAvailableBalance,
  getCurrentMaintenancePeriod,
  getExpensesForPeriod,
  getFlats,
  getMeetings,
  getOpenDisputes,
  getPendingClaims,
  getPublishedStatements,
  getRecentActivity,
  getRelevantWaterMonth,
  sumExpenses,
  type ActivityEntry,
} from '@/lib/living/queries'
import InviteResidentButton from '../InviteResidentButton'
import theme from '../../LivingTheme.module.scss'
import styles from '../Home.module.scss'
import ownerStyles from './OwnerHome.module.scss'

function activityTitle(entry: ActivityEntry): string {
  if (entry.kind === 'payment') return `Payment received · Flat ${entry.flatNo}`
  return `Expense added · ${entry.category ?? entry.description}`
}

export default async function LivingAppHomePage() {
  const { supabase, membership, apartment } = await requireMembership()
  const month = monthKeyFor(new Date())

  if (membership.role === 'owner') {
    const flatId = membership.flat_id
    const flat = flatId ? (await getFlats(supabase, apartment.id)).find((f) => f.id === flatId) : undefined
    const firstName = flat?.owner_name?.trim().split(/\s+/)[0]
    const ownerCurrentPeriod = await getCurrentMaintenancePeriod(supabase, apartment.id)
    const ownerBillMonth = getRelevantWaterMonth(ownerCurrentPeriod, month)

    return (
      <>
        <div className={ownerStyles.topRow}>
          <span className={ownerStyles.greeting}>Hello{firstName ? `, ${firstName}` : ''}</span>
          {flat && <span className={ownerStyles.flatTag}>Flat {flat.flat_no}</span>}
        </div>
        <p className={ownerStyles.monthLabel}>{formatMonthLabel(ownerBillMonth)}</p>

        {flat ? (
          <OwnerHero supabase={supabase} apartment={apartment} flat={flat} month={ownerBillMonth} maintenanceMonth={ownerCurrentPeriod} />
        ) : (
          <div className={theme.card}>
            <p className={theme.muted}>Your account isn&rsquo;t linked to a flat yet — check with your Admin.</p>
          </div>
        )}
      </>
    )
  }

  const [flats, pendingClaims, openDisputes, meetings, publishedStatements] = await Promise.all([
    getFlats(supabase, apartment.id),
    getPendingClaims(supabase, apartment.id),
    getOpenDisputes(supabase, apartment.id),
    getMeetings(supabase, apartment.id),
    getPublishedStatements(supabase, apartment.id),
  ])

  const billableFlats = getBillableFlats(flats)
  const currentPeriod = await getCurrentMaintenancePeriod(supabase, apartment.id)
  const billMonth = getRelevantWaterMonth(currentPeriod, month)
  const [bills, periodExpenses] = await Promise.all([
    Promise.all(
      billableFlats.map((flat) => computeBillForFlat(supabase, apartment, flat, billMonth, { allFlats: flats, maintenanceMonth: currentPeriod }))
    ),
    currentPeriod ? getExpensesForPeriod(supabase, currentPeriod.id) : Promise.resolve([]),
  ])

  const monthlyExpenses = sumExpenses(periodExpenses)
  const collected = bills.reduce((sum, b) => sum + b.amount_paid, 0)
  // A flat's own balance_remaining can be negative (an overpayment/advance) —
  // that's THAT flat's credit, not money that offsets some other flat's
  // unpaid balance. Netting the raw sum across every bill let one flat's
  // advance cancel out another flat's real unpaid balance and show
  // "Outstanding ₹0.00" while a flat still genuinely owed money. Summing
  // only the positive balances is what "Outstanding" actually means: total
  // still owed to the community, per flat, never offset by unrelated credit.
  const outstanding = bills.reduce((sum, b) => sum + Math.max(0, b.balance_remaining), 0)
  const flatsPaidCount = bills.filter((b) => b.payment_status === 'paid').length
  const unpaidCount = billableFlats.length - flatsPaidCount

  // A short preview list dominated by one activity kind reads as repetitive
  // — fetch a bigger recency-sorted pool, then cap EACH kind at 2 entries so
  // a burst of payments (or expenses) doesn't crowd out the other kind.
  // /living/activity (the uncapped, filterable full list) doesn't do this —
  // a variety cap only makes sense on a 5-item teaser.
  const recentActivityPool = await getRecentActivity(supabase, apartment.id, 10)
  const shownByKind: Record<ActivityEntry['kind'], number> = { payment: 0, expense: 0 }
  const recentActivity: ActivityEntry[] = []
  for (const entry of recentActivityPool) {
    if (shownByKind[entry.kind] >= 2) continue
    shownByKind[entry.kind]++
    recentActivity.push(entry)
    if (recentActivity.length >= 5) break
  }
  const availableBalance = getCurrentAvailableBalance(apartment, publishedStatements, currentPeriod?.id ?? null, collected, monthlyExpenses)

  const maintenanceReady = currentPeriod?.status === 'published'
  const statementPublished = currentPeriod ? publishedStatements.some((s) => s.maintenance_month_id === currentPeriod.id) : false
  const latestMeeting = meetings[0]

  return (
    <>
      <h1 className={theme.heading} style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>
        {apartment.name}
      </h1>
      <p className={theme.muted} style={{ marginBottom: '1.25rem' }}>{formatMonthLabel(month)}</p>

      <h2 className={styles.sectionTitle}>Financial Summary</h2>
      <div className={styles.grid}>
        <div className={theme.card}>
          <div className={styles.statLabel}>Collected</div>
          <div className={`${styles.statValue} ${theme.creditText}`}>{formatCurrencyCompact(collected)}</div>
          <div className={styles.statSub}>
            <Link href="/living/payments">View payments →</Link>
          </div>
        </div>
        <div className={theme.card}>
          <div className={styles.statLabel}>Expenses</div>
          <div className={styles.statValue}>{formatCurrencyCompact(monthlyExpenses)}</div>
          <div className={styles.statSub}>
            <Link href="/living/expenses">View expenses →</Link>
          </div>
        </div>
        <div className={theme.card}>
          <div className={styles.statLabel}>Outstanding</div>
          <div className={`${styles.statValue} ${outstanding > 0 ? theme.warnText : ''}`}>{formatCurrencyCompact(outstanding)}</div>
          <div className={styles.statSub}>
            <Link href="/living/billing/ledgers">View pending →</Link>
          </div>
        </div>
        <div className={theme.card}>
          <div className={styles.statLabel}>Closing Balance</div>
          <div className={styles.statValue}>{formatCurrencyCompact(availableBalance)}</div>
          <div className={styles.statSub}>
            <Link href="/living/statements">View statement →</Link>
          </div>
        </div>
      </div>

      {/* Compact status cards, not KPI cards — each holds one status line and one action
          link, so the row reads at a glance without competing with Financial Summary above it. */}
      <h2 className={styles.sectionTitle}>This Month</h2>
      <div className={styles.statusGrid}>
        <Link href="/living/bills" className={styles.statusTile}>
          <div className={styles.statLabel}>Collections</div>
          <div className={styles.statusTileValue}>
            {flatsPaidCount} / {billableFlats.length} Paid
          </div>
          <div className={styles.statusTileAction}>{unpaidCount > 0 ? `${unpaidCount} pending ›` : 'All caught up ›'}</div>
        </Link>
        <Link href="/living/maintenance" className={styles.statusTile}>
          <div className={styles.statLabel}>Billing</div>
          <div className={styles.statusTileValue} style={{ color: maintenanceReady ? 'var(--living-ok)' : 'var(--living-brass)' }}>
            <span className={styles.statusDot} />
            {maintenanceReady ? 'Ready' : 'Not started'}
          </div>
          <div className={styles.statusTileAction}>View ›</div>
        </Link>
        <Link href="/living/statements" className={styles.statusTile}>
          <div className={styles.statLabel}>Statement</div>
          <div className={styles.statusTileValue} style={{ color: statementPublished ? 'var(--living-ok)' : 'var(--living-brass)' }}>
            <span className={styles.statusDot} />
            {statementPublished ? 'Shared' : 'Not Shared'}
          </div>
          <div className={styles.statusTileAction}>{statementPublished ? 'View ›' : 'Share ›'}</div>
        </Link>
        {/* Hidden, not a "Not tracked yet" placeholder, until the reimbursement/ledger
            subsystem exists — a tile that always says "not tracked" reads as broken, not
            as a real status. Once getApartmentReimbursementsDue() exists, this becomes:
            <Link href="/living/reimbursements" className={styles.statusTile}>
              <div className={styles.statLabel}>Reimbursements</div>
              <div className={styles.statusTileValue}>{formatCurrencyCompact(due)} Due</div>
              <div className={styles.statusTileAction}>{flatCount} resident{flatCount === 1 ? '' : 's'} ›</div>
            </Link> */}
      </div>

      {/* Left column is two independent, content-height cards (Community, Latest Meeting) —
          NOT stretched to match Recent Activity's height. .twoCol's align-items: start is
          what stops the grid from forcing every card in the row to match the tallest one. */}
      <div className={styles.twoCol}>
        <div className={styles.stackCol}>
          <div className={theme.card} style={{ padding: '1.1rem 1.3rem' }}>
            <h2 className={styles.sectionTitle}>Community</h2>
            <p style={{ margin: 0, fontSize: '0.92rem' }}>{flats.length} Flats · {billableFlats.length} Billable</p>
            <p style={{ margin: '0.15rem 0 0.6rem', fontSize: '0.92rem' }}>
              {membership.role === 'admin' && (
                <>
                  <Link href="/living/setup">
                    {pendingClaims.length} Pending Request{pendingClaims.length === 1 ? '' : 's'}
                  </Link>
                  {' · '}
                </>
              )}
              <Link href="/living/disputes">
                {openDisputes.length} Dispute{openDisputes.length === 1 ? '' : 's'}
              </Link>
            </p>
            {membership.role === 'admin' && <InviteResidentButton apartmentName={apartment.name} joinCode={apartment.join_code} />}
          </div>

          <div className={theme.card} style={{ padding: '1.1rem 1.3rem' }}>
            <h2 className={styles.sectionTitle}>Latest Meeting</h2>
            {latestMeeting ? (
              <>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.92rem' }}>{latestMeeting.title}</p>
                <p className={styles.statSub} style={{ marginBottom: '0.5rem' }}>
                  {new Date(latestMeeting.meeting_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                <p className={styles.statSub} style={{ margin: 0 }}>
                  <Link href={`/living/meetings/${latestMeeting.id}`}>View MOM →</Link>
                  {' · '}
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`${latestMeeting.title} — ${apartment.name}: nivenxa.com/living/meetings/${latestMeeting.id}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Share →
                  </a>
                </p>
              </>
            ) : (
              <>
                <p className={theme.muted} style={{ margin: '0 0 0.4rem' }}>No meeting minutes added yet.</p>
                <Link href="/living/meetings" className={styles.statSub}>
                  Add Meeting Minutes →
                </Link>
              </>
            )}
          </div>
        </div>

        <div className={theme.card}>
          <h2 className={styles.sectionTitle}>Recent Activity</h2>
          {recentActivity.length > 0 ? (
            <div>
              {recentActivity.map((entry, i) => (
                <div key={i} className={styles.activityEntry}>
                  <div className={styles.activityTop}>
                    <span>{activityTitle(entry)}</span>
                    <span>{formatCurrency(entry.amount)}</span>
                  </div>
                  <div className={styles.activityTime}>{formatActivityTimestamp(entry.createdAt)}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className={theme.muted}>No activity recorded yet.</p>
          )}
          <p className={styles.statSub} style={{ marginTop: '0.6rem' }}>
            <Link href="/living/activity">View all activity →</Link>
          </p>
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
  maintenanceMonth,
}: {
  supabase: Awaited<ReturnType<typeof requireMembership>>['supabase']
  apartment: Awaited<ReturnType<typeof requireMembership>>['apartment']
  flat: Awaited<ReturnType<typeof getFlats>>[number]
  month: string
  maintenanceMonth: Awaited<ReturnType<typeof getCurrentMaintenancePeriod>>
}) {
  const [bill, recentPayments] = await Promise.all([
    computeBillForFlat(supabase, apartment, flat, month, { maintenanceMonth }),
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
