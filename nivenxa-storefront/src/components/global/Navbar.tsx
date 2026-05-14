'use client'
import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { AnimatePresence, motion } from 'framer-motion'
import LanguageSwitcher from './LanguageSwitcher'
import { NAV_ITEMS } from '@/data/navigation'
import { EASE_OUT_EXPO, DURATION } from '@/lib/motion'
import { useAuth } from '@/context/AuthContext'
import SignInDrawer from './SignInDrawer'
import styles from './Navbar.module.scss'

export default function Navbar() {
  const t = useTranslations('nav')
  const [scrolled, setScrolled]                   = useState(false)
  const [menuOpen, setMenuOpen]                   = useState(false)
  const [activeMenu, setActiveMenu]               = useState<string | null>(null)
  const [hoveredSubItem, setHoveredSubItem]       = useState<string | null>(null)
  const [mobileExpanded, setMobileExpanded]       = useState<string | null>(null)
  const [mobileSubExpanded, setMobileSubExpanded] = useState<string | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { customer, loading, logout } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)

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

  useEffect(() => {
    if (!activeMenu) setHoveredSubItem(null)
  }, [activeMenu])

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
  const hoveredSub = hoveredSubItem
    ? activeItem?.submenu?.find((s) => s.label === hoveredSubItem)
    : null
  const atmosphere = hoveredSub?.atmosphere ?? activeItem?.atmosphere

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
            {!loading && (
              customer ? (
                <>
                  <Link href="/account" className={styles.authLink}>
                    {customer.firstName || 'Account'}
                  </Link>
                  <button className={styles.authLink} onClick={() => logout()}>
                    Sign Out
                  </button>
                </>
              ) : (
                <button className={styles.authLink} onClick={() => setDrawerOpen(true)}>
                  Account
                </button>
              )
            )}
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
              transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
            >
              <div className={styles.submenuInner}>
                <div className={styles.submenuCols}>

                  {/* Primary items column */}
                  <div className={styles.submenuCol}>
                    {activeItem.submenu.map((sub, i) => (
                      sub.children ? (
                        <div
                          key={sub.label}
                          className={`${styles.submenuLink} ${hoveredSubItem === sub.label ? styles.submenuLinkActive : ''}`}
                          onMouseEnter={() => setHoveredSubItem(sub.label)}
                        >
                          <span className={styles.submenuIndex}>0{i + 1}</span>
                          <span className={styles.submenuLabelWrap}>
                            <span className={styles.submenuLabel}>{sub.label}</span>
                            {sub.descriptor && (
                              <span className={`${styles.submenuDescriptor} ${hoveredSubItem === sub.label ? styles.submenuDescriptorVisible : ''}`}>
                                {sub.descriptor}
                              </span>
                            )}
                          </span>
                          <span className={styles.submenuArrow} />
                        </div>
                      ) : (
                        <Link
                          key={sub.label}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          href={sub.href as any}
                          className={`${styles.submenuLink} ${hoveredSubItem === sub.label ? styles.submenuLinkActive : ''}`}
                          onMouseEnter={() => setHoveredSubItem(sub.label)}
                          onClick={() => setActiveMenu(null)}
                        >
                          <span className={styles.submenuIndex}>0{i + 1}</span>
                          <span className={styles.submenuLabelWrap}>
                            <span className={styles.submenuLabel}>{sub.label}</span>
                            {sub.descriptor && (
                              <span className={`${styles.submenuDescriptor} ${hoveredSubItem === sub.label ? styles.submenuDescriptorVisible : ''}`}>
                                {sub.descriptor}
                              </span>
                            )}
                          </span>
                        </Link>
                      )
                    ))}
                  </div>

                  {/* Middle — editorial preview OR secondary flyout */}
                  <div className={styles.submenuMiddle}>
                    <AnimatePresence mode="wait">
                      {hoveredSub?.children ? (
                        <motion.div
                          key="children"
                          className={styles.submenuChildPanel}
                          initial={{ opacity: 0, x: 8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 8 }}
                          transition={{ duration: DURATION.sm, ease: EASE_OUT_EXPO }}
                        >
                          <p className={styles.submenuChildLabel}>{hoveredSub.label}</p>
                          {hoveredSub.children.map((child, i) => (
                            <Link
                              key={child.label}
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              href={child.href as any}
                              className={styles.submenuChildLink}
                              onClick={() => { setActiveMenu(null); setHoveredSubItem(null) }}
                            >
                              <span className={styles.submenuIndex}>0{i + 1}</span>
                              <span className={styles.submenuChildLinkLabel}>{child.label}</span>
                            </Link>
                          ))}
                        </motion.div>
                      ) : (
                        <motion.div
                          key={hoveredSubItem ?? 'default'}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: DURATION.xs }}
                        >
                          {(() => {
                            const atm = hoveredSub?.atmosphere ?? activeItem?.atmosphere
                            if (!atm) return null
                            const paragraphs = atm.editorial ?? atm.text.split('\n').filter(Boolean)
                            return (
                              <>
                                {paragraphs.map((para, i) => (
                                  <p key={i} className={styles.submenuEditorialBody}>{para}</p>
                                ))}
                                {atm.tags && (
                                  <ul className={styles.submenuEditorialTags}>
                                    {atm.tags.map((tag, i) => (
                                      <li key={i} className={styles.submenuEditorialTag}>{tag}</li>
                                    ))}
                                  </ul>
                                )}
                              </>
                            )
                          })()}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Right panel — always shows atmosphere image */}
                  <div className={styles.submenuRight}>
                    <AnimatePresence mode="wait">
                      {atmosphere && (
                        <motion.div
                          key={atmosphere.gradient}
                          className={styles.submenuAtmosphere}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: DURATION.xs }}
                        >
                          <div
                            className={styles.submenuAtmosphereFragment}
                            style={{ background: atmosphere.gradient }}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <SignInDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

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
                        transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
                        style={{ overflow: 'hidden' }}
                      >
                        {item.submenu.map((sub) => (
                          <li key={sub.label}>
                            {sub.children ? (
                              <>
                                <button
                                  className={`${styles.mobileSubmenuLink} ${styles.mobileSubmenuTrigger}`}
                                  onClick={() => setMobileSubExpanded(mobileSubExpanded === sub.label ? null : sub.label)}
                                  aria-expanded={mobileSubExpanded === sub.label}
                                >
                                  {sub.label}
                                  <span className={`${styles.mobileChevron} ${mobileSubExpanded === sub.label ? styles.mobileChevronOpen : ''}`} />
                                </button>
                                <AnimatePresence initial={false}>
                                  {mobileSubExpanded === sub.label && (
                                    <motion.ul
                                      className={styles.mobileSubSubmenu}
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
                                      style={{ overflow: 'hidden' }}
                                    >
                                      {sub.children.map((child) => (
                                        <li key={child.label}>
                                          <Link
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            href={child.href as any}
                                            className={styles.mobileSubSubmenuLink}
                                            onClick={() => { setMenuOpen(false); setMobileExpanded(null); setMobileSubExpanded(null) }}
                                          >
                                            {child.label}
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
                                href={sub.href as any}
                                className={styles.mobileSubmenuLink}
                                onClick={() => { setMenuOpen(false); setMobileExpanded(null) }}
                              >
                                {sub.label}
                              </Link>
                            )}
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
