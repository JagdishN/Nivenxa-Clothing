import Link from 'next/link'
import { ENDGAMES } from '@/lib/chess/endgames/data'
import styles from './EndgamesList.module.scss'

// One icon per endgame — only 3 entries, quick to pick individually.
const ENDGAME_ICON: Record<string, string> = {
  'king-and-pawn-vs-king': '♟️',
  'basic-checkmates': '👑',
  'king-activity': '🚶',
}

export default function ChessLearnEndgamesPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <Link href="/chess/learn" className={styles.breadcrumb}>
          ← Back to Learn
        </Link>
        <h1 className={styles.heading}>Endgames</h1>
        <p className={styles.subtext}>Learn what to do when only a few pieces are left.</p>
      </section>

      <div className={styles.grid}>
        {ENDGAMES.map((endgame, i) => (
          <Link key={endgame.slug} href={`/chess/learn/endgames/${endgame.slug}`} className={styles.card}>
            <span className={styles.cardTop}>
              <span className={styles.cardIcon} aria-hidden="true">
                {ENDGAME_ICON[endgame.slug] ?? '♟️'}
              </span>
              <span className={styles.cardNumber}>{String(i + 1).padStart(2, '0')}</span>
            </span>
            <h2 className={styles.cardTitle}>{endgame.name}</h2>
            <p className={styles.cardDesc}>{endgame.description}</p>
            <span className={styles.cardFooter}>
              <span className={styles.cardCta}>Learn →</span>
            </span>
          </Link>
        ))}
      </div>
    </main>
  )
}
