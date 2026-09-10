'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LivingRole } from '@/lib/living/types'
import styles from './AppNav.module.scss'

const LINKS_BY_ROLE: Record<LivingRole, { href: string; label: string }[]> = {
  admin: [
    { href: '/living/home', label: 'Home' },
    { href: '/living/setup', label: 'Setup' },
    { href: '/living/maintenance', label: 'Maintenance' },
    { href: '/living/water', label: 'Water' },
    { href: '/living/bills', label: 'Bills' },
    { href: '/living/payments', label: 'Payments' },
    { href: '/living/expenses', label: 'Expenses' },
    { href: '/living/events', label: 'Events' },
    { href: '/living/pending-works', label: 'Pending Works' },
    { href: '/living/settings/slabs', label: 'Slab rates' },
    { href: '/living/settings/tankers', label: 'Tanker rates' },
    { href: '/living/inventory', label: 'Inventory' },
    { href: '/living/service-providers', label: 'Service Providers' },
    { href: '/living/documents', label: 'Documents' },
    { href: '/living/disputes', label: 'Disputes' },
  ],
  treasurer: [
    { href: '/living/home', label: 'Home' },
    { href: '/living/maintenance', label: 'Maintenance' },
    { href: '/living/bills', label: 'Bills' },
    { href: '/living/payments', label: 'Payments' },
    { href: '/living/expenses', label: 'Expenses' },
    { href: '/living/events', label: 'Events' },
    { href: '/living/pending-works', label: 'Pending Works' },
    { href: '/living/inventory', label: 'Inventory' },
    { href: '/living/service-providers', label: 'Service Providers' },
    { href: '/living/documents', label: 'Documents' },
    { href: '/living/disputes', label: 'Disputes' },
  ],
  owner: [
    { href: '/living/home', label: 'Home' },
    { href: '/living/bill', label: 'My Bill' },
    { href: '/living/documents', label: 'Documents' },
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
          <Link href="/living/home" className={styles.logo}>
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
            const active = link.href === '/living/home' ? pathname === '/living/home' : pathname.startsWith(link.href)
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
