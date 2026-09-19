'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LivingRole } from '@/lib/living/types'
import FeedbackModal from '@/components/feedback/FeedbackModal'
import styles from './AppNav.module.scss'

type NavLink = { href: string; label: string }
type NavSection = { heading?: string; links: NavLink[] }
type NavEntry = ({ kind: 'link' } & NavLink) | { kind: 'group'; label: string; overviewHref: string | null; sections: NavSection[] }

const link = (href: string, label: string): NavEntry => ({ kind: 'link', href, label })
const group = (label: string, overviewHref: string | null, sections: NavSection[]): NavEntry => ({ kind: 'group', label, overviewHref, sections })

// Dashboard / Billing / Expenses / Operations / Community / Documents /
// Settings — Billing has its own dedicated Overview page (distinct from
// Bills, which stays the flat-by-flat detail table); Operations/Community/
// Settings still point their label at the closest existing page that
// serves as that area's landing (Pending Works, Events, Apartment Setup —
// none of those have the "Overview reused as a real page" ambiguity Billing
// had). The small caret next to each opens a mega-menu with the rest of
// that area's pages, grouped the way they're actually used together.
const NAV_BY_ROLE: Record<LivingRole, NavEntry[]> = {
  admin: [
    link('/living/home', 'Dashboard'),
    group('Billing', '/living/billing', [
      { heading: 'Monthly Billing', links: [
        { href: '/living/maintenance', label: 'Maintenance' },
        { href: '/living/water', label: 'Water' },
        { href: '/living/bills', label: 'Bills' },
      ] },
      { heading: 'Collections', links: [
        { href: '/living/payments', label: 'Payments' },
        { href: '/living/billing/ledgers', label: 'Flat Ledgers' },
      ] },
      { heading: 'Reporting', links: [
        { href: '/living/statements', label: 'Financial Statements' },
      ] },
    ]),
    link('/living/expenses', 'Expenses'),
    group('Operations', '/living/pending-works', [
      { links: [
        { href: '/living/pending-works', label: 'Pending Works' },
        { href: '/living/service-providers', label: 'Service Providers' },
        { href: '/living/inventory', label: 'Inventory' },
      ] },
    ]),
    group('Community', '/living/events', [
      { links: [
        { href: '/living/events', label: 'Events' },
        { href: '/living/notices', label: 'Notices' },
        { href: '/living/meetings', label: 'Meetings' },
        { href: '/living/requests', label: 'Requests' },
        { href: '/living/disputes', label: 'Disputes' },
      ] },
    ]),
    link('/living/documents', 'Documents'),
    group('Settings', '/living/setup', [
      { links: [{ href: '/living/setup', label: 'Apartment Setup' }] },
      { heading: 'Billing Configuration', links: [
        { href: '/living/settings/slabs', label: 'Water Billing Configuration' },
        { href: '/living/settings/tankers', label: 'Tanker Rates' },
      ] },
    ]),
  ],
  treasurer: [
    link('/living/home', 'Dashboard'),
    group('Billing', '/living/billing', [
      { heading: 'Monthly Billing', links: [
        { href: '/living/maintenance', label: 'Maintenance' },
        { href: '/living/bills', label: 'Bills' },
      ] },
      { heading: 'Collections', links: [
        { href: '/living/payments', label: 'Payments' },
        { href: '/living/billing/ledgers', label: 'Flat Ledgers' },
      ] },
      { heading: 'Reporting', links: [
        { href: '/living/statements', label: 'Financial Statements' },
      ] },
    ]),
    link('/living/expenses', 'Expenses'),
    group('Operations', '/living/pending-works', [
      { links: [
        { href: '/living/pending-works', label: 'Pending Works' },
        { href: '/living/service-providers', label: 'Service Providers' },
        { href: '/living/inventory', label: 'Inventory' },
      ] },
    ]),
    group('Community', '/living/events', [
      { links: [
        { href: '/living/events', label: 'Events' },
        { href: '/living/notices', label: 'Notices' },
        { href: '/living/meetings', label: 'Meetings' },
        { href: '/living/requests', label: 'Requests' },
        { href: '/living/disputes', label: 'Disputes' },
      ] },
    ]),
    link('/living/documents', 'Documents'),
  ],
  // Deliberately lighter and differently-worded than the admin nav above —
  // an Owner opens this from a WhatsApp link on their phone, not a laptop,
  // and thinks "what do I owe / have I paid / what's happening here," not
  // in admin terms like Maintenance/Slabs/Settings. "Ledger" never appears
  // here either — it's Account History under More; the same data, worded
  // the way a resident actually thinks about it.
  owner: [
    link('/living/home', 'Home'),
    link('/living/bill', 'My Bills'),
    link('/living/my-payments', 'Payments'),
    group('Community', '/living/notices', [
      { links: [
        { href: '/living/notices', label: 'Notices' },
        { href: '/living/meetings', label: 'Meetings' },
        { href: '/living/statements', label: 'Financial Statements' },
        { href: '/living/requests', label: 'Requests' },
      ] },
    ]),
    group('More', null, [
      { links: [
        { href: '/living/documents', label: 'Documents' },
        { href: '/living/my-account', label: 'Account History' },
        { href: '/living/my-flat', label: 'My Flat' },
      ] },
    ]),
  ],
}

