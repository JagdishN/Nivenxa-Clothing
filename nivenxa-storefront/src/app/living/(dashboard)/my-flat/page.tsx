import { requireMembership } from '@/lib/living/auth'
import { getFlats } from '@/lib/living/queries'
import theme from '../../LivingTheme.module.scss'
import homeStyles from '../Home.module.scss'

export default async function LivingMyFlatPage() {
  const { supabase, membership, apartment } = await requireMembership(['owner'])

  if (!membership.flat_id) {
    return (
      <div className={theme.card}>
        <p className={theme.muted}>Your account isn&rsquo;t linked to a flat yet — check with your Admin.</p>
      </div>
    )
  }

  const flats = await getFlats(supabase, apartment.id)
  const flat = flats.find((f) => f.id === membership.flat_id)
  if (!flat) {
    return (
      <div className={theme.card}>
        <p className={theme.muted}>Your account isn&rsquo;t linked to a flat yet — check with your Admin.</p>
      </div>
    )
  }

  return (
    <>
      <h1 className={theme.heading} style={{ fontSize: '1.6rem', marginBottom: '1.5rem' }}>
        My Flat
      </h1>

      <div className={theme.card} style={{ marginBottom: '1.5rem' }}>
        <div className={homeStyles.billSummary}>
          <div className={homeStyles.billLine}>
            <span>Flat</span>
            <span>{flat.flat_no}</span>
          </div>
          <div className={homeStyles.billLine}>
            <span>Owner name</span>
            <span>{flat.owner_name ?? '—'}</span>
          </div>
          <div className={homeStyles.billLine}>
            <span>Contact</span>
            <span>{flat.owner_contact ?? '—'}</span>
          </div>
          {flat.sq_ft && (
            <div className={homeStyles.billLine}>
              <span>Area</span>
              <span>{flat.sq_ft.toLocaleString('en-IN')} sq ft</span>
            </div>
          )}
        </div>
        <p className={theme.muted} style={{ marginTop: '1rem' }}>
          Something wrong here? Ask your Admin to update it — Flat details aren&rsquo;t self-editable yet.
        </p>
      </div>

      <div className={theme.card}>
        <h2 className={homeStyles.sectionTitle}>{apartment.name}</h2>
        <div className={homeStyles.billSummary}>
          <div className={homeStyles.billLine}>
            <span>Address</span>
            <span>{apartment.address}</span>
          </div>
          <div className={homeStyles.billLine}>
            <span>Need help?</span>
            <span>{apartment.admin_contact}</span>
          </div>
        </div>
      </div>
    </>
  )
}
