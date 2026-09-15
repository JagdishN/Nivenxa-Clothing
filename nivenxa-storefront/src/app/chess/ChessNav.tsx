'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createChessBrowserClient } from '@/lib/chess/chessSupabaseBrowser'
import styles from './ChessNav.module.scss'

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

  useEffect(() => {
    const supabase = createChessBrowserClient()
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? null))
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => setEmail(session?.user.email ?? null))
    return () => subscription.unsubscribe()
  }, [])

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
    </header>
  )
}
