'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './ChessNav.module.scss'

const LINKS = [
  { href: '/chess', label: 'Home' },
  { href: '/chess/play', label: 'Play' },
  { href: '/chess/learn', label: 'Learn' },
  { href: '/chess/puzzles', label: 'Puzzles' },
]

export default function ChessNav() {
  const pathname = usePathname()

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
    </header>
  )
}
