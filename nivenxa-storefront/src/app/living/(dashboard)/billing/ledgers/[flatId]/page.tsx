import type { ReactNode } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireMembership } from '@/lib/living/auth'
import { formatCurrency, formatPaymentMethod, formatPeriodLabel } from '@/lib/living/format'
import { getFlatLedgerHistory, getFlats } from '@/lib/living/queries'
import theme from '../../../../LivingTheme.module.scss'
import homeStyles from '../../../Home.module.scss'

function Amount({ value, variant }: { value: number; variant?: 'warn' | 'credit' }): ReactNode {
  if (Math.abs(value) < 0.005) return <span className={theme.dash}>—</span>
  return <span className={variant === 'warn' ? theme.warnText : variant === 'credit' ? theme.creditText : undefined}>{formatCurrency(value)}</span>
}

export default async function LivingFlatLedgerPage({ params }: { params: Promise<{ flatId: string }> }) {
  const { flatId } = await params
  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const flats = await getFlats(supabase, apartment.id)
  const flat = flats.find((f) => f.id === flatId)
  if (!flat) notFound()

  const history = await getFlatLedgerHistory(supabase, apartment, flat)

  return (
    <>
      <p style={{ marginBottom: '0.5rem' }}>
        <Link href="/living/billing/ledgers" className={theme.muted}>
          ← All ledgers
        </Link>
      </p>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 className={theme.heading} style={{ fontSize: '1.6rem', margin: 0 }}>
            Flat {flat.flat_no} {flat.owner_name && <span className={theme.muted}>— {flat.owner_name}</span>}
          </h1>
          <p className={theme.muted} style={{ marginTop: '0.3rem' }}>
            Every bill and payment recorded against this flat, oldest first, with a running balance.
          </p>
        </div>
        <Link href="/living/payments" className={theme.button}>
          Record a payment
        </Link>
      </div>

      <div className={homeStyles.grid} style={{ marginBottom: '1.5rem' }}>
        <div className={theme.card}>
          <div className={homeStyles.statLabel}>Current balance</div>
          <div className={`${homeStyles.statValue} ${history.closingBalance > 0 ? theme.warnText : ''}`}>{formatCurrency(history.closingBalance)}</div>
          <div className={homeStyles.statSub}>{history.closingBalance > 0 ? 'Still owed' : history.closingBalance < 0 ? 'In credit' : 'Settled'}</div>
        </div>
      </div>

      <div className={theme.card}>
        <div className={theme.tableScroll}>
          <table className={theme.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th className={theme.num}>Debit</th>
                <th className={theme.num}>Credit</th>
                <th className={`${theme.num} ${theme.totalCol}`}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {history.transactions.map((t, i) => (
                <tr key={i}>
                  <td>{new Date(t.date).toLocaleDateString('en-IN')}</td>
                  <td>
                    {t.kind === 'opening' && 'Opening balance'}
                    {t.kind === 'bill' && `Bill — ${formatPeriodLabel(t.periodStart, t.periodEnd)}`}
                    {t.kind === 'payment' && (
                      <>
                        Payment — {formatPaymentMethod(t.method)}
                        {t.referenceNote && <span className={theme.muted}> ({t.referenceNote})</span>}
                      </>
                    )}
                  </td>
                  <td className={theme.num}>
                    <Amount value={t.kind !== 'payment' ? t.amount : 0} variant="warn" />
                  </td>
                  <td className={theme.num}>
                    <Amount value={t.kind === 'payment' ? t.amount : 0} variant="credit" />
                  </td>
                  <td className={`${theme.num} ${theme.totalCol}`} style={{ fontWeight: 700 }}>
                    {formatCurrency(t.balance)}
                  </td>
                </tr>
              ))}
              {history.transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className={theme.muted}>
                    No published billing periods yet — the ledger starts once the first one is published on the Maintenance page.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
