'use client'
import { useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/routing'
import styles from './LanguageSwitcher.module.scss'

const SECTIONS = [
  {
    locales: [{ code: 'en', native: 'English' }],
  },
  {
    label: 'INDIC',
    locales: [
      { code: 'hi', native: 'हिन्दी' },
      { code: 'bn', native: 'বাংলা' },
      { code: 'te', native: 'తెలుగు' },
      { code: 'mr', native: 'मराठी' },
      { code: 'ta', native: 'தமிழ்' },
      { code: 'gu', native: 'ગુજરાતી' },
      { code: 'kn', native: 'ಕನ್ನಡ' },
    ],
  },
  {
    label: 'GLOBAL',
    locales: [
      { code: 'fr', native: 'Français' },
      { code: 'de', native: 'Deutsch' },
      { code: 'es', native: 'Español' },
      { code: 'ar', native: 'العربية' },
      { code: 'ja', native: '日本語' },
      { code: 'zh', native: '中文' },
    ],
  },
]

export default function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const select = (code: string) => {
    router.replace(pathname, { locale: code })
    setOpen(false)
  }

  return (
    <div className={styles.wrapper} ref={ref}>
      <button
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Select language"
        aria-expanded={open}
      >
        <GlobeIcon />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="backdrop"
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
        )}
        {open && (
          <motion.div
            key="panel"
            className={styles.panel}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-label="Language selection"
          >
            <p className={styles.panelHeading}>Select Language</p>
            <div className={styles.rule} />

            {SECTIONS.map((section, i) => (
              <div
                key={i}
                className={i > 0 ? `${styles.section} ${styles.sectionSpaced}` : styles.section}
              >
                {section.label && (
                  <p className={styles.sectionLabel}>{section.label}</p>
                )}
                <ul className={styles.list} role="list">
                  {section.locales.map(({ code, native }) => (
                    <li key={code}>
                      <button
                        className={`${styles.localeBtn} ${locale === code ? styles.active : ''}`}
                        onClick={() => select(code)}
                        lang={code}
                      >
                        {native}
                        {locale === code && <span className={styles.activeDot} aria-hidden="true" />}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function GlobeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="0.9" />
      <ellipse cx="8" cy="8" rx="2.8" ry="6.5" stroke="currentColor" strokeWidth="0.9" />
      <line x1="1.5" y1="8" x2="14.5" y2="8" stroke="currentColor" strokeWidth="0.9" />
      <path d="M2.8 5h10.4" stroke="currentColor" strokeWidth="0.8" />
      <path d="M2.8 11h10.4" stroke="currentColor" strokeWidth="0.8" />
    </svg>
  )
}
