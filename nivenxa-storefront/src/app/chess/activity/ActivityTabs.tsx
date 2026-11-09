'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './Activity.module.scss'

const TABS = [
  { href: '/chess/activity/games', label: 'My Games' },
  { href: '/chess/activity/analyses', label: 'My Analyses' },
  { href: '/chess/activity/puzzles', label: 'My Puzzles' },
]

/** Section tabs. `aria-current="page"` marks the active one (a plain link row: each tab is its own URL, so Back/Forward, refresh and deep links just work). */
export default function ActivityTabs() {
  const pathname = usePathname()
  return (
    <nav className={styles.tabs} aria-label="My Activity sections">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={styles.tab} aria-current={pathname === t.href || pathname.startsWith(`${t.href}/`) ? 'page' : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  )
}
