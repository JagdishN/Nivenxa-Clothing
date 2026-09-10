import { redirect } from 'next/navigation'
import { requireMembership } from '@/lib/living/auth'
import { setLivingError, setLivingNotice } from '@/lib/living/flash'
import { formatMonthLabel } from '@/lib/living/format'
import { getOpenDisputes } from '@/lib/living/queries'
import theme from '../../LivingTheme.module.scss'
import homeStyles from '../Home.module.scss'

function disputeStatusPillClass(status: string): string {
  if (status === 'reviewed') return theme.pill
  return theme.pillBrass
}

async function resolveAction(formData: FormData) {
  'use server'
  const { supabase } = await requireMembership(['admin', 'treasurer'])
  const { error } = await supabase.rpc('living_resolve_dispute', {
    p_reading_id: String(formData.get('reading_id')),
    p_status: String(formData.get('status')),
    p_admin_response: String(formData.get('admin_response') ?? '').trim() || null,
  })
  if (error) {
    await setLivingError(error.message)
    redirect('/living/disputes')
  }
  await setLivingNotice('Updated.')
  redirect('/living/disputes')
}

export default async function LivingDisputesPage() {
  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const disputes = await getOpenDisputes(supabase, apartment.id)

  return (
    <>
      <h1 className={theme.heading} style={{ fontSize: '1.6rem', marginBottom: '1.5rem' }}>
        Disputes queue
      </h1>

      {disputes.length === 0 ? (
        <div className={theme.card}>
          <p className={theme.muted}>Nothing open.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {disputes.map(({ reading, flat }) => (
            <div key={reading.id} className={theme.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <strong>
                  Flat {flat.flat_no} — {formatMonthLabel(reading.month)}
                </strong>
                <span className={disputeStatusPillClass(reading.dispute!.status)}>{reading.dispute!.status}</span>
              </div>
              <p className={homeStyles.statSub} style={{ marginBottom: '0.75rem' }}>
                Reading: {reading.previous_reading ?? '—'} → {reading.current_reading ?? '—'}
              </p>
              <p style={{ marginBottom: '1rem' }}>{reading.dispute!.reason}</p>

              <form action={resolveAction}>
                <input type="hidden" name="reading_id" value={reading.id} />
                <div className={theme.field}>
                  <label className={theme.label} htmlFor={`status-${reading.id}`}>
                    Status
                  </label>
                  <select id={`status-${reading.id}`} name="status" className={theme.select} defaultValue={reading.dispute!.status}>
                    <option value="open">Open</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
                <div className={theme.field}>
                  <label className={theme.label} htmlFor={`response-${reading.id}`}>
                    Response
                  </label>
                  <textarea
                    id={`response-${reading.id}`}
                    name="admin_response"
                    className={theme.textarea}
                    defaultValue={reading.dispute!.admin_response ?? ''}
                  />
                </div>
                <button type="submit" className={theme.button}>
                  Save
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
