'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createChessBrowserClient } from '@/lib/chess/chessSupabaseBrowser'
import FeedbackModal from '@/components/feedback/FeedbackModal'
import styles from './ChessNav.module.scss'

const FEEDBACK_TOOLTIP_SEEN_KEY = 'chess-feedback-tooltip-seen'
const FEEDBACK_TOOLTIP_DELAY_MS = 30000

const LINKS = [
  { href: '/chess', label: 'Home' },
  { href: '/chess/play', label: 'Play' },
  { href: '/chess/learn', label: 'Learn' },
  { href: '/chess/analysis', label: 'Analysis' },
  { href: '/chess/puzzles', label: 'Puzzles' },
  { href: '/chess/tournaments', label: 'Tournaments' },
]

export default function ChessNav() {
  const pathname = usePathname()
  const router = useRouter()
  // Checked client-side (not passed down from the layout) on purpose — a
  // server-side session prop would force every page under /chess to render
  // dynamically just to paint this one widget. The Supabase browser client
  // reads its session from local storage/cookies without a network round
  // trip, and onAuthStateChange keeps it live across the OTP login flow and
  // sign-out without needing a full page reload.
  const [email, setEmail] = useState<string | null | undefined>(undefined) // undefined = not checked yet
  const [userId, setUserId] = useState<string | null>(null)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [showFeedbackTooltip, setShowFeedbackTooltip] = useState(false)

  useEffect(() => {
    const supabase = createChessBrowserClient()
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null)
      setUserId(data.session?.user.id ?? null)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null)
      setUserId(session?.user.id ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // One-time "Help us improve" nudge toward the feedback button — shown
  // once per visitor (a localStorage flag, set the moment it's shown, not
  // only on explicit dismissal, so it never reappears on a later visit
  // either) after ~30s of being on the site, never repeated or re-animated
  // after that first appearance.
  useEffect(() => {
    let alreadySeen = false
    try {
      alreadySeen = localStorage.getItem(FEEDBACK_TOOLTIP_SEEN_KEY) === '1'
    } catch {
      // Private-mode/blocked storage — treat as not-yet-seen for this visit.
    }
    if (alreadySeen) return
    const timer = setTimeout(() => {
      setShowFeedbackTooltip(true)
      try {
        localStorage.setItem(FEEDBACK_TOOLTIP_SEEN_KEY, '1')
      } catch {
        // Private-mode/blocked storage — it'll just show again next visit.
      }
    }, FEEDBACK_TOOLTIP_DELAY_MS)
    return () => clearTimeout(timer)
  }, [])

  function openFeedback() {
    setShowFeedbackTooltip(false)
    setFeedbackOpen(true)
  }

  async function handleLogOut() {
    const supabase = createChessBrowserClient()
    await supabase.auth.signOut()
    router.push('/chess/analysis')
    router.refresh()
  }

  const redirectParam = `?redirect=${encodeURIComponent(pathname)}`

  return (
    <header className={styles.bar}>
      <Link href="/chess" className={styles.logo}>NIVENXA CHESS</Link>
      <nav className={styles.links}>
        {LINKS.map((link) => {
          const active = link.href === '/chess' ? pathname === '/chess' : pathname.startsWith(link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.link} ${active ? styles.linkActive : ''}`}
            >
              {link.label}
            </Link>
          )
        })}
      </nav>
      <div className={styles.authArea}>
        <div className={styles.feedbackWrap}>
          <button type="button" className={styles.feedbackButton} onClick={openFeedback}>
            💬 Share feedback
          </button>
          {showFeedbackTooltip && (
            <div className={styles.feedbackTooltip} role="status">
              <span>Help us improve — tell us what you think.</span>
              <button
                type="button"
                className={styles.feedbackTooltipClose}
                aria-label="Dismiss"
                onClick={() => setShowFeedbackTooltip(false)}
              >
                ×
              </button>
            </div>
          )}
        </div>
        {email === undefined ? null : email ? (
          <>
            <span className={styles.authEmail}>{email}</span>
            <button type="button" className={styles.authLink} onClick={handleLogOut}>
              Log Out
            </button>
          </>
        ) : (
          <>
            <Link href={`/chess/login${redirectParam}`} className={styles.authLinkPrimary}>
              Log In
            </Link>
            <Link href={`/chess/signup${redirectParam}`} className={styles.authLink}>
              Sign Up
            </Link>
          </>
        )}
      </div>

      <FeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        app="chess"
        identity={{ userId, email, role: 'Chess Player' }}
      />
    </header>
  )
}
