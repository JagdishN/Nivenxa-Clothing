import type { ReactNode } from 'react'
import Link from 'next/link'
import { requireMembership } from '@/lib/living/auth'
import { formatCurrency, formatMonthLabel, formatPaymentStatus, formatPeriodLabel, monthKeyFor } from '@/lib/living/format'
import { computeBillForFlat, getBillableFlats, getFlats } from '@/lib/living/queries'
import type { PaymentStatus } from '@/lib/living/types'
import theme from '../../LivingTheme.module.scss'
import homeStyles from '../Home.module.scss'

type QuickFilter = 'all' | 'due' | 'unpaid'

function statusPillClass(status: PaymentStatus): string {
  if (status === 'paid') return theme.pillOk
  if (status === 'partial') return theme.pillBrass
  return theme.pillFlag
}

/** Zero is noise in a 30-row table — render it as a plain dash instead of ₹0.00 / −₹0.00. */
function Amount({ value, sign, variant }: { value: number; sign?: string; variant?: 'warn' | 'credit' }): ReactNode {
  if (Math.abs(value) < 0.005) return <span className={theme.dash}>—</span>
  const className = variant === 'warn' ? theme.warnText : variant === 'credit' ? theme.creditText : undefined
  return <span className={className}>{sign}{formatCurrency(value)}</span>
}

function filterHref(filter: QuickFilter, q: string): string {
  const params = new URLSearchParams()
  params.set('filter', filter)
  if (q) params.set('q', q)
  return `/living/bills?${params.toString()}`
}

/**
 * The consolidated view that was missing — every BILLABLE flat's computed
 * bill (maintenance share + water charge, from computeBillForFlat) in one
 * table. Shared/common meters and merged second-meter flats never get a
 * standalone row here — their charges are folded into whichever flat
 * getBillableFlats() says they belong to (see queries.ts).
 */
