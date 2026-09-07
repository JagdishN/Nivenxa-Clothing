import Link from 'next/link'
import { requireMembership } from '@/lib/living/auth'
import { formatCurrency, formatMonthLabel, formatPeriodLabel, monthKeyFor } from '@/lib/living/format'
import { computeBillForFlat, getBillableFlats, getFlats } from '@/lib/living/queries'
import theme from '../../LivingTheme.module.scss'
import homeStyles from '../Home.module.scss'

/**
 * The consolidated view that was missing — every BILLABLE flat's computed
 * bill (maintenance share + water charge, from computeBillForFlat) in one
 * table. Shared/common meters and merged second-meter flats never get a
 * standalone row here — their charges are folded into whichever flat
 * getBillableFlats() says they belong to (see queries.ts).
 */
export default async function LivingBillsPage() {
  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const month = monthKeyFor(new Date())
  const flats = getBillableFlats(await getFlats(supabase, apartment.id))

  const rows: {
    flatNo: string
    ownerName: string | null
    maintenance: number
    water: number
    lateFee: number
    previousDue: number
    advance: number
    total: number
    fallback: boolean
  }[] = []
  let maintenancePeriod: { start: string; end: string } | null = null
  for (const flat of flats) {
    const bill = await computeBillForFlat(supabase, apartment, flat, month)
    maintenancePeriod ??= bill.maintenance_period
    rows.push({
      flatNo: flat.flat_no,
      ownerName: flat.owner_name,
      maintenance: bill.maintenance_share,
      water: bill.water_charge,
      lateFee: bill.late_fee,
      previousDue: bill.previous_due,
      advance: bill.advance_payment,
      total: bill.total_due,
      fallback: bill.water_is_fallback,
    })
  }

  const totals = rows.reduce(
    (acc, r) => ({
      maintenance: acc.maintenance + r.maintenance,
      water: acc.water + r.water,
      lateFee: acc.lateFee + r.lateFee,
      previousDue: acc.previousDue + r.previousDue,
      advance: acc.advance + r.advance,
      total: acc.total + r.total,
    }),
    { maintenance: 0, water: 0, lateFee: 0, previousDue: 0, advance: 0, total: 0 }
  )

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 className={theme.heading} style={{ fontSize: '1.6rem', margin: 0 }}>
          Bills — {formatMonthLabel(month)}
        </h1>
        <Link href="/api/living/bills/export" className={theme.buttonGhost} prefetch={false}>
          Download bills (.xlsx)
        </Link>
      </div>
      <p className={theme.muted} style={{ marginTop: '0.3rem', marginBottom: '1.5rem' }}>
        Every flat&rsquo;s computed maintenance share + water charge for this month, in one place.
        {apartment.shared_cost_divisor && ' Common costs are split using the divisor override set in Setup, not the raw flat count.'}
        {maintenancePeriod && ` Maintenance covers ${formatPeriodLabel(maintenancePeriod.start, maintenancePeriod.end)}.`}
      </p>

      {flats.length === 0 ? (
        <div className={theme.card}>
          <p className={theme.muted}>Add flats in Setup first.</p>
        </div>
      ) : (
        <div className={theme.card}>
          <div className={theme.tableScroll}>
            <table className={theme.table}>
              <thead>
                <tr>
                  <th>Flat</th>
                  <th>Owner</th>
                  <th className={theme.num}>Maintenance</th>
                  <th className={theme.num}>Water</th>
                  <th className={theme.num}>Late fee</th>
                  <th className={theme.num}>Previous due</th>
                  <th className={theme.num}>Advance</th>
                  <th className={theme.num}>Total due</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.flatNo}>
                    <td>{r.flatNo}</td>
                    <td>{r.ownerName ?? '—'}</td>
                    <td className={theme.num}>{formatCurrency(r.maintenance)}</td>
                    <td className={theme.num}>
                      {formatCurrency(r.water)}
                      {r.fallback && <span className={theme.pillFlag} style={{ marginLeft: '0.4rem' }}>est.</span>}
                    </td>
                    <td className={theme.num}>{formatCurrency(r.lateFee)}</td>
                    <td className={theme.num}>{formatCurrency(r.previousDue)}</td>
                    <td className={theme.num}>−{formatCurrency(r.advance)}</td>
                    <td className={theme.num} style={{ fontWeight: 700 }}>
                      {formatCurrency(r.total)}
                    </td>
                  </tr>
                ))}
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
                    {formatCurrency(totals.lateFee)}
                  </td>
                  <td className={theme.num} style={{ fontWeight: 700 }}>
                    {formatCurrency(totals.previousDue)}
                  </td>
                  <td className={theme.num} style={{ fontWeight: 700 }}>
                    −{formatCurrency(totals.advance)}
                  </td>
                  <td className={theme.num} style={{ fontWeight: 700 }}>
                    {formatCurrency(totals.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <p className={homeStyles.statSub} style={{ marginTop: '1rem' }}>
        <span className={theme.pillFlag}>est.</span> marks a flat currently billed via the broken-meter fallback, not a fresh reading.
      </p>
    </>
  )
}
