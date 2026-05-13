'use client'
import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { AnimatePresence, motion } from 'framer-motion'
import LanguageSwitcher from './LanguageSwitcher'
import styles from './Navbar.module.scss'

interface SubItem { label: string; href: string }
interface NavItem {
  label: string
  href: string | null
  submenu: SubItem[] | null
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'SHOP',
    href: '/shop',
    submenu: [
      { label: "Women's Collections", href: '/shop/women'  },
      { label: 'Everyday Essentials', href: '/shop/unisex' },
      { label: 'Youth Studio',        href: '/shop/kids'   },
    ],
  },
  {
    label: 'EDITS',
    href: null,
    submenu: [
      { label: 'Slow Comfort',          href: '/shop/women-lounge-sets'  },
      { label: 'Utility Cargo',         href: '/shop/cargo-pants'        },
      { label: 'Everyday Silhouettes',  href: '/shop/women-indo-western' },
      { label: 'Bio-Washed Essentials', href: '/shop/unisex'             },
      { label: 'Oversized Tees',        href: '/shop/over-tee-shirts'    },
    ],
  },
  {
    label: 'STORIES',
    href: '/stories',
    submenu: null,
  },
]

export default function Navbar() {
  const t = useTranslations('nav')
  const [scrolled, setScrolled]         = useState(false)
  const [menuOpen, setMenuOpen]         = useState(false)
  const [activeMenu, setActiveMenu]     = useState<string | null>(null)
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setMenuOpen(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const openMenu = (name: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setActiveMenu(name)
  }

  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setActiveMenu(null), 180)
  }

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }

  const activeItem = NAV_ITEMS.find((item) => item.label === activeMenu)

  return (
    <>
      <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
        <nav className={styles.nav}>
          <Link href="/" className={styles.logo}>NIVENXA</Link>

          <ul className={styles.navLinks}>
            {NAV_ITEMS.map((item) => (
              <li
                key={item.label}
                className={styles.navItem}
                onMouseEnter={() => item.submenu ? openMenu(item.label) : setActiveMenu(null)}
                onMouseLeave={item.submenu ? scheduleClose : undefined}
              >
                {item.href ? (
                  <Link
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    href={item.href as any}
                    className={`${styles.navLink} ${activeMenu === item.label ? styles.navLinkActive : ''}`}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <button
                    className={`${styles.navLink} ${styles.navLinkBtn} ${activeMenu === item.label ? styles.navLinkActive : ''}`}
                  >
                    {item.label}
                  </button>
                )}
              </li>
            ))}
          </ul>

          <div className={styles.navActions}>
            <LanguageSwitcher />
            <button className={styles.cartBtn}>{t('cart')} (0)</button>
          </div>

          <button
            className={`${styles.hamburger} ${menuOpen ? styles.hamburgerOpen : ''}`}
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? t('closeMenu') : t('openMenu')}
            aria-expanded={menuOpen}
          >
            <span />
            <span />
            <span />
          </button>
        </nav>

        {/* Desktop editorial submenu panel */}
        <AnimatePresence>
          {activeMenu && activeItem?.submenu && (
            <motion.div
              className={styles.submenuPanel}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
            >
              <div className={styles.submenuInner}>
                {activeItem.submenu.map((sub, i) => (
                  <Link
                    key={sub.label}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    href={sub.href as any}
                    className={styles.submenuLink}
                    onClick={() => setActiveMenu(null)}
                  >
                    <span className={styles.submenuIndex}>0{i + 1}</span>
                    <span className={styles.submenuLabel}>{sub.label}</span>
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Mobile menu */}
      <nav
        className={`${styles.mobileMenu} ${menuOpen ? styles.mobileMenuOpen : ''} ${scrolled ? styles.mobileMenuScrolled : ''}`}
        aria-hidden={!menuOpen}
      >
        <ul className={styles.mobileList}>
          {NAV_ITEMS.map((item) => (
            <li key={item.label} className={styles.mobileNavItem}>
              {item.submenu ? (
                <>
                  <button
                    className={`${styles.mobileNavLink} ${styles.mobileNavTrigger}`}
                    onClick={() => setMobileExpanded(mobileExpanded === item.label ? null : item.label)}
                    aria-expanded={mobileExpanded === item.label}
                  >
                    {item.label}
                    <span className={`${styles.mobileChevron} ${mobileExpanded === item.label ? styles.mobileChevronOpen : ''}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {mobileExpanded === item.label && (
                      <motion.ul
                        className={styles.mobileSubmenu}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        style={{ overflow: 'hidden' }}
                      >
                        {item.submenu.map((sub) => (
                          <li key={sub.label}>
                            <Link
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              href={sub.href as any}
                              className={styles.mobileSubmenuLink}
                              onClick={() => { setMenuOpen(false); setMobileExpanded(null) }}
                            >
                              {sub.label}
                            </Link>
                          </li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <Link
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  href={item.href as any}
                  className={styles.mobileNavLink}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              )}
            </li>
          ))}
          <li>
            <span className={styles.mobileNavLink}>{t('cart')} (0)</span>
          </li>
          <li className={styles.mobileLangItem}>
            <LanguageSwitcher />
          </li>
        </ul>
      </nav>
    </>
  )
}
