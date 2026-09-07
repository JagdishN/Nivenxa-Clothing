'use client'
import { useEffect, useRef, useState } from 'react'
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
    { href: '/living/app/payments', label: 'Payments' },
    { href: '/living/app/pending-works', label: 'Pending Works' },
    { href: '/living/app/settings/slabs', label: 'Slab rates' },
    { href: '/living/app/settings/tankers', label: 'Tanker rates' },
    { href: '/living/app/inventory', label: 'Inventory' },
    { href: '/living/app/service-providers', label: 'Service Providers' },
    { href: '/living/app/documents', label: 'Documents' },
    { href: '/living/app/disputes', label: 'Disputes' },
  ],
  treasurer: [
    { href: '/living/app', label: 'Home' },
    { href: '/living/app/maintenance', label: 'Maintenance' },
    { href: '/living/app/bills', label: 'Bills' },
    { href: '/living/app/payments', label: 'Payments' },
    { href: '/living/app/pending-works', label: 'Pending Works' },
    { href: '/living/app/inventory', label: 'Inventory' },
    { href: '/living/app/service-providers', label: 'Service Providers' },
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
  const [menuOpen, setMenuOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  return (
    <header className={styles.bar}>
      <div className={styles.inner}>
        <div className={styles.topRow}>
          <Link href="/living/app" className={styles.logo}>
            {apartmentName}
          </Link>
          <div className={styles.account} ref={accountRef}>
            <button
              type="button"
              className={styles.accountButton}
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="true"
              aria-expanded={menuOpen}
              aria-label={`Account menu — ${role}`}
            >
              {role.charAt(0).toUpperCase()}
            </button>
            {menuOpen && (
              <div className={styles.accountMenu}>
                <span className={styles.roleTag}>{role}</span>
                <form action={onSignOut}>
                  <button type="submit" className={styles.signOut}>
                    Sign out
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
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
      </div>
    </header>
  )
}
