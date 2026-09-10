import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requireMembership } from '@/lib/living/auth'
import { setLivingError, setLivingNotice } from '@/lib/living/flash'
import { getMeeting } from '@/lib/living/queries'
import PrintButton from '../../PrintButton'
import theme from '../../../LivingTheme.module.scss'
import homeStyles from '../../Home.module.scss'
import styles from '../Meeting.module.scss'

async function saveMeetingAction(id: string, formData: FormData) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const title = String(formData.get('title') ?? '').trim()
  const meetingDate = String(formData.get('meeting_date') ?? '').trim()
  if (!title || !meetingDate) {
    await setLivingError('Title and date are required.')
    redirect(`/living/meetings/${id}`)
  }

  const { error } = await supabase
    .from('living_meetings')
    .update({
      title,
      meeting_date: meetingDate,
      agenda: String(formData.get('agenda') ?? '').trim() || null,
      mom: String(formData.get('mom') ?? '').trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('apartment_id', apartment.id)
  if (error) {
    await setLivingError(error.message)
    redirect(`/living/meetings/${id}`)
  }
  await setLivingNotice('Saved.')
  redirect(`/living/meetings/${id}`)
}

async function publishMomAction(id: string) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const meeting = await getMeeting(supabase, apartment.id, id)
  if (!meeting || !meeting.mom?.trim()) {
    await setLivingError('Write the MOM before publishing it.')
    redirect(`/living/meetings/${id}`)
  }

  const { error } = await supabase
    .from('living_meetings')
    .update({ mom_published_at: new Date().toISOString() })
    .eq('id', id)
    .eq('apartment_id', apartment.id)
  if (error) {
    await setLivingError(error.message)
    redirect(`/living/meetings/${id}`)
  }
  await setLivingNotice('MOM published — residents can now view it.')
  redirect(`/living/meetings/${id}`)
}

export default async function LivingMeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, membership, apartment } = await requireMembership()
  const canManage = membership.role === 'admin' || membership.role === 'treasurer'
  const meeting = await getMeeting(supabase, apartment.id, id)
  if (!meeting) notFound()

  const dateLabel = new Date(meeting.meeting_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  const momPublished = Boolean(meeting.mom_published_at)
  const waText = [`${meeting.title} — ${dateLabel}`, 'Minutes of Meeting:', meeting.mom ?? '', apartment.name].join('\n\n')

  return (
    <>
      <p style={{ marginBottom: '1.5rem' }}>
        <Link href="/living/meetings" className={theme.muted}>
          ← All meetings
        </Link>
      </p>

      {canManage ? (
        <div className={theme.card} style={{ marginBottom: '1.5rem' }}>
          <h1 className={theme.heading} style={{ fontSize: '1.4rem', marginBottom: '1rem' }}>
            Edit meeting
          </h1>
          <form action={saveMeetingAction.bind(null, id)}>
            <div className={theme.field}>
              <label className={theme.label} htmlFor="title">
                Title
              </label>
              <input id="title" name="title" className={theme.input} defaultValue={meeting.title} required />
            </div>
            <div className={theme.field}>
              <label className={theme.label} htmlFor="meeting_date">
                Date
              </label>
              <input id="meeting_date" name="meeting_date" type="date" className={theme.input} defaultValue={meeting.meeting_date} required />
            </div>
            <div className={theme.field}>
              <label className={theme.label} htmlFor="agenda">
                Agenda
              </label>
              <textarea id="agenda" name="agenda" className={theme.textarea} defaultValue={meeting.agenda ?? ''} />
            </div>
            <div className={theme.field}>
              <label className={theme.label} htmlFor="mom">
                Minutes of Meeting {momPublished && <span className={theme.pillOk}>Published</span>}
              </label>
              <textarea id="mom" name="mom" className={styles.momEditor} defaultValue={meeting.mom ?? ''} placeholder="What was discussed and decided" />
              <p className={theme.muted} style={{ marginTop: '0.4rem' }}>
                Residents only ever see this once you publish it — saving here just keeps your draft.
              </p>
            </div>
            <button type="submit" className={theme.button}>
              Save
            </button>
          </form>
          <form action={publishMomAction.bind(null, id)} style={{ marginTop: '0.75rem' }}>
            <button type="submit" className={theme.buttonGhost} disabled={!meeting.mom?.trim()}>
              {momPublished ? 'Republish MOM' : 'Publish MOM'}
            </button>
          </form>
        </div>
      ) : (
        <>
          <h1 className={theme.heading} style={{ fontSize: '1.6rem', marginBottom: '0.2rem' }}>
            {meeting.title}
          </h1>
          <p className={theme.muted} style={{ marginBottom: '1.5rem' }}>
            {dateLabel}
          </p>

          {meeting.agenda && (
            <div className={theme.card} style={{ marginBottom: '1.5rem' }}>
              <h2 className={homeStyles.sectionTitle}>Agenda</h2>
              <p className={styles.momText}>{meeting.agenda}</p>
            </div>
          )}

          <div className={theme.card}>
            <h2 className={homeStyles.sectionTitle}>Minutes of Meeting</h2>
            {momPublished ? (
              <>
                <p className={styles.momText}>{meeting.mom}</p>
                <div className={`${styles.actions} ${styles.noPrint}`}>
                  <PrintButton className={theme.buttonGhost} />
                  <a href={`https://wa.me/?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener noreferrer" className={theme.buttonGhost}>
                    Share on WhatsApp
                  </a>
                </div>
              </>
            ) : (
              <p className={theme.muted}>Not published yet — check back after the meeting.</p>
            )}
          </div>
        </>
      )}
    </>
  )
}
