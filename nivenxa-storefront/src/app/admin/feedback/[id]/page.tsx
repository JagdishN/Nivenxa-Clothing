import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { getSupabaseAdmin } from '@/lib/chess/supabase'
import {
  FEEDBACK_CATEGORY_EMOJI,
  FEEDBACK_CATEGORY_LABEL,
  FEEDBACK_STATUS_LABEL,
  type FeedbackArea,
  type FeedbackItem,
  type FeedbackPriority,
  type FeedbackStatus,
} from '@/lib/feedback/types'
import { ADMIN_FEEDBACK_COOKIE, isAdminAuthenticated, requireAdminAuth } from '../_auth'
import styles from '../AdminFeedback.module.scss'

const STATUSES: FeedbackStatus[] = ['new', 'reviewed', 'planned', 'in_progress', 'completed', 'wont_do']
const PRIORITIES: FeedbackPriority[] = ['low', 'medium', 'high', 'critical']
const AREAS: FeedbackArea[] = ['ui', 'ux', 'functional', 'performance', 'content']
const SCREENSHOT_BUCKET = 'feedback-screenshots'

async function updateTriageAction(formData: FormData) {
  'use server'
  await requireAdminAuth()
  const id = String(formData.get('id') ?? '')
  if (!id) return
  const status = String(formData.get('status') ?? '')
  const priority = String(formData.get('priority') ?? '')
  const area = String(formData.get('area') ?? '')
  const owner = String(formData.get('owner') ?? '').trim()
  const internalNotes = String(formData.get('internal_notes') ?? '').trim()

  const supabase = getSupabaseAdmin()
  await supabase
    .from('feedback_items')
    .update({
      status: STATUSES.includes(status as FeedbackStatus) ? status : 'new',
      priority: priority ? priority : null,
      area: area ? area : null,
      owner: owner || null,
      internal_notes: internalNotes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  revalidatePath(`/admin/feedback/${id}`)
  revalidatePath('/admin/feedback')
}

export default async function AdminFeedbackDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const authed = isAdminAuthenticated(cookieStore.get(ADMIN_FEEDBACK_COOKIE)?.value)
  if (!authed) redirect('/admin/feedback')

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.from('feedback_items').select('*').eq('id', id).maybeSingle()
  if (error) console.error('AdminFeedbackDetailPage: failed to load item —', error.message)
  const item = data as FeedbackItem | null
  if (!item) notFound()

  let screenshotUrl: string | null = null
  if (item.screenshot_path) {
    const { data: signed } = await supabase.storage.from(SCREENSHOT_BUCKET).createSignedUrl(item.screenshot_path, 60 * 10)
    screenshotUrl = signed?.signedUrl ?? null
  }

  const categoryLabel = FEEDBACK_CATEGORY_LABEL[item.category as keyof typeof FEEDBACK_CATEGORY_LABEL] ?? item.category
  const categoryEmoji = FEEDBACK_CATEGORY_EMOJI[item.category as keyof typeof FEEDBACK_CATEGORY_EMOJI] ?? '📋'

  return (
    <main className={styles.page}>
      <div className={styles.headerRow}>
        <Link href="/admin/feedback" className={styles.secondaryBtn}>
          ← Back to Inbox
        </Link>
      </div>

      <section className={styles.section}>
        <h1 className={styles.heading}>
          {item.app === 'chess' ? '♟️' : '🏢'} {item.screen_label}
        </h1>
        <p className={styles.detailRoute}>{item.route}</p>

        <div className={styles.detailGrid}>
          <div>
            <h2 className={styles.sectionTitle}>Feedback</h2>
            <p className={styles.detailField}>
              <strong>Type:</strong> {categoryEmoji} {categoryLabel}
            </p>
            {item.rating && (
              <p className={styles.detailField}>
                <strong>Rating:</strong> {item.rating}
              </p>
            )}
            <p className={styles.detailField}>
              <strong>Comment:</strong>
            </p>
            <p className={styles.detailComment}>{item.comment || <em>No comment.</em>}</p>
            {item.allow_contact && <p className={styles.detailField}>✓ User allowed contact.</p>}

            {screenshotUrl && (
              <>
                <h2 className={styles.sectionTitle}>Screenshot</h2>
                {/* eslint-disable-next-line @next/next/no-img-element -- a signed URL, not a static asset next/image can optimize */}
                <img src={screenshotUrl} alt="User-attached screenshot" className={styles.screenshot} />
              </>
            )}
          </div>

          <div>
            <h2 className={styles.sectionTitle}>Context</h2>
            <p className={styles.detailField}>
              <strong>User:</strong> {item.user_email ?? 'Anonymous'} {item.user_role && `(${item.user_role})`}
            </p>
            <p className={styles.detailField}>
              <strong>Date:</strong> {new Date(item.created_at).toLocaleString()}
            </p>
            <p className={styles.detailField}>
              <strong>App version:</strong> {item.app_version ?? '—'}
            </p>
            <p className={styles.detailField}>
              <strong>Device:</strong> {item.device_type ?? '—'} ({item.screen_width}×{item.screen_height})
            </p>
            <p className={styles.detailField}>
              <strong>Browser/OS:</strong> {item.user_agent ?? '—'}
            </p>

            <h2 className={styles.sectionTitle}>Triage</h2>
            <form action={updateTriageAction} className={styles.triageForm}>
              <input type="hidden" name="id" value={item.id} />
              <label className={styles.field}>
                Status
                <select name="status" defaultValue={item.status} className={styles.input}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {FEEDBACK_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                Priority
                <select name="priority" defaultValue={item.priority ?? ''} className={styles.input}>
                  <option value="">—</option>
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                Area
                <select name="area" defaultValue={item.area ?? ''} className={styles.input}>
                  <option value="">—</option>
                  {AREAS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                Owner
                <input type="text" name="owner" defaultValue={item.owner ?? ''} className={styles.input} />
              </label>
              <label className={styles.field}>
                Internal notes
                <textarea name="internal_notes" defaultValue={item.internal_notes ?? ''} className={styles.textarea} rows={4} />
              </label>
              <button type="submit" className={styles.primaryBtn}>
                Save
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  )
}
