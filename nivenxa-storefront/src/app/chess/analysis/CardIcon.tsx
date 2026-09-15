import styles from './Analysis.module.scss'

/**
 * Small restrained line icons for the three landing-page entry cards — 30px,
 * single-color stroke (purple), one gold accent per icon. Not illustrations;
 * just enough to make the three methods recognizable before reading copy.
 */
export default function CardIcon({ type, size }: { type: 'import' | 'recreate' | 'games'; size?: number }) {
  return (
    <span className={styles.cardIcon} aria-hidden="true" style={size ? { width: size, height: size } : undefined}>
      {type === 'import' && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 15V4" />
          <path d="M7 8l5-5 5 5" />
          <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
        </svg>
      )}
      {type === 'recreate' && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="7.2" r="2.6" fill="var(--chess-gold)" stroke="none" />
          <path d="M9.4 12.2c0-1.5 1.1-2.6 2.6-2.6s2.6 1.1 2.6 2.6" />
          <path d="M9 15.5h6" />
          <path d="M8.8 15.5l-1.2 4M15.2 15.5l1.2 4" />
          <path d="M7.6 19.5h8.8" />
        </svg>
      )}
      {type === 'games' && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v4h4" />
          <path d="M12 8v4l3 2" />
        </svg>
      )}
    </span>
  )
}
