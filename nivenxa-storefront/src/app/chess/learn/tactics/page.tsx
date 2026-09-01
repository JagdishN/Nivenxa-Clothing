import Link from 'next/link'
import { TACTICS } from '@/lib/chess/tactics/data'
import styles from './TacticsList.module.scss'

export default function ChessLearnTacticsPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <Link href="/chess/learn" className={styles.breadcrumb}>
          ← Learn
        </Link>
        <h1 className={styles.heading}>Tactics</h1>
        <p className={styles.subtext}>
          Pattern-based lessons on the motifs that decide most games, from simplest to most advanced. Pick a theme to step through it.
        </p>
      </section>

      <div className={styles.grid}>
        {TACTICS.map((tactic, i) => (
          <Link key={tactic.slug} href={`/chess/learn/tactics/${tactic.slug}`} className={styles.card}>
            <span className={styles.cardIndex}>{i + 1}</span>
            <h2 className={styles.cardTitle}>{tactic.name}</h2>
            <p className={styles.cardDesc}>{tactic.description}</p>
          </Link>
        ))}
      </div>
    </main>
  )
}
