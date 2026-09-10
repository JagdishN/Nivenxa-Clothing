import type { ReactNode } from 'react'
import Link from 'next/link'
import { requireMembership } from '@/lib/living/auth'
import { round2 } from '@/lib/living/billing'
import { formatCurrency, formatMonthLabel, monthKeyFor } from '@/lib/living/format'
import { computeBillForFlat, getBillableFlats, getFlats } from '@/lib/living/queries'
import MaterialIcon from '../../../MaterialIcon'
import theme from '../../../LivingTheme.module.scss'
import homeStyles from '../../Home.module.scss'

/** Zero is noise in a 30-row table — render it as a plain dash instead of ₹0.00. */
function Amount({ value, variant }: { value: number; variant?: 'warn' | 'credit' }): ReactNode {
  if (Math.abs(value) < 0.005) return <span className={theme.dash}>—</span>
  return <span className={variant === 'warn' ? theme.warnText : variant === 'credit' ? theme.creditText : undefined}>{formatCurrency(value)}</span>
}

/**
 * One row per flat, snapshotted for the current period — Opening (what it
 * carried in), Bills (this period's own new charge), Payments (collected
 * this period), Balance (what's still owed). Click through to a flat's own
 * page for the full transaction-by-transaction history — see
 * getFlatLedgerHistory in lib/living/queries.ts.
 */
export default async function LivingLedgersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q: qParam } = await searchParams
  const q = (qParam ?? '').trim().toLowerCase()

  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const month = monthKeyFor(new Date())
  const flats = getBillableFlats(await getFlats(supabase, apartment.id))

  const rows = await Promise.all(
    flats.map(async (flat) => {
      const bill = await computeBillForFlat(supabase, apartment, flat, month)
      return {
        flat,
        opening: bill.previous_due,
        billed: round2(bill.total_due - bill.previous_due),
        paid: bill.amount_paid,
        balance: bill.balance_remaining,
      }
    })
  )

  const visibleRows = q
    ? rows.filter((r) => r.flat.flat_no.toLowerCase().includes(q) || (r.flat.owner_name ?? '').toLowerCase().includes(q))
    : rows

  const totals = rows.reduce(
    (acc, r) => ({ opening: acc.opening + r.opening, billed: acc.billed + r.billed, paid: acc.paid + r.paid, balance: acc.balance + r.balance }),
    { opening: 0, billed: 0, paid: 0, balance: 0 }
  )

  return (
    <>
      <h1 className={theme.heading} style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>
        Flat Ledgers
      </h1>
      <p className={theme.muted} style={{ marginBottom: '1.5rem' }}>
        Every flat&rsquo;s running account — what it carried in, what this period billed, what came in, what&rsquo;s left. Open a flat for
        its full transaction history.
      </p>

      {flats.length === 0 ? (
        <div className={theme.card}>
          <p className={theme.muted}>Add flats in Setup first.</p>
        </div>
      ) : (
        <>
          <div className={homeStyles.grid} style={{ marginBottom: '1.5rem' }}>
            <div className={theme.card}>
              <div className={homeStyles.statLabel}>Opening (this period)</div>
              <div className={`${homeStyles.statValue} ${totals.opening > 0 ? theme.warnText : ''}`}>{formatCurrency(totals.opening)}</div>
            </div>
            <div className={theme.card}>
              <div className={homeStyles.statLabel}>Billed this period</div>
              <div className={homeStyles.statValue}>{formatCurrency(totals.billed)}</div>
            </div>
            <div className={theme.card}>
              <div className={homeStyles.statLabel}>Collected this period</div>
              <div className={`${homeStyles.statValue} ${theme.creditText}`}>{formatCurrency(totals.paid)}</div>
            </div>
            <div className={theme.card}>
              <div className={homeStyles.statLabel}>Outstanding balance</div>
              <div className={`${homeStyles.statValue} ${totals.balance > 0 ? theme.warnText : ''}`}>{formatCurrency(totals.balance)}</div>
            </div>
          </div>

          <form method="GET" className={theme.searchForm} style={{ marginBottom: '1rem' }}>
            <input type="search" name="q" defaultValue={qParam ?? ''} placeholder="Search flat / owner" className={theme.searchInput} />
            <button type="submit" className={theme.buttonGhost}>
              Search
            </button>
          </form>

          <div className={theme.card}>
            <p className={theme.muted} style={{ marginBottom: '0.75rem' }}>
              {formatMonthLabel(month)}
            </p>
            <div className={theme.tableScroll}>
              <table className={theme.table}>
                <thead>
                  <tr>
                    <th>Flat</th>
                    <th>Resident</th>
                    <th className={theme.num}>Opening</th>
                    <th className={theme.num}>Bills</th>
                    <th className={theme.num}>Payments</th>
                    <th className={`${theme.num} ${theme.totalCol}`}>Balance</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((r) => (
                    <tr key={r.flat.id}>
                      <td>{r.flat.flat_no}</td>
                      <td>{r.flat.owner_name ?? '—'}</td>
                      <td className={theme.num}>
                        <Amount value={r.opening} variant="warn" />
                      </td>
                      <td className={theme.num}>
                        <Amount value={r.billed} />
                      </td>
                      <td className={theme.num}>
                        <Amount value={r.paid} variant="credit" />
                      </td>
                      <td className={`${theme.num} ${theme.totalCol}`} style={{ fontWeight: 700 }}>
                        {formatCurrency(r.balance)}
                      </td>
                      <td>
                        <Link href={`/living/billing/ledgers/${r.flat.id}`} className={theme.iconButton} title={`Open Flat ${r.flat.flat_no}'s ledger`}>
                          <MaterialIcon name="arrow_forward" size={20} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {visibleRows.length === 0 && (
                    <tr>
                      <td colSpan={7} className={theme.muted}>
                        No flats match this search.
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
                      {formatCurrency(totals.opening)}
                    </td>
                    <td className={theme.num} style={{ fontWeight: 700 }}>
                      {formatCurrency(totals.billed)}
                    </td>
                    <td className={theme.num} style={{ fontWeight: 700 }}>
                      {formatCurrency(totals.paid)}
                    </td>
                    <td className={`${theme.num} ${theme.totalCol}`} style={{ fontWeight: 700 }}>
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
    </>
  )
}
