import Link from 'next/link'
import { RULES } from '@/lib/chess/rules/data'
import styles from './RulesList.module.scss'

export default function ChessLearnRulesPage() {
  const illustrated = RULES.filter((r) => r.type === 'illustrated')
  const textOnly = RULES.filter((r) => r.type === 'text')

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <Link href="/chess/learn" className={styles.breadcrumb}>
          ← Learn
        </Link>
        <h1 className={styles.heading}>Rules</h1>
        <p className={styles.subtext}>A simplified guide to how chess is actually played and arbitrated, including the clock.</p>
      </section>

      <div className={styles.group}>
        <p className={styles.groupHeading}>Rules</p>
        <div className={styles.grid}>
          {illustrated.map((rule) => (
            <Link key={rule.slug} href={`/chess/learn/rules/${rule.slug}`} className={styles.card}>
              <h2 className={styles.cardTitle}>{rule.name}</h2>
              <p className={styles.cardDesc}>{rule.description}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className={styles.group}>
        <p className={styles.groupHeading}>Clock &amp; Etiquette</p>
        <div className={styles.grid}>
          {textOnly.map((rule) => (
            <Link key={rule.slug} href={`/chess/learn/rules/${rule.slug}`} className={styles.card}>
              <h2 className={styles.cardTitle}>{rule.name}</h2>
              <p className={styles.cardDesc}>{rule.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