export default function AppNav({
  role,
  apartmentName,
  onSignOut,
  userId,
  email,
}: {
  role: LivingRole
  apartmentName: string
  onSignOut: () => Promise<void>
  userId: string
  email: string | null
}) {
  const pathname = usePathname()
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const entries = NAV_BY_ROLE[role]
  const [menuOpen, setMenuOpen] = useState(false)
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const [groupPos, setGroupPos] = useState<{ top: number; left: number } | null>(null)
  const accountRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  useEffect(() => {
    if (!openGroup) return
    function handleClickOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenGroup(null)
    }
    function handleScroll() {
      setOpenGroup(null)
    }
    document.addEventListener('mousedown', handleClickOutside)
    // .links scrolls horizontally on its own (overflow-x: auto) and the
    // page can scroll too — close rather than let the fixed-position panel
    // drift away from the button that opened it.
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [openGroup])

  // Close any open group menu when the route changes — adjusted during
  // render (React's documented pattern for state that tracks a changing
  // prop) rather than in an effect, which would fire an extra render pass.
  const [prevPathname, setPrevPathname] = useState(pathname)
  if (pathname !== prevPathname) {
    setPrevPathname(pathname)
    setOpenGroup(null)
  }

  function toggleGroup(label: string, e: React.MouseEvent<HTMLButtonElement>) {
    if (openGroup === label) {
      setOpenGroup(null)
      return
    }
    // Anchor to the whole .navGroup wrapper (label + caret), not just the
    // caret button, so the panel lines up under the group's left edge.
    const rect = (e.currentTarget.parentElement ?? e.currentTarget).getBoundingClientRect()
    setGroupPos({ top: rect.bottom + 6, left: rect.left })
    setOpenGroup(label)
  }

  return (
    <header className={styles.bar}>
      <div className={styles.inner}>
        <Link href="/living/home" className={styles.brand}>
          <span className={styles.productName}>
            Nivenxa <span className={styles.productNameAccent}>Living</span>
          </span>
          <span className={styles.workspaceName}>{apartmentName}</span>
        </Link>

        <nav className={styles.links} ref={navRef}>
          {entries.map((entry) => {
            if (entry.kind === 'link') {
              const active = entry.href === '/living/home' ? pathname === '/living/home' : pathname.startsWith(entry.href)
              return (
                <Link key={entry.href} href={entry.href} className={active ? styles.linkActive : styles.link}>
                  {entry.label}
                </Link>
              )
            }

            const active = pathname === entry.overviewHref || entry.sections.some((s) => s.links.some((l) => pathname.startsWith(l.href)))
            const overviewHref = entry.overviewHref
            const isOpen = openGroup === entry.label
            return (
              <div key={entry.label} className={styles.navGroup}>
                <button
                  type="button"
                  className={active ? styles.linkActive : styles.link}
                  aria-haspopup="true"
                  aria-expanded={isOpen}
                  onClick={(e) => toggleGroup(entry.label, e)}
                >
                  {entry.label} <span className={styles.caret}>▾</span>
                </button>
                {isOpen && groupPos && (
                  <div className={styles.megaPanel} style={{ top: groupPos.top, left: groupPos.left }}>
                    <div className={styles.megaPanelTitle}>{entry.label}</div>
                    {overviewHref && (
                      <Link
                        href={overviewHref}
                        className={`${pathname === overviewHref ? styles.megaLinkActive : styles.megaLink} ${styles.megaOverview}`}
                      >
                        Overview
                      </Link>
                    )}
                    {entry.sections.map((section, i) => (
                      <div key={i} className={i === 0 && !overviewHref ? styles.megaSectionFirst : styles.megaSection}>
                        {section.heading && <div className={styles.megaSectionHeading}>{section.heading}</div>}
                        {section.links.map((l) => (
                          <Link key={l.href} href={l.href} className={pathname.startsWith(l.href) ? styles.megaLinkActive : styles.megaLink}>
                            {l.label}
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

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
              <button
                type="button"
                className={styles.signOut}
                onClick={() => {
                  setMenuOpen(false)
                  setFeedbackOpen(true)
                }}
              >
                Feedback
              </button>
              <form action={onSignOut}>
                <button type="submit" className={styles.signOut}>
                  Sign out
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      <FeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        app="living"
        identity={{ userId, email, role }}
      />
    </header>
  )
}
