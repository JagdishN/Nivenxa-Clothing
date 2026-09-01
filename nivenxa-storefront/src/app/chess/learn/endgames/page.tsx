import Link from 'next/link'
import { ENDGAMES } from '@/lib/chess/endgames/data'
import styles from './EndgamesList.module.scss'

export default function ChessLearnEndgamesPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <Link href="/chess/learn" className={styles.breadcrumb}>
          ← Learn
        </Link>
        <h1 className={styles.heading}>Endgames</h1>
        <p className={styles.subtext}>Core endgame technique — the ideas that turn a small edge into a full point.</p>
      </section>

      <div className={styles.grid}>
        {ENDGAMES.map((endgame) => (
          <Link key={endgame.slug} href={`/chess/learn/endgames/${endgame.slug}`} className={styles.card}>
            <h2 className={styles.cardTitle}>{endgame.name}</h2>
            <p className={styles.cardDesc}>{endgame.description}</p>
          </Link>
        ))}
      </div>
    </main>
  )
}
