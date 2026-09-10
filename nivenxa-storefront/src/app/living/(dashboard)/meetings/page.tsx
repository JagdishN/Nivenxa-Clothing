import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireMembership } from '@/lib/living/auth'
import { setLivingError, setLivingNotice } from '@/lib/living/flash'
import { getMeetings } from '@/lib/living/queries'
import ConfirmSubmitButton from '../ConfirmSubmitButton'
import MaterialIcon from '../../MaterialIcon'
import theme from '../../LivingTheme.module.scss'
import homeStyles from '../Home.module.scss'

async function addMeetingAction(formData: FormData) {
  'use server'
  const { supabase, apartment, userId } = await requireMembership(['admin', 'treasurer'])
  const title = String(formData.get('title') ?? '').trim()
  const meetingDate = String(formData.get('meeting_date') ?? '').trim()
  const agenda = String(formData.get('agenda') ?? '').trim()
  if (!title || !meetingDate) {
    await setLivingError('Give the meeting a title and a date.')
    redirect('/living/meetings')
  }

  const { error } = await supabase
    .from('living_meetings')
    .insert({ apartment_id: apartment.id, title, meeting_date: meetingDate, agenda: agenda || null, created_by: userId })
  if (error) {
    await setLivingError(error.message)
    redirect('/living/meetings')
  }
  await setLivingNotice('Meeting added.')
  redirect('/living/meetings')
}

async function deleteMeetingAction(id: string) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const { error } = await supabase.from('living_meetings').delete().eq('id', id).eq('apartment_id', apartment.id)
  if (error) {
    await setLivingError(error.message)
    redirect('/living/meetings')
  }
  await setLivingNotice('Removed.')
  redirect('/living/meetings')
}

function meetingStatus(meeting: { meeting_date: string; mom_published_at: string | null }): { label: string; pillClass: string } {
  if (meeting.mom_published_at) return { label: 'MOM available', pillClass: theme.pillOk }
  const isPast = new Date(meeting.meeting_date) < new Date(new Date().toDateString())
  return isPast ? { label: 'Awaiting MOM', pillClass: theme.pillBrass } : { label: 'Upcoming', pillClass: theme.pill }
}

export default async function LivingMeetingsPage() {
  const { supabase, membership, apartment } = await requireMembership()
  const canManage = membership.role === 'admin' || membership.role === 'treasurer'
  const meetings = await getMeetings(supabase, apartment.id)

  return (
    <>
      <h1 className={theme.heading} style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>
        Meetings
      </h1>
      <p className={theme.muted} style={{ marginBottom: '1.5rem' }}>
        Association meetings and their Minutes of Meeting, once published.
      </p>

      {canManage && (
        <div className={theme.card} style={{ marginBottom: '1.5rem' }}>
          <form action={addMeetingAction} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className={theme.field} style={{ marginBottom: 0, flex: 2, minWidth: '12rem' }}>
              <label className={theme.label} htmlFor="title">
                Title
              </label>
              <input id="title" name="title" className={theme.input} placeholder="Monthly Association Meeting" required />
            </div>
            <div className={theme.field} style={{ marginBottom: 0 }}>
              <label className={theme.label} htmlFor="meeting_date">
                Date
              </label>
              <input id="meeting_date" name="meeting_date" type="date" className={theme.input} required />
            </div>
            <div className={theme.field} style={{ marginBottom: 0, flex: 2, minWidth: '14rem' }}>
              <label className={theme.label} htmlFor="agenda">
                Agenda (optional)
              </label>
              <input id="agenda" name="agenda" className={theme.input} placeholder="What this meeting will cover" />
            </div>
            <button type="submit" className={theme.button}>
              <MaterialIcon name="add" size={16} style={{ marginRight: '0.3rem' }} />
              Add meeting
            </button>
          </form>
        </div>
      )}

      <div className={homeStyles.rowList}>
        {meetings.map((meeting) => {
          const status = meetingStatus(meeting)
          return (
            <div key={meeting.id} className={homeStyles.row}>
              <span>
                {new Date(meeting.meeting_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} —{' '}
                <Link href={`/living/meetings/${meeting.id}`}>{meeting.title}</Link>
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span className={status.pillClass}>{status.label}</span>
                <Link href={`/living/meetings/${meeting.id}`} className={theme.iconButton} title="Open">
                  <MaterialIcon name="arrow_forward" size={20} />
                </Link>
                {canManage && (
                  <ConfirmSubmitButton
                    formAction={deleteMeetingAction.bind(null, meeting.id)}
                    confirmMessage={`Delete "${meeting.title}"? This removes its MOM too.`}
                    className={theme.iconButtonDanger}
                    title="Delete meeting"
                  >
                    <MaterialIcon name="delete" size={18} />
                  </ConfirmSubmitButton>
                )}
              </div>
            </div>
          )
        })}
        {meetings.length === 0 && (
          <div className={theme.card}>
            <p className={theme.muted}>No meetings yet.</p>
          </div>
        )}
      </div>
    </>
  )
}
