import Link from 'next/link'
import { requireMembership } from '@/lib/living/auth'
import { maintenanceGrandTotal } from '@/lib/living/billing'
import { formatCurrency, formatMonthLabel, monthKeyFor } from '@/lib/living/format'
import { computeBillForFlat, getBillableFlats, getCurrentMaintenancePeriod, getFlats, getWaterSupplyCost } from '@/lib/living/queries'
import theme from '../../LivingTheme.module.scss'
import homeStyles from '../Home.module.scss'
import styles from './BillingOverview.module.scss'

/**
 * "What is the status of this month's billing?" — distinct from the Bills
 * page (which is the flat-by-flat detail table). This is the guided view:
 * where the Maintenance → Water → Bills → Collections cycle stands, what
 * needs attention, and (once built) whether the month can be closed.
 */
export default async function LivingBillingOverviewPage() {
  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const month = monthKeyFor(new Date())

  const [currentPeriod, flats, waterSupplyCost] = await Promise.all([
    getCurrentMaintenancePeriod(supabase, apartment.id),
    getFlats(supabase, apartment.id),
    getWaterSupplyCost(supabase, apartment.id, month),
  ])
  const billableFlats = getBillableFlats(flats)
  const bills = await Promise.all(billableFlats.map((flat) => computeBillForFlat(supabase, apartment, flat, month)))

  const maintenanceReady = currentPeriod?.status === 'published'
  const maintenanceTotal = currentPeriod ? maintenanceGrandTotal(currentPeriod.line_items) : 0
  const waterReady = waterSupplyCost !== null
  const waterTotal = bills.reduce((sum, b) => sum + b.water_charge, 0)
  const billsGenerated = maintenanceReady ? billableFlats.length : 0
  const billsTotal = bills.reduce((sum, b) => sum + b.total_due, 0)
  const collected = bills.reduce((sum, b) => sum + b.amount_paid, 0)
  const outstanding = bills.reduce((sum, b) => sum + b.balance_remaining, 0)
  const flatsPaidCount = bills.filter((b) => b.payment_status === 'paid').length
  const collectionsComplete = billableFlats.length > 0 && flatsPaidCount === billableFlats.length
  const collectionsStarted = flatsPaidCount > 0

  const flatsWithPreviousDue = billableFlats
    .map((flat, i) => ({ flat, amount: bills[i].previous_due }))
    .filter((r) => r.amount > 0.005)
  const previousDueTotal = flatsWithPreviousDue.reduce((sum, r) => sum + r.amount, 0)

  const unpaidFlats = billableFlats.map((flat, i) => ({ flat, balance: bills[i].balance_remaining })).filter((r) => r.balance > 0.005)
  const unpaidTotal = unpaidFlats.reduce((sum, r) => sum + r.balance, 0)

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h1 className={theme.heading} style={{ fontSize: '1.6rem', margin: 0 }}>
          Billing
        </h1>
        <p className={theme.muted}>{formatMonthLabel(month)}</p>
      </div>
      <p className={theme.muted} style={{ marginBottom: '1.5rem' }}>
        Where this month&rsquo;s billing cycle stands — Maintenance, Water, Bills and Collections each have their own page; this is the
        one that shows how they connect.
      </p>

      <div className={homeStyles.grid} style={{ marginBottom: '1rem' }}>
        <div className={theme.card}>
          <div className={homeStyles.statLabel}>Maintenance</div>
          <span className={maintenanceReady ? theme.pillOk : theme.pillBrass}>{maintenanceReady ? 'Ready' : 'Not started'}</span>
          <div className={homeStyles.statValue} style={{ marginTop: '0.4rem' }}>
            {formatCurrency(maintenanceTotal)}
          </div>
        </div>
        <div className={theme.card}>
          <div className={homeStyles.statLabel}>Water</div>
          <span className={waterReady ? theme.pillOk : theme.pillBrass}>{waterReady ? 'Ready' : 'Not started'}</span>
          <div className={homeStyles.statValue} style={{ marginTop: '0.4rem' }}>
            {formatCurrency(waterTotal)}
          </div>
        </div>
        <div className={theme.card}>
          <div className={homeStyles.statLabel}>Bills</div>
          <span className={maintenanceReady ? theme.pillOk : theme.pillBrass}>
            {maintenanceReady ? `${billsGenerated} generated` : 'Not started'}
          </span>
          <div className={homeStyles.statValue} style={{ marginTop: '0.4rem' }}>
            {formatCurrency(billsTotal)}
          </div>
        </div>
        <div className={theme.card}>
          <div className={homeStyles.statLabel}>Collections</div>
          <span className={collectionsComplete ? theme.pillOk : collectionsStarted ? theme.pillBrass : theme.pillFlag}>
            {flatsPaidCount} / {billableFlats.length} paid
          </span>
          <div className={homeStyles.statValue} style={{ marginTop: '0.4rem' }}>
            {formatCurrency(collected)}
          </div>
        </div>
      </div>

      <div className={theme.card} style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        <div className={homeStyles.statLabel}>Outstanding</div>
        <div className={`${homeStyles.statValue} ${outstanding > 0 ? theme.warnText : ''}`} style={{ fontSize: '2.2rem' }}>
          {formatCurrency(outstanding)}
        </div>
      </div>

      <h2 className={homeStyles.sectionTitle}>{formatMonthLabel(month)} billing</h2>
      <div className={styles.steps}>
        <div className={styles.step}>
          <div className={maintenanceReady ? styles.stepNumberDone : styles.stepNumber}>1</div>
          <div className={styles.stepTitle}>Maintenance</div>
          <div className={styles.stepStatus}>{maintenanceReady ? 'Complete' : currentPeriod ? 'Draft' : 'Not started'}</div>
          <div className={styles.stepAmount}>{formatCurrency(maintenanceTotal)}</div>
          <Link href="/living/maintenance" className={theme.buttonGhost}>
            View
          </Link>
        </div>
        <div className={styles.step}>
          <div className={waterReady ? styles.stepNumberDone : styles.stepNumber}>2</div>
          <div className={styles.stepTitle}>Water</div>
          <div className={styles.stepStatus}>{waterReady ? 'Complete' : 'Not started'}</div>
          <div className={styles.stepAmount}>{formatCurrency(waterTotal)}</div>
          <Link href="/living/water" className={theme.buttonGhost}>
            View
          </Link>
        </div>
        <div className={styles.step}>
          <div className={maintenanceReady ? styles.stepNumberDone : styles.stepNumber}>3</div>
          <div className={styles.stepTitle}>Bills</div>
          <div className={styles.stepStatus}>{maintenanceReady ? `${billsGenerated} bills generated` : 'Not started'}</div>
          <div className={styles.stepAmount}>{formatCurrency(billsTotal)}</div>
          <Link href="/living/bills" className={theme.buttonGhost}>
            View Bills
          </Link>
        </div>
        <div className={styles.step}>
          <div className={collectionsComplete ? styles.stepNumberDone : styles.stepNumber}>4</div>
          <div className={styles.stepTitle}>Collections</div>
          <div className={styles.stepStatus}>{collectionsComplete ? 'Complete' : collectionsStarted ? 'In progress' : 'Not started'}</div>
          <div className={styles.stepAmount}>
            {flatsPaidCount} / {billableFlats.length} paid
          </div>
          <Link href="/living/payments" className={theme.buttonGhost}>
            Payments
          </Link>
        </div>
      </div>

      <h2 className={homeStyles.sectionTitle}>Needs attention</h2>
      <div className={homeStyles.rowList} style={{ marginBottom: '1.5rem' }}>
        {flatsWithPreviousDue.length > 0 && (
          <div className={homeStyles.row}>
            <span>{flatsWithPreviousDue.length} flats have outstanding previous dues</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <strong className={theme.warnText}>{formatCurrency(previousDueTotal)}</strong>
              <Link href="/living/bills?filter=due">View all →</Link>
            </span>
          </div>
        )}
        {unpaidFlats.length > 0 && (
          <div className={homeStyles.row}>
            <span>{unpaidFlats.length} flats haven&rsquo;t fully paid this period&rsquo;s bills</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <strong className={theme.warnText}>{formatCurrency(unpaidTotal)}</strong>
              <Link href="/living/bills?filter=unpaid">View all →</Link>
            </span>
          </div>
        )}
        {flatsWithPreviousDue.length === 0 && unpaidFlats.length === 0 && (
          <div className={homeStyles.row}>
            <span className={theme.muted}>Nothing outstanding — every billable flat is paid up.</span>
          </div>
        )}
      </div>

      <h2 className={homeStyles.sectionTitle}>{formatMonthLabel(month)} status</h2>
      <div className={theme.card}>
        <div className={styles.checklist}>
          <div className={styles.checklistItem}>
            <span className={maintenanceReady ? styles.checkDone : styles.checkOpen}>{maintenanceReady ? '✓' : '○'}</span>
            <span>Maintenance entered</span>
          </div>
          <div className={styles.checklistItem}>
            <span className={waterReady ? styles.checkDone : styles.checkOpen}>{waterReady ? '✓' : '○'}</span>
            <span>Water entered</span>
          </div>
          <div className={styles.checklistItem}>
            <span className={maintenanceReady ? styles.checkDone : styles.checkOpen}>{maintenanceReady ? '✓' : '○'}</span>
            <span>Bills generated</span>
          </div>
          <div className={styles.checklistItem}>
            <span className={collectionsComplete ? styles.checkDone : styles.checkOpen}>{collectionsComplete ? '✓' : '○'}</span>
            <span>{collectionsComplete ? 'All payments collected' : `${billableFlats.length - flatsPaidCount} flats still to pay`}</span>
          </div>
        </div>
        <Link href="/living/statements" className={theme.buttonGhost}>
          Review Financial Statement
        </Link>
      </div>
    </>
  )
}
