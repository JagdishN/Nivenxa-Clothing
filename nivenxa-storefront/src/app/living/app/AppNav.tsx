'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LivingRole } from '@/lib/living/types'
import styles from './AppNav.module.scss'

const LINKS_BY_ROLE: Record<LivingRole, { href: string; label: string }[]> = {
  admin: [
    { href: '/living/app', label: 'Home' },
    { href: '/living/app/setup', label: 'Setup' },
    { href: '/living/app/maintenance', label: 'Maintenance' },
    { href: '/living/app/water', label: 'Water' },
    { href: '/living/app/bills', label: 'Bills' },
    { href: '/living/app/settings/slabs', label: 'Slab rates' },
    { href: '/living/app/settings/tankers', label: 'Tanker rates' },
    { href: '/living/app/documents', label: 'Documents' },
    { href: '/living/app/disputes', label: 'Disputes' },
  ],
  treasurer: [
    { href: '/living/app', label: 'Home' },
    { href: '/living/app/maintenance', label: 'Maintenance' },
    { href: '/living/app/bills', label: 'Bills' },
    { href: '/living/app/documents', label: 'Documents' },
    { href: '/living/app/disputes', label: 'Disputes' },
  ],
  owner: [
    { href: '/living/app', label: 'Home' },
    { href: '/living/app/bill', label: 'My Bill' },
    { href: '/living/app/documents', label: 'Documents' },
  ],
}

export default function AppNav({
  role,
  apartmentName,
  onSignOut,
}: {
  role: LivingRole
  apartmentName: string
  onSignOut: () => Promise<void>
}) {
  const pathname = usePathname()
  const links = LINKS_BY_ROLE[role]

  return (
    <header className={styles.bar}>
      <div className={styles.inner}>
        <Link href="/living/app" className={styles.logo}>
          {apartmentName}
        </Link>
        <nav className={styles.links}>
          {links.map((link) => {
            const active = link.href === '/living/app' ? pathname === '/living/app' : pathname.startsWith(link.href)
            return (
              <Link key={link.href} href={link.href} className={active ? styles.linkActive : styles.link}>
                {link.label}
              </Link>
            )
          })}
        </nav>
        <div className={styles.tail}>
          <span className={styles.roleTag}>{role}</span>
          <form action={onSignOut}>
            <button type="submit" className={styles.signOut}>
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