export default async function LivingBillsPage({ searchParams }: { searchParams: Promise<{ q?: string; filter?: string }> }) {
  const { q: qParam, filter: filterParam } = await searchParams
  const q = (qParam ?? '').trim()
  const filter: QuickFilter = filterParam === 'due' || filterParam === 'unpaid' ? filterParam : 'all'

  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const month = monthKeyFor(new Date())
  const flats = getBillableFlats(await getFlats(supabase, apartment.id))

  const rows: {
    flatId: string
    flatNo: string
    ownerName: string | null
    maintenance: number
    water: number
    periodTotal: number
    lateFee: number
    previousDue: number
    advance: number
    total: number
    paid: number
    balance: number
    status: PaymentStatus
    fallback: boolean
  }[] = []
  let maintenancePeriod: { start: string; end: string } | null = null
  for (const flat of flats) {
    const bill = await computeBillForFlat(supabase, apartment, flat, month)
    maintenancePeriod ??= bill.maintenance_period
    rows.push({
      flatId: flat.id,
      flatNo: flat.flat_no,
      ownerName: flat.owner_name,
      maintenance: bill.maintenance_share,
      water: bill.water_charge,
      periodTotal: bill.current_period_total,
      lateFee: bill.late_fee,
      previousDue: bill.previous_due,
      advance: bill.advance_payment,
      total: bill.total_due,
      paid: bill.amount_paid,
      balance: bill.balance_remaining,
      status: bill.payment_status,
      fallback: bill.water_is_fallback,
    })
  }

  // Summary cards always reflect the whole apartment — the numbers an Admin
  // actually opens this page to check — regardless of the table's own
  // search/filter state below.
  const totals = rows.reduce(
    (acc, r) => ({
      maintenance: acc.maintenance + r.maintenance,
      water: acc.water + r.water,
      periodTotal: acc.periodTotal + r.periodTotal,
      lateFee: acc.lateFee + r.lateFee,
      previousDue: acc.previousDue + r.previousDue,
      advance: acc.advance + r.advance,
      total: acc.total + r.total,
      paid: acc.paid + r.paid,
      balance: acc.balance + r.balance,
    }),
    { maintenance: 0, water: 0, periodTotal: 0, lateFee: 0, previousDue: 0, advance: 0, total: 0, paid: 0, balance: 0 }
  )

  const qLower = q.toLowerCase()
  const visibleRows = rows.filter((r) => {
    if (qLower && !r.flatNo.toLowerCase().includes(qLower) && !(r.ownerName ?? '').toLowerCase().includes(qLower)) return false
    if (filter === 'due' && r.previousDue <= 0) return false
    if (filter === 'unpaid' && r.status === 'paid') return false
    return true
  })

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 className={theme.heading} style={{ fontSize: '1.6rem', margin: 0 }}>
            {formatMonthLabel(month)} Bills
          </h1>
          <p className={theme.muted} style={{ marginTop: '0.3rem' }}>
            {maintenancePeriod ? (
              <>Maintenance period: {formatPeriodLabel(maintenancePeriod.start, maintenancePeriod.end)}</>
            ) : (
              <>No maintenance period started yet</>
            )}
            {' · '}Water billing: {formatMonthLabel(month)}
            {apartment.shared_cost_divisor && (
              <span
                className={theme.infoIcon}
                title={`Common costs (maintenance + water supply) are split using a divisor of ${apartment.shared_cost_divisor}, set in Setup — not the raw flat count (${flats.length}).`}
              >
                i
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <Link href="/living/payments" className={theme.buttonGhost}>
            Record payments
          </Link>
          <Link href="/api/living/bills/export" className={theme.buttonGhost} prefetch={false}>
            Download bills (.xlsx)
          </Link>
        </div>
      </div>

      {flats.length === 0 ? (
        <div className={theme.card} style={{ marginTop: '1.5rem' }}>
          <p className={theme.muted}>Add flats in Setup first.</p>
        </div>
      ) : (
        <>
          <div className={homeStyles.grid} style={{ marginTop: '1.5rem' }}>
            <div className={theme.card}>
              <div className={homeStyles.statLabel}>Total maintenance</div>
              <div className={homeStyles.statValue}>{formatCurrency(totals.maintenance)}</div>
            </div>
            <div className={theme.card}>
              <div className={homeStyles.statLabel}>Total water</div>
              <div className={homeStyles.statValue}>{formatCurrency(totals.water)}</div>
            </div>
            <div className={theme.card}>
              <div className={homeStyles.statLabel}>Previous dues</div>
              <div className={`${homeStyles.statValue} ${totals.previousDue > 0 ? theme.warnText : ''}`}>{formatCurrency(totals.previousDue)}</div>
            </div>
            <div className={theme.card}>
              <div className={homeStyles.statLabel}>Total amount due</div>
              <div className={homeStyles.statValue}>{formatCurrency(totals.total)}</div>
            </div>
          </div>

          <div className={theme.filterBar}>
            <form method="GET" className={theme.searchForm}>
              <input type="hidden" name="filter" value={filter} />
              <input type="search" name="q" defaultValue={q} placeholder="Search flat / owner" className={theme.searchInput} />
              <button type="submit" className={theme.buttonGhost}>
                Search
              </button>
            </form>
            <Link href={filterHref('all', q)} className={filter === 'all' ? theme.filterChipActive : theme.filterChip}>
              All flats
            </Link>
            <Link href={filterHref('due', q)} className={filter === 'due' ? theme.filterChipActive : theme.filterChip}>
              With previous dues
            </Link>
            <Link href={filterHref('unpaid', q)} className={filter === 'unpaid' ? theme.filterChipActive : theme.filterChip}>
              Unpaid
            </Link>
          </div>

          <div className={theme.card}>
            <div className={theme.tableScroll}>
              <table className={theme.table}>
                <thead>
                  <tr>
                    <th>Flat</th>
                    <th>Owner</th>
                    <th className={theme.num}>Maintenance</th>
                    <th className={theme.num}>Water</th>
                    <th className={theme.num}>Current Cycle Total</th>
                    <th className={theme.num}>Late fee</th>
                    <th className={theme.num}>Previous due</th>
                    <th className={theme.num}>Advance</th>
                    <th className={`${theme.num} ${theme.totalCol}`}>Total due</th>
                    <th className={theme.num}>Paid</th>
                    <th className={theme.num}>Balance</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((r) => (
                    <tr key={r.flatId}>
                      <td>
                        <Link href={`/living/billing/ledgers/${r.flatId}`}>{r.flatNo}</Link>
                      </td>
                      <td>{r.ownerName ?? '—'}</td>
                      <td className={theme.num}>{formatCurrency(r.maintenance)}</td>
                      <td className={theme.num}>
                        {formatCurrency(r.water)}
                        {r.fallback && (
                          <span className={theme.pillFlag} style={{ marginLeft: '0.4rem' }}>
                            est.
                          </span>
                        )}
                      </td>
                      <td className={theme.num}>{formatCurrency(r.periodTotal)}</td>
                      <td className={theme.num}>
                        <Amount value={r.lateFee} />
                      </td>
                      <td className={theme.num}>
                        <Amount value={r.previousDue} variant="warn" />
                      </td>
                      <td className={theme.num}>
                        <Amount value={r.advance} sign="−" variant="credit" />
                      </td>
                      <td className={`${theme.num} ${theme.totalCol}`} style={{ fontWeight: 700 }}>
                        {formatCurrency(r.total)}
                      </td>
                      <td className={theme.num}>
                        <Amount value={r.paid} />
                      </td>
                      <td className={theme.num}>
                        <Amount value={r.balance} />
                      </td>
                      <td>
                        <span className={statusPillClass(r.status)}>{formatPaymentStatus(r.status)}</span>
                      </td>
                    </tr>
                  ))}
                  {visibleRows.length === 0 && (
                    <tr>
                      <td colSpan={12} className={theme.muted}>
                        No flats match this search/filter.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2} style={{ fontWeight: 700 }}>
                      Apartment total
                    </td>
                    <td className={theme.num} style={{ fontWeight: 700 }}>
                      {formatCurrency(totals.maintenance)}
                    </td>
                    <td className={theme.num} style={{ fontWeight: 700 }}>
                      {formatCurrency(totals.water)}
                    </td>
                    <td className={theme.num} style={{ fontWeight: 700 }}>
                      {formatCurrency(totals.periodTotal)}
                    </td>
                    <td className={theme.num} style={{ fontWeight: 700 }}>
                      {formatCurrency(totals.lateFee)}
                    </td>
                    <td className={theme.num} style={{ fontWeight: 700 }}>
                      {formatCurrency(totals.previousDue)}
                    </td>
                    <td className={theme.num} style={{ fontWeight: 700 }}>
                      −{formatCurrency(totals.advance)}
                    </td>
                    <td className={`${theme.num} ${theme.totalCol}`} style={{ fontWeight: 700 }}>
                      {formatCurrency(totals.total)}
                    </td>
                    <td className={theme.num} style={{ fontWeight: 700 }}>
                      {formatCurrency(totals.paid)}
                    </td>
                    <td className={theme.num} style={{ fontWeight: 700 }}>
                      {formatCurrency(totals.balance)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      <p className={homeStyles.statSub} style={{ marginTop: '1rem' }}>
        <span className={theme.pillFlag}>est.</span> marks a flat currently billed via the broken-meter fallback, not a fresh reading.
      </p>
    </>
  )
}
