import { redirect } from 'next/navigation'
import { requireMembership } from '@/lib/living/auth'
import { setLivingError, setLivingNotice } from '@/lib/living/flash'
import { getNotices } from '@/lib/living/queries'
import ConfirmSubmitButton from '../ConfirmSubmitButton'
import MaterialIcon from '../../MaterialIcon'
import theme from '../../LivingTheme.module.scss'
import styles from './Notices.module.scss'

async function addNoticeAction(formData: FormData) {
  'use server'
  const { supabase, apartment, userId } = await requireMembership(['admin', 'treasurer'])
  const title = String(formData.get('title') ?? '').trim()
  const body = String(formData.get('body') ?? '').trim()
  if (!title || !body) {
    await setLivingError('Give the notice a title and a body.')
    redirect('/living/notices')
  }

  const { error } = await supabase.from('living_notices').insert({ apartment_id: apartment.id, title, body, created_by: userId })
  if (error) {
    await setLivingError(error.message)
    redirect('/living/notices')
  }
  await setLivingNotice('Posted.')
  redirect('/living/notices')
}

async function deleteNoticeAction(id: string) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const { error } = await supabase.from('living_notices').delete().eq('id', id).eq('apartment_id', apartment.id)
  if (error) {
    await setLivingError(error.message)
    redirect('/living/notices')
  }
  await setLivingNotice('Removed.')
  redirect('/living/notices')
}

export default async function LivingNoticesPage() {
  const { supabase, membership, apartment } = await requireMembership()
  const canManage = membership.role === 'admin' || membership.role === 'treasurer'
  const notices = await getNotices(supabase, apartment.id)

  return (
    <>
      <h1 className={theme.heading} style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>
        Notices
      </h1>
      <p className={theme.muted} style={{ marginBottom: '1.5rem' }}>
        Announcements from the association — tank cleaning, power shutdowns, anything worth flagging to everyone.
      </p>

      {canManage && (
        <div className={theme.card} style={{ marginBottom: '1.5rem' }}>
          <form action={addNoticeAction}>
            <div className={theme.field}>
              <label className={theme.label} htmlFor="title">
                Title
              </label>
              <input id="title" name="title" className={theme.input} placeholder="Water tank cleaning" required />
            </div>
            <div className={theme.field}>
              <label className={theme.label} htmlFor="body">
                Details
              </label>
              <textarea id="body" name="body" className={theme.textarea} placeholder="On 13 Sep, water supply will be off from 10am to 1pm." required />
            </div>
            <button type="submit" className={theme.button}>
              <MaterialIcon name="add" size={16} style={{ marginRight: '0.3rem' }} />
              Post notice
            </button>
          </form>
        </div>
      )}

      <div className={styles.list}>
        {notices.map((notice) => (
          <div key={notice.id} className={theme.card}>
            <div className={styles.noticeHead}>
              <div>
                <h2 className={styles.noticeTitle}>{notice.title}</h2>
                <span className={theme.muted} style={{ fontSize: '0.8rem' }}>
                  {new Date(notice.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              {canManage && (
                <ConfirmSubmitButton
                  formAction={deleteNoticeAction.bind(null, notice.id)}
                  confirmMessage={`Delete "${notice.title}"?`}
                  className={theme.iconButtonDanger}
                  title="Delete notice"
                >
                  <MaterialIcon name="delete" size={18} />
                </ConfirmSubmitButton>
              )}
            </div>
            <p className={styles.noticeBody}>{notice.body}</p>
          </div>
        ))}
        {notices.length === 0 && (
          <div className={theme.card}>
            <p className={theme.muted}>Nothing posted yet.</p>
          </div>
        )}
      </div>
    </>
  )
}
