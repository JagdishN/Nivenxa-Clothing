import Link from 'next/link'
import { requireMembership } from '@/lib/living/auth'
import { formatCurrency, formatMonthLabel, monthKeyFor } from '@/lib/living/format'
import { computeBillForFlat, getFlats, getOpenDisputes, getPendingClaims, getRiseAlerts } from '@/lib/living/queries'
import theme from '../../LivingTheme.module.scss'
import styles from '../Home.module.scss'

export default async function LivingAppHomePage() {
  const { supabase, membership, apartment } = await requireMembership()
  const month = monthKeyFor(new Date())

  if (membership.role === 'owner') {
    const flatId = membership.flat_id
    const flat = flatId ? (await getFlats(supabase, apartment.id)).find((f) => f.id === flatId) : undefined

    return (
      <>
        <h1 className={theme.heading} style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>
          {apartment.name}
        </h1>
        <p className={theme.muted} style={{ marginBottom: '1.5rem' }}>{formatMonthLabel(month)}</p>

        {flat ? (
          <BillSummaryCard supabase={supabase} apartment={apartment} flat={flat} month={month} />
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

  return (
    <>
      <h1 className={theme.heading} style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>
        {apartment.name}
      </h1>
      <p className={theme.muted} style={{ marginBottom: '1.5rem' }}>{formatMonthLabel(month)}</p>

      <div className={styles.grid}>
        <div className={theme.card}>
          <div className={styles.statLabel}>Flats</div>
          <div className={styles.statValue}>{flats.length} / {apartment.flat_count}</div>
          <div className={styles.statSub}>Split: {apartment.flat_split === 'equal' ? 'Equal' : 'Weighted by sq ft'}</div>
        </div>
        {membership.role === 'admin' && (
          <div className={theme.card}>
            <div className={styles.statLabel}>Join code</div>
            <div className={`${styles.statValue} ${styles.joinCode}`}>{apartment.join_code}</div>
            <div className={styles.statSub}>Share this with owners to let them join</div>
          </div>
        )}
        <div className={theme.card}>
          <div className={styles.statLabel}>Open disputes</div>
          <div className={styles.statValue}>{openDisputes.length}</div>
          <div className={styles.statSub}>
            <Link href="/living/disputes">Review queue →</Link>
          </div>
        </div>
        {membership.role === 'admin' && (
          <div className={theme.card}>
            <div className={styles.statLabel}>Pending flat requests</div>
            <div className={styles.statValue}>{pendingClaims.length}</div>
            <div className={styles.statSub}>
              <Link href="/living/setup">Review in Setup →</Link>
            </div>
          </div>
        )}
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

async function BillSummaryCard({
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
  const bill = await computeBillForFlat(supabase, apartment, flat, month)

  return (
    <div className={theme.card}>
      <div className={theme.muted}>Flat {flat.flat_no}</div>
      <div className={styles.billSummary}>
        <div className={styles.billLine}>
          <span>Maintenance share</span>
          <span className={theme.num}>{formatCurrency(bill.maintenance_share)}</span>
        </div>
        <div className={styles.billLine}>
          <span>Water charge{bill.water_is_fallback ? ' (estimated)' : ''}</span>
          <span className={theme.num}>{formatCurrency(bill.water_charge)}</span>
        </div>
        <div className={styles.billTotal}>
          <span>Total due</span>
          <span className={theme.num}>{formatCurrency(bill.total_due)}</span>
        </div>
      </div>
      {bill.water_fallback_reason && <p className={styles.statSub}>{bill.water_fallback_reason}</p>}
      <Link href="/living/bill" className={theme.buttonGhost} style={{ display: 'inline-block', marginTop: '1rem' }}>
        Full bill & reading history →
      </Link>
    </div>
  )
}
