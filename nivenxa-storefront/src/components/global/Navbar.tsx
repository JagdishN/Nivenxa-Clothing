'use client'
import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { AnimatePresence, motion } from 'framer-motion'
import LanguageSwitcher from './LanguageSwitcher'
import styles from './Navbar.module.scss'

interface Atmosphere { gradient: string; text: string; ghost?: string }
interface ChildItem  { label: string; href: string }
interface SubItem {
  label: string
  href: string | null
  descriptor?: string
  atmosphere?: Atmosphere
  children?: ChildItem[]
}
interface NavItem {
  label: string
  href: string | null
  atmosphere?: Atmosphere
  submenu: SubItem[] | null
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'SHOP',
    href: '/shop',
    atmosphere: {
      gradient: 'linear-gradient(150deg, #EDE8DC 0%, #D5CFC0 45%, #C2BAA8 100%)',
      text: 'Elevated Indian comfortwear\nrooted in heritage craft.',
      ghost: 'NIVENXA',
    },
    submenu: [
      {
        label: "Women's Collections",
        href: '/shop/women',
        descriptor: 'Relaxed Indo-Western comfortwear',
        atmosphere: {
          gradient: 'linear-gradient(148deg, #C89080 0%, #A87060 55%, #8A5548 100%)',
          text: "Relaxed women's forms\nin bio-washed and natural fibres.",
          ghost: 'WOMEN',
        },
      },
      {
        label: 'Unisex Essentials',
        href: '/shop/unisex',
        descriptor: 'Heavyweight everyday silhouettes',
        atmosphere: {
          gradient: 'linear-gradient(145deg, #C8C4B0 0%, #B0AC9A 50%, #9A9888 100%)',
          text: 'Heavy GSM unisex staples\nfor the considered wardrobe.',
          ghost: 'UNISEX',
        },
      },
      {
        label: 'Youth Studio',
        href: '/shop/kids',
        descriptor: 'Playful comfortwear for younger wardrobes',
        atmosphere: {
          gradient: 'linear-gradient(148deg, #8EA890 0%, #728C74 50%, #5A7060 100%)',
          text: 'Premium kids collections\nbuilt to last, made to wear.',
          ghost: 'YOUTH',
        },
      },
    ],
  },
  {
    label: 'EDITS',
    href: null,
    atmosphere: {
      gradient: 'linear-gradient(148deg, #D4CFBA 0%, #BFBA9E 50%, #ACA890 100%)',
      text: 'Heavyweight bio-washed essentials\ncrafted for elevated everyday wear.',
      ghost: 'NIVENXA',
    },
    submenu: [
      {
        label: 'Slow Comfort',
        href: '/shop/women-lounge-sets',
        descriptor: 'Cloud-soft modal for slow mornings',
        atmosphere: {
          gradient: 'linear-gradient(155deg, #EDE8DC 0%, #D8D0C0 40%, #C8BEA8 100%)',
          text: 'Cloud-soft modal co-ords\nfor slow, considered mornings.',
          ghost: 'COMFORT',
        },
      },
      {
        label: 'Utility Cargo',
        href: '/shop/cargo-pants',
        descriptor: 'Six-pocket bio-washed canvas',
        atmosphere: {
          gradient: 'linear-gradient(150deg, #4A4840 0%, #3A3730 55%, #2E2C26 100%)',
          text: 'Six-pocket utility cuts\nin 320 GSM bio-washed canvas twill.',
          ghost: 'CARGO',
        },
        children: [
          { label: 'Relaxed Utility',    href: '/shop/cargo-pants' },
          { label: 'Urban Movement',     href: '/shop/cargo-pants' },
          { label: 'Heavyweight Canvas', href: '/shop/cargo-pants' },
        ],
      },
      {
        label: 'Everyday Silhouettes',
        href: '/shop/women-indo-western',
        descriptor: 'Modern Indo-western forms',
        atmosphere: {
          gradient: 'linear-gradient(140deg, #C87060 0%, #A85848 60%, #8A4538 100%)',
          text: 'Modern Indo-western forms\nfor elevated everyday ease.',
          ghost: 'FORM',
        },
      },
      {
        label: 'Bio-Washed Essentials',
        href: '/shop/unisex',
        descriptor: 'Heavy GSM unisex staples',
        atmosphere: {
          gradient: 'linear-gradient(145deg, #D4CFBA 0%, #BFBA9E 55%, #ACA890 100%)',
          text: 'Heavyweight bio-washed essentials\ncrafted for elevated everyday wear.',
          ghost: 'WASHED',
        },
      },
      {
        label: 'Oversized Tees',
        href: '/shop/over-tee-shirts',
        descriptor: 'Boxy heritage drop-shoulder cuts',
        atmosphere: {
          gradient: 'linear-gradient(150deg, #4A4844 0%, #383432 55%, #282826 100%)',
          text: 'Dense combed cotton\nin boxy heritage drop-shoulder silhouettes.',
          ghost: 'OVERSIZED',
        },
      },
      {
        label: 'Everyday Essentials',
        href: '/shop/unisex',
        descriptor: 'Unisex staples for elevated daily wear',
        atmosphere: {
          gradient: 'linear-gradient(142deg, #D8D4C4 0%, #C4C0AE 50%, #B4B0A0 100%)',
          text: 'Unisex staples in heavy GSM\nfor effortless, elevated daily wear.',
          ghost: 'DAILY',
        },
      },
      {
        label: 'Sleepwear',
        href: null,
        descriptor: 'Considered rest, ultra-soft fabrics',
        atmosphere: {
          gradient: 'linear-gradient(148deg, #EAE6DC 0%, #DEDAD0 50%, #CCC8C0 100%)',
          text: 'Ultra-soft nightwear\nfor considered rest.',
          ghost: 'REST',
        },
        children: [
          { label: "Women's Sleepwear", href: '/shop/women-lounge-sets' },
          { label: 'Kids Sleepwear',    href: '/shop/kids-nightwear'    },
          { label: 'Unisex Lounge Sets',href: '/shop/unisex'            },
        ],
      },
    ],
  },
  {
    label: 'STORIES',
    href: '/stories',
    atmosphere: {
      gradient: 'linear-gradient(148deg, #C8C0A8 0%, #B0A890 50%, #9A9278 100%)',
      text: 'Behind every fabric,\na story worth telling.',
      ghost: 'STORIES',
    },
    submenu: [
      {
        label: 'Craftsmanship',
        href: '/stories/craftsmanship',
        descriptor: 'Hands that weave with intention',
        atmosphere: {
          gradient: 'linear-gradient(145deg, #D4CABC 0%, #C0B4A4 50%, #A89C8C 100%)',
          text: 'Hands that weave,\nstitch, and finish with intention.',
          ghost: 'CRAFT',
        },
      },
      {
        label: 'Fabric Journal',
        href: '/stories/fabric-journal',
        descriptor: 'GSM weights and weave science',
        atmosphere: {
          gradient: 'linear-gradient(150deg, #D8D0C0 0%, #C8C0AE 50%, #B4ACA0 100%)',
          text: 'GSM weights, weave counts,\nand the science of feel.',
          ghost: 'FABRIC',
        },
      },
      {
        label: 'Made in India',
        href: '/stories/made-in-india',
        descriptor: 'Heritage roots, modern form',
        atmosphere: {
          gradient: 'linear-gradient(142deg, #D07E62 0%, #C46E52 55%, #A45840 100%)',
          text: 'Rooted in Indian heritage,\nbuilt for the modern wardrobe.',
          ghost: 'INDIA',
        },
      },
      {
        label: 'Campaigns',
        href: '/stories/campaigns',
        descriptor: 'Editorial imagery for slow living',
        atmosphere: {
          gradient: 'linear-gradient(148deg, #4A4840 0%, #3A3730 55%, #2A2824 100%)',
          text: 'Editorial imagery\nfor a considered lifestyle.',
          ghost: 'VISUAL',
        },
      },
      {
        label: 'The Process',
        href: '/stories/the-process',
        descriptor: 'From loom to label',
        atmosphere: {
          gradient: 'linear-gradient(145deg, #8EA890 0%, #708070 55%, #526055 100%)',
          text: 'From loom to label —\nevery step, considered.',
          ghost: 'PROCESS',
        },
      },
    ],
  },
]

