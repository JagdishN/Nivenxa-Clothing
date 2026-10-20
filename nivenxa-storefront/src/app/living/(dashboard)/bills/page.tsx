import type { ReactNode } from 'react'
import Link from 'next/link'
import { requireMembership } from '@/lib/living/auth'
import { formatBalanceMeaning, formatCurrency, formatMonthLabel, formatPaymentStatus, formatPeriodLabel, monthKeyFor } from '@/lib/living/format'
import { computeBillForFlat, getApartmentReimbursementsDue, getBillableFlats, getCurrentMaintenancePeriod, getFlats, getRelevantWaterMonth } from '@/lib/living/queries'
import type { PaymentStatus } from '@/lib/living/types'
import theme from '../../LivingTheme.module.scss'
import homeStyles from '../Home.module.scss'

type QuickFilter = 'all' | 'unpaid' | 'partial' | 'paid' | 'advance' | 'reimbursement_due'

function statusPillClass(status: PaymentStatus): string {
  if (status === 'paid') return theme.pillOk
  if (status === 'partial') return theme.pillBrass
  if (status === 'not_billed') return theme.pill
  return theme.pillFlag
}

/** Adjustments nets Late fee + Previous due − Advance − Reimbursement credit into one figure — same
 * components computeBillForFlat already nets into total_due, just surfaced as one column instead of
 * three. The full breakdown stays one click away on the flat's own ledger (linked from Flat below). */
function AdjustmentAmount({ value }: { value: number }): ReactNode {
  if (Math.abs(value) < 0.005) return <span className={theme.dash}>—</span>
  const isCredit = value < 0
  return <span className={isCredit ? theme.creditText : theme.warnText}>{isCredit ? '−' : ''}{formatCurrency(Math.abs(value))}</span>
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
  const validFilters: QuickFilter[] = ['unpaid', 'partial', 'paid', 'advance', 'reimbursement_due']
  const filter: QuickFilter = validFilters.includes(filterParam as QuickFilter) ? (filterParam as QuickFilter) : 'all'

  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const [allFlats, maintenanceMonth] = await Promise.all([getFlats(supabase, apartment.id), getCurrentMaintenancePeriod(supabase, apartment.id)])
  const flats = getBillableFlats(allFlats)
  const month = getRelevantWaterMonth(maintenanceMonth, monthKeyFor(new Date()))

  const [bills, reimbursementsDue] = await Promise.all([
    Promise.all(flats.map((flat) => computeBillForFlat(supabase, apartment, flat, month, { allFlats, maintenanceMonth }))),
    getApartmentReimbursementsDue(supabase, apartment.id, allFlats),
  ])
  const reimbursementByFlat = new Map(reimbursementsDue.byFlat.map((r) => [r.flat.id, r.remaining]))

  const rows: {
    flatId: string
    flatNo: string
    ownerName: string | null
    maintenance: number
    water: number
    adjustments: number
    total: number
    paid: number
    balance: number
    status: PaymentStatus
    fallback: boolean
    advance: number
    previousDue: number
    reimbursementOwed: number
  }[] = flats.map((flat, i) => {
    const bill = bills[i]
    return {
      flatId: flat.id,
      flatNo: flat.flat_no,
      ownerName: flat.owner_name,
      maintenance: bill.maintenance_share,
      water: bill.water_charge,
      adjustments: bill.late_fee + bill.previous_due - bill.advance_payment - bill.reimbursement_credit,
      total: bill.total_due,
      paid: bill.amount_paid,
      balance: bill.balance_remaining,
      status: bill.payment_status,
      fallback: bill.water_is_fallback,
      advance: bill.advance_payment,
      previousDue: bill.previous_due,
      reimbursementOwed: reimbursementByFlat.get(flat.id) ?? 0,
    }
  })
  const maintenancePeriod = bills[0]?.maintenance_period ?? null

  // Summary cards always reflect the whole apartment — the numbers an Admin
  // actually opens this page to check — regardless of the table's own
  // search/filter state below.
  const totals = rows.reduce(
    (acc, r) => ({
      maintenance: acc.maintenance + r.maintenance,
      water: acc.water + r.water,
      adjustments: acc.adjustments + r.adjustments,
      total: acc.total + r.total,
      paid: acc.paid + r.paid,
      balance: acc.balance + r.balance,
      previousDue: acc.previousDue + r.previousDue,
    }),
    { maintenance: 0, water: 0, adjustments: 0, total: 0, paid: 0, balance: 0, previousDue: 0 }
  )

  const qLower = q.toLowerCase()
  const visibleRows = rows.filter((r) => {
    if (qLower && !r.flatNo.toLowerCase().includes(qLower) && !(r.ownerName ?? '').toLowerCase().includes(qLower)) return false
    if (filter === 'unpaid' && r.status !== 'unpaid') return false
    if (filter === 'partial' && r.status !== 'partial') return false
    if (filter === 'paid' && r.status !== 'paid') return false
    if (filter === 'advance' && r.advance <= 0.005) return false
    if (filter === 'reimbursement_due' && r.reimbursementOwed <= 0.005) return false
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
              All
            </Link>
            <Link href={filterHref('unpaid', q)} className={filter === 'unpaid' ? theme.filterChipActive : theme.filterChip}>
              Unpaid
            </Link>
            <Link href={filterHref('partial', q)} className={filter === 'partial' ? theme.filterChipActive : theme.filterChip}>
              Partially Paid
            </Link>
            <Link href={filterHref('paid', q)} className={filter === 'paid' ? theme.filterChipActive : theme.filterChip}>
              Paid
            </Link>
            <Link href={filterHref('advance', q)} className={filter === 'advance' ? theme.filterChipActive : theme.filterChip}>
              Advance
            </Link>
            <Link href={filterHref('reimbursement_due', q)} className={filter === 'reimbursement_due' ? theme.filterChipActive : theme.filterChip}>
              Reimbursement Due
            </Link>
          </div>

          <div className={theme.card}>
            <div className={theme.tableScroll}>
              <table className={theme.table}>
                <thead>
                  <tr>
                    <th>Flat</th>
                    <th>Resident</th>
                    <th className={theme.num}>Maintenance</th>
                    <th className={theme.num}>Water</th>
                    <th className={theme.num}>Adjustments</th>
                    <th className={`${theme.num} ${theme.totalCol}`}>Amount Due</th>
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
                      <td className={theme.num}>
                        <AdjustmentAmount value={r.adjustments} />
                      </td>
                      <td className={`${theme.num} ${theme.totalCol}`} style={{ fontWeight: 700 }}>
                        {formatCurrency(r.total)}
                      </td>
                      <td className={theme.num}>{formatBalanceMeaning(r.balance, r.reimbursementOwed, { subjectLabel: `Flat ${r.flatNo}` })}</td>
                      <td>
                        <span className={statusPillClass(r.status)}>{formatPaymentStatus(r.status)}</span>
                      </td>
                    </tr>
                  ))}
                  {visibleRows.length === 0 && (
                    <tr>
                      <td colSpan={8} className={theme.muted}>
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
                      <AdjustmentAmount value={totals.adjustments} />
                    </td>
                    <td className={`${theme.num} ${theme.totalCol}`} style={{ fontWeight: 700 }}>
                      {formatCurrency(totals.total)}
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
