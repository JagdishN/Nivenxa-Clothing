'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createChessBrowserClient } from '@/lib/chess/chessSupabaseBrowser'
import AccountMenu from './AccountMenu'
import { useChessAuth } from './_auth/ChessAuthProvider'
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
  const auth = useChessAuth()
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
  const [signingOut, setSigningOut] = useState(false)

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
    // Never interrupt someone mid-puzzle or mid-game: the nudge waits for a calmer page (and is not marked as seen).
    if (pathname.startsWith('/chess/puzzles/') || pathname.startsWith('/chess/play')) return
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
  }, [pathname])

  function openFeedback() {
    setShowFeedbackTooltip(false)
    setFeedbackOpen(true)
  }

  async function handleLogOut() {
    if (signingOut) return
    setSigningOut(true)
    try {
      const supabase = createChessBrowserClient()
      const { error } = await supabase.auth.signOut()
      if (error) {
        // The server could not be reached. Only claim success if this browser really has no session any more;
        // otherwise say plainly that nothing changed.
        const { data } = await supabase.auth.getSession()
        if (data.session) {
          auth.announce({ kind: 'error', text: "We couldn't sign you out. Check your connection and try again." })
          return
        }
      }
      // Back to the public home page (drawer closed) with a one-time confirmation.
      router.push('/chess?signed_out=1')
      router.refresh()
    } catch {
      auth.announce({ kind: 'error', text: "We couldn't sign you out. Check your connection and try again." })
    } finally {
      setSigningOut(false)
    }
  }

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
          <AccountMenu email={email} onLogOut={handleLogOut} signingOut={signingOut} />
        ) : (
          <>
            <button type="button" className={styles.authLinkPrimary} onClick={() => auth.open('login')}>
              Log In
            </button>
            <button type="button" className={styles.authLink} onClick={() => auth.open('signup')}>
              Sign Up
            </button>
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