export default function Navbar() {
  const t = useTranslations('nav')
  const [scrolled, setScrolled]                   = useState(false)
  const [menuOpen, setMenuOpen]                   = useState(false)
  const [activeMenu, setActiveMenu]               = useState<string | null>(null)
  const [hoveredSubItem, setHoveredSubItem]       = useState<string | null>(null)
  const [mobileExpanded, setMobileExpanded]       = useState<string | null>(null)
  const [mobileSubExpanded, setMobileSubExpanded] = useState<string | null>(null)
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

                  {/* Right panel — children flyout OR atmospheric preview */}
                  <div className={styles.submenuRight}>
                    <AnimatePresence mode="wait">
                      {hoveredSub?.children ? (
                        <motion.div
                          key="children"
                          className={styles.submenuChildPanel}
                          initial={{ opacity: 0, x: 14 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 14 }}
                          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
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
                      ) : atmosphere ? (
                        <motion.div
                          key={atmosphere.gradient}
                          className={styles.submenuAtmosphere}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.22 }}
                        >
                          {atmosphere.ghost && (
                            <span className={styles.submenuAtmosphereGhost} aria-hidden>
                              {atmosphere.ghost}
                            </span>
                          )}
                          <div
                            className={styles.submenuAtmosphereFragment}
                            style={{ background: atmosphere.gradient }}
                          />
                          <p className={styles.submenuAtmosphereText}>
                            {atmosphere.text}
                          </p>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>

                </div>
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
                                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
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
