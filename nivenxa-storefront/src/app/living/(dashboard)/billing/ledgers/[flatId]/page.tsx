import type { ReactNode } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireMembership } from '@/lib/living/auth'
import { formatBalanceMeaning, formatCurrency, formatPaymentMethod, formatPeriodLabel } from '@/lib/living/format'
import { getFlatLedgerHistory, getFlats, getReimbursementBalanceForFlat } from '@/lib/living/queries'
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

  const [history, reimbursementBalance] = await Promise.all([
    getFlatLedgerHistory(supabase, apartment, flat),
    getReimbursementBalanceForFlat(supabase, apartment.id, flat.id),
  ])
  // Two independent accounts, never netted together (see the LedgerTransaction doc comment in
  // queries.ts) — what this flat owes the association (opening/bill/payment) rendered as today,
  // and what the association owes THIS flat for expenses they funded personally, as its own table
  // below with its own Balance column, only when there's anything to show.
  const mainTransactions = history.transactions.filter((t) => t.kind === 'opening' || t.kind === 'bill' || t.kind === 'payment')
  const reimbursementTransactions = history.transactions.filter((t) => t.kind === 'resident_expense' || t.kind === 'reimbursement_settlement')

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
          <div className={homeStyles.statLabel}>Bill Balance</div>
          <div className={homeStyles.statValue} style={{ fontSize: '1.25rem' }}>
            {formatBalanceMeaning(history.closingBalance, reimbursementBalance, { subjectLabel: `Flat ${flat.flat_no}` })}
          </div>
        </div>
        {reimbursementBalance > 0.005 && (
          <div className={theme.card}>
            <div className={homeStyles.statLabel}>Association owes this resident</div>
            <div className={homeStyles.statValue} style={{ fontSize: '1.25rem' }}>{formatCurrency(reimbursementBalance)}</div>
          </div>
        )}
      </div>

      <div className={theme.card} style={{ marginBottom: reimbursementTransactions.length > 0 ? '1.5rem' : 0 }}>
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
              {mainTransactions.map((t, i) => (
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
              {mainTransactions.length === 0 && (
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

      {reimbursementTransactions.length > 0 && (
        <div className={theme.card}>
          <h2 className={homeStyles.sectionTitle}>Resident-Funded Expenses &amp; Reimbursements</h2>
          <p className={theme.muted} style={{ marginBottom: '0.75rem' }}>
            A separate account from the Bill Balance above — what the association owes this flat for expenses they funded
            personally, never netted into the bill balance unless a settlement was specifically an Adjust Against Bill.
          </p>
          <div className={theme.tableScroll}>
            <table className={theme.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th className={theme.num}>Owed</th>
                  <th className={theme.num}>Settled</th>
                  <th className={`${theme.num} ${theme.totalCol}`}>Remaining</th>
                </tr>
              </thead>
              <tbody>
                {reimbursementTransactions.map((t, i) => (
                  <tr key={i}>
                    <td>{new Date(t.date).toLocaleDateString('en-IN')}</td>
                    <td>
                      {t.kind === 'resident_expense' && (
                        <Link href={`/living/expenses/${t.expenseId}`}>Paid by resident — {t.description}</Link>
                      )}
                      {t.kind === 'reimbursement_settlement' && (t.settlementType === 'cash' ? 'Reimbursed to resident' : "Adjusted against resident's bill")}
                    </td>
                    <td className={theme.num}>
                      <Amount value={t.kind === 'resident_expense' ? t.amount : 0} variant="warn" />
                    </td>
                    <td className={theme.num}>
                      <Amount value={t.kind === 'reimbursement_settlement' ? t.amount : 0} variant="credit" />
                    </td>
                    <td className={`${theme.num} ${theme.totalCol}`} style={{ fontWeight: 700 }}>
                      {formatCurrency(t.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
