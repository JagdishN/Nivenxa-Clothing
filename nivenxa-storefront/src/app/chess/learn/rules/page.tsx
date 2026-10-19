import Link from 'next/link'
import { RULES } from '@/lib/chess/rules/data'
import styles from './RulesList.module.scss'

// One icon per group (illustrated rules vs clock/etiquette facts) — the
// grouping itself is already thematic, so this is a fast, meaningful split
// without a per-rule data field.
const GROUP_ICON = { illustrated: '♟️', text: '⏱️' } as const

export default function ChessLearnRulesPage() {
  const illustrated = RULES.filter((r) => r.type === 'illustrated')
  const textOnly = RULES.filter((r) => r.type === 'text')

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <Link href="/chess/learn" className={styles.breadcrumb}>
          ← Back to Learn
        </Link>
        <h1 className={styles.heading}>Rules</h1>
        <p className={styles.subtext}>Learn special moves, draw rules and how to use a chess clock.</p>
      </section>

      {/* No groupHeading here — it used to say "Rules", repeating the <h1>
          above. .groupFirst supplies the header-to-cards gap that heading's
          own margin used to provide. */}
      <div className={`${styles.group} ${styles.groupFirst}`}>
        <div className={styles.grid}>
          {illustrated.map((rule, i) => (
            <Link key={rule.slug} href={`/chess/learn/rules/${rule.slug}`} className={styles.card}>
              <span className={styles.cardTop}>
                <span className={styles.cardIcon} aria-hidden="true">
                  {GROUP_ICON.illustrated}
                </span>
                <span className={styles.cardNumber}>{String(i + 1).padStart(2, '0')}</span>
              </span>
              <h2 className={styles.cardTitle}>{rule.name}</h2>
              <p className={styles.cardDesc}>{rule.description}</p>
              <span className={styles.cardFooter}>
                <span className={styles.cardCta}>Learn →</span>
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className={styles.group}>
        <p className={styles.groupHeading}>Clock &amp; Etiquette</p>
        <div className={styles.grid}>
          {textOnly.map((rule, i) => (
            <Link key={rule.slug} href={`/chess/learn/rules/${rule.slug}`} className={styles.card}>
              <span className={styles.cardTop}>
                <span className={styles.cardIcon} aria-hidden="true">
                  {GROUP_ICON.text}
                </span>
                <span className={styles.cardNumber}>{String(illustrated.length + i + 1).padStart(2, '0')}</span>
              </span>
              <h2 className={styles.cardTitle}>{rule.name}</h2>
              <p className={styles.cardDesc}>{rule.description}</p>
              <span className={styles.cardFooter}>
                <span className={styles.cardCta}>Learn →</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
