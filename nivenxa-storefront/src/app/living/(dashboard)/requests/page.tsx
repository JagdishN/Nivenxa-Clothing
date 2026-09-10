import { redirect } from 'next/navigation'
import { requireMembership } from '@/lib/living/auth'
import { setLivingError, setLivingNotice } from '@/lib/living/flash'
import { getAllRequests, getMyRequests } from '@/lib/living/queries'
import type { RequestStatus } from '@/lib/living/types'
import theme from '../../LivingTheme.module.scss'
import homeStyles from '../Home.module.scss'

function statusPillClass(status: RequestStatus): string {
  if (status === 'resolved') return theme.pillOk
  if (status === 'in_progress') return theme.pillBrass
  return theme.pillFlag
}

function statusLabel(status: RequestStatus): string {
  if (status === 'in_progress') return 'In progress'
  return status.charAt(0).toUpperCase() + status.slice(1)
}

async function raiseRequestAction(formData: FormData) {
  'use server'
  const { supabase, membership, apartment, userId } = await requireMembership(['owner'])
  if (!membership.flat_id) {
    await setLivingError('Your account isn’t linked to a flat yet — check with your Admin.')
    redirect('/living/requests')
  }

  const title = String(formData.get('title') ?? '').trim()
  if (!title) {
    await setLivingError('Give the request a short title.')
    redirect('/living/requests')
  }

  const { error } = await supabase.from('living_requests').insert({
    apartment_id: apartment.id,
    flat_id: membership.flat_id,
    raised_by: userId,
    title,
    description: String(formData.get('description') ?? '').trim() || null,
  })
  if (error) {
    await setLivingError(error.message)
    redirect('/living/requests')
  }
  await setLivingNotice('Request raised — your Admin/Treasurer will follow up.')
  redirect('/living/requests')
}

async function updateRequestAction(formData: FormData) {
  'use server'
  const { supabase } = await requireMembership(['admin', 'treasurer'])
  const status = String(formData.get('status') ?? 'open') as RequestStatus
  const { error } = await supabase
    .from('living_requests')
    .update({
      status,
      admin_response: String(formData.get('admin_response') ?? '').trim() || null,
      resolved_at: status === 'resolved' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', String(formData.get('request_id')))
  if (error) {
    await setLivingError(error.message)
    redirect('/living/requests')
  }
  await setLivingNotice('Updated.')
  redirect('/living/requests')
}

export default async function LivingRequestsPage() {
  const { supabase, membership, apartment } = await requireMembership()

  if (membership.role === 'owner') {
    if (!membership.flat_id) {
      return (
        <div className={theme.card}>
          <p className={theme.muted}>Your account isn&rsquo;t linked to a flat yet — check with your Admin.</p>
        </div>
      )
    }

    const requests = await getMyRequests(supabase, membership.flat_id)

    return (
      <>
        <h1 className={theme.heading} style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>
          Requests
        </h1>
        <p className={theme.muted} style={{ marginBottom: '1.5rem' }}>
          A repair, a complaint, anything that isn&rsquo;t about a specific bill (that&rsquo;s a dispute, raised from My Bills).
        </p>

        <div className={theme.card} style={{ marginBottom: '1.5rem' }}>
          <h2 className={homeStyles.sectionTitle}>Raise a request</h2>
          <form action={raiseRequestAction}>
            <div className={theme.field}>
              <label className={theme.label} htmlFor="title">
                Title
              </label>
              <input id="title" name="title" className={theme.input} placeholder="Leaking pipe near the lift" required />
            </div>
            <div className={theme.field}>
              <label className={theme.label} htmlFor="description">
                Details (optional)
              </label>
              <textarea id="description" name="description" className={theme.textarea} />
            </div>
            <button type="submit" className={theme.button}>
              Submit
            </button>
          </form>
        </div>

        <h2 className={homeStyles.sectionTitle}>My requests</h2>
        <div className={homeStyles.rowList}>
          {requests.map((r) => (
            <div key={r.id} className={theme.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.4rem' }}>
                <strong>{r.title}</strong>
                <span className={statusPillClass(r.status)}>{statusLabel(r.status)}</span>
              </div>
              {r.description && <p className={theme.muted}>{r.description}</p>}
              {r.admin_response && (
                <p className={theme.muted} style={{ marginTop: '0.5rem' }}>
                  Response: {r.admin_response}
                </p>
              )}
            </div>
          ))}
          {requests.length === 0 && (
            <div className={theme.card}>
              <p className={theme.muted}>Nothing raised yet.</p>
            </div>
          )}
        </div>
      </>
    )
  }

  const requests = await getAllRequests(supabase, apartment.id)

  return (
    <>
      <h1 className={theme.heading} style={{ fontSize: '1.6rem', marginBottom: '1.5rem' }}>
        Requests
      </h1>

      {requests.length === 0 ? (
        <div className={theme.card}>
          <p className={theme.muted}>Nothing raised yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {requests.map((r) => (
            <div key={r.id} className={theme.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <strong>
                  Flat {r.flat.flat_no} — {r.title}
                </strong>
                <span className={statusPillClass(r.status)}>{statusLabel(r.status)}</span>
              </div>
              {r.description && (
                <p className={homeStyles.statSub} style={{ marginBottom: '0.75rem' }}>
                  {r.description}
                </p>
              )}

              <form action={updateRequestAction}>
                <input type="hidden" name="request_id" value={r.id} />
                <div className={theme.field}>
                  <label className={theme.label} htmlFor={`status-${r.id}`}>
                    Status
                  </label>
                  <select id={`status-${r.id}`} name="status" className={theme.select} defaultValue={r.status}>
                    <option value="open">Open</option>
                    <option value="in_progress">In progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
                <div className={theme.field}>
                  <label className={theme.label} htmlFor={`response-${r.id}`}>
                    Response
                  </label>
                  <textarea id={`response-${r.id}`} name="admin_response" className={theme.textarea} defaultValue={r.admin_response ?? ''} />
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
