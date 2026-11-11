import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getChessSession } from '@/lib/chess/chessAuth'
import styles from './Activity.module.scss'

/** Signed-out visitors go to the home page with the login drawer open and are returned to exactly this screen afterwards. */
export async function requireActivitySession(returnTo: string) {
  const session = await getChessSession()
  if (!session) redirect(`/chess?auth=login&redirect=${encodeURIComponent(returnTo)}`)
  return session
}

export function Filters({ base, current, options }: { base: string; current: string; options: Array<{ id: string; label: string }> }) {
  return (
    <nav className={styles.filters} aria-label="Filter">
      {options.map((o) => (
        <Link key={o.id} href={o.id === 'all' ? base : `${base}?filter=${o.id}`} className={styles.chip} aria-current={current === o.id ? 'true' : undefined}>
          {o.label}
        </Link>
      ))}
    </nav>
  )
}

export function Pager({ base, filter, cursor, next }: { base: string; filter: string; cursor?: string; next: string | null }) {
  const qs = (c?: string) => {
    const p = new URLSearchParams()
    if (filter !== 'all') p.set('filter', filter)
    if (c) p.set('cursor', c)
    const s = p.toString()
    return s ? `${base}?${s}` : base
  }
  if (!cursor && !next) return null
  return (
    <nav className={styles.pager} aria-label="Pages">
      {cursor ? (
        <Link href={qs()} className={styles.action}>
          ← Newest
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link href={qs(next)} className={styles.action} rel="next">
          Older →
        </Link>
      )}
    </nav>
  )
}

/** "Couldn't load" (a failure) is never shown as an empty list. Retry reloads this same URL. */
export function LoadFailed({ what, href, unavailable }: { what: string; href: string; unavailable?: boolean }) {
  return (
    <div className={`${styles.state} ${styles.stateError}`} role="alert">
      <h2>{unavailable ? `${what} aren’t available yet` : `We couldn’t load your ${what.toLowerCase()}`}</h2>
      <p>{unavailable ? 'This part of your history is still being set up. Nothing has been lost.' : 'This is a loading problem, not an empty history. Please try again.'}</p>
      <Link href={href} className={styles.actionPrimary}>
        Retry
      </Link>
    </div>
  )
}

export function Empty({ title, text, cta, href }: { title: string; text?: string; cta: string; href: string }) {
  return (
    <div className={styles.state}>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
      <Link href={href} className={styles.actionPrimary}>
        {cta}
      </Link>
    </div>
  )
}
