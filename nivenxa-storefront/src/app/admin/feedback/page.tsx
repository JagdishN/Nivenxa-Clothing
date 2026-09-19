import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { getSupabaseAdmin } from '@/lib/chess/supabase'
import {
  FEEDBACK_CATEGORY_EMOJI,
  FEEDBACK_CATEGORY_LABEL,
  FEEDBACK_STATUS_LABEL,
  type FeedbackApp,
  type FeedbackItem,
  type FeedbackStatus,
} from '@/lib/feedback/types'
import { ADMIN_FEEDBACK_COOKIE, hashAdminPassword, isAdminAuthenticated, requireAdminAuth } from './_auth'
import styles from './AdminFeedback.module.scss'

const STATUSES: FeedbackStatus[] = ['new', 'reviewed', 'planned', 'in_progress', 'completed', 'wont_do']

async function authenticate(formData: FormData) {
  'use server'
  const password = String(formData.get('password') ?? '')
  const expected = process.env.ADMIN_FEEDBACK_PASSWORD
  if (!expected) redirect('/admin/feedback?error=' + encodeURIComponent('ADMIN_FEEDBACK_PASSWORD is not set on the server.'))
  if (password !== expected) redirect('/admin/feedback?error=' + encodeURIComponent('Incorrect password.'))

  const cookieStore = await cookies()
  cookieStore.set(ADMIN_FEEDBACK_COOKIE, hashAdminPassword(expected), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/admin/feedback',
    maxAge: 60 * 60 * 8, // 8 hours
  })
  redirect('/admin/feedback')
}

async function logout() {
  'use server'
  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_FEEDBACK_COOKIE)
  redirect('/admin/feedback')
}

async function updateStatusAction(formData: FormData) {
  'use server'
  await requireAdminAuth()
  const id = String(formData.get('id') ?? '')
  const status = String(formData.get('status') ?? '')
  if (!id || !STATUSES.includes(status as FeedbackStatus)) return
  const supabase = getSupabaseAdmin()
  await supabase.from('feedback_items').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
  revalidatePath('/admin/feedback')
}

type FilterApp = FeedbackApp | 'all'
type FilterCategory = 'all' | 'bug' | 'improvement' | 'usability' | 'feature'

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; app?: string; category?: string }>
}) {
  const params = await searchParams
  const cookieStore = await cookies()
  const authed = isAdminAuthenticated(cookieStore.get(ADMIN_FEEDBACK_COOKIE)?.value)

  if (!authed) {
    return (
      <main className={styles.page}>
        <div className={styles.loginCard}>
          <h1 className={styles.heading}>Admin — Feedback</h1>
          {params.error && <p className={styles.error}>{params.error}</p>}
          <form action={authenticate} className={styles.loginForm}>
            <input type="password" name="password" placeholder="Password" required className={styles.input} />
            <button type="submit" className={styles.primaryBtn}>
              Sign in
            </button>
          </form>
        </div>
      </main>
    )
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.from('feedback_items').select('*').order('created_at', { ascending: false }).limit(500)
  if (error) console.error('AdminFeedbackPage: failed to load feedback —', error.message)
  const allItems = (data ?? []) as FeedbackItem[]

  const filterApp = (params.app ?? 'all') as FilterApp
  const filterCategory = (params.category ?? 'all') as FilterCategory

  const items = allItems.filter((item) => {
    if (filterApp !== 'all' && item.app !== filterApp) return false
    if (filterCategory !== 'all' && item.category !== filterCategory) return false
    return true
  })

  // Screen trends — grouped in JS rather than a DB aggregate query; fine at
  // the volumes a feedback inbox actually sees, and avoids a new RPC.
  const trendMap = new Map<string, number>()
  for (const item of allItems) {
    const key = `${item.app} → ${item.screen_label}`
    trendMap.set(key, (trendMap.get(key) ?? 0) + 1)
  }
  const trends = Array.from(trendMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  function filterHref(app: FilterApp, category: FilterCategory) {
    const qs = new URLSearchParams()
    if (app !== 'all') qs.set('app', app)
    if (category !== 'all') qs.set('category', category)
    const query = qs.toString()
    return `/admin/feedback${query ? `?${query}` : ''}`
  }

  return (
    <main className={styles.page}>
      <div className={styles.headerRow}>
        <h1 className={styles.heading}>Feedback Inbox</h1>
        <form action={logout}>
          <button type="submit" className={styles.secondaryBtn}>
            Sign out
          </button>
        </form>
      </div>

      <div className={styles.filterRow}>
        <Link href={filterHref('all', filterCategory)} className={filterApp === 'all' ? styles.filterActive : styles.filter}>
          All
        </Link>
        <Link href={filterHref('chess', filterCategory)} className={filterApp === 'chess' ? styles.filterActive : styles.filter}>
          Chess
        </Link>
        <Link href={filterHref('living', filterCategory)} className={filterApp === 'living' ? styles.filterActive : styles.filter}>
          Living
        </Link>
        <span className={styles.filterDivider} />
        <Link href={filterHref(filterApp, 'all')} className={filterCategory === 'all' ? styles.filterActive : styles.filter}>
          All types
        </Link>
        <Link href={filterHref(filterApp, 'bug')} className={filterCategory === 'bug' ? styles.filterActive : styles.filter}>
          🐞 Bugs
        </Link>
        <Link href={filterHref(filterApp, 'usability')} className={filterCategory === 'usability' ? styles.filterActive : styles.filter}>
          🎨 UX
        </Link>
        <Link href={filterHref(filterApp, 'improvement')} className={filterCategory === 'improvement' ? styles.filterActive : styles.filter}>
          ✨ Improvements
        </Link>
        <Link href={filterHref(filterApp, 'feature')} className={filterCategory === 'feature' ? styles.filterActive : styles.filter}>
          💡 Features
        </Link>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Screens with the most feedback</h2>
        <div className={styles.trendGrid}>
          {trends.length === 0 && <p className={styles.empty}>No feedback yet.</p>}
          {trends.map(([label, count]) => (
            <div key={label} className={styles.trendCard}>
              <span className={styles.trendCount}>{count}</span>
              <span className={styles.trendLabel}>{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          {items.length} item{items.length === 1 ? '' : 's'}
        </h2>
        <div className={styles.list}>
          {items.length === 0 && <p className={styles.empty}>Nothing matches this filter.</p>}
          {items.map((item) => (
            <div key={item.id} className={styles.row}>
              <div className={styles.rowMain}>
                <Link href={`/admin/feedback/${item.id}`} className={styles.rowScreen}>
                  {item.app === 'chess' ? '♟️' : '🏢'} {item.screen_label}
                </Link>
                <p className={styles.rowComment}>{item.comment || <em>No comment.</em>}</p>
                <p className={styles.rowMeta}>
                  {FEEDBACK_CATEGORY_EMOJI[item.category as keyof typeof FEEDBACK_CATEGORY_EMOJI] ?? '📋'}{' '}
                  {FEEDBACK_CATEGORY_LABEL[item.category as keyof typeof FEEDBACK_CATEGORY_LABEL] ?? item.category}
                  {item.rating && ` · ${item.rating}`} · {new Date(item.created_at).toLocaleString()}
                  {item.user_email && ` · ${item.user_email}`}
                </p>
              </div>
              <form action={updateStatusAction} className={styles.rowStatus}>
                <input type="hidden" name="id" value={item.id} />
                <select name="status" defaultValue={item.status} className={styles.statusSelect}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {FEEDBACK_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
                <button type="submit" className={styles.statusSave}>
                  Save
                </button>
              </form>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
