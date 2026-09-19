import Link from 'next/link'
import OpeningLesson from './OpeningLesson'
import { DIFFICULTY_EMOJI, DIFFICULTY_META_LABEL, type Opening } from '@/lib/chess/openings/data'
import styles from './OpeningDetail.module.scss'

export default function OpeningDetail({ opening }: { opening: Opening }) {
  const minutes = Math.max(1, Math.round(opening.moves.length * 0.35))

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/chess/learn">Learn</Link>
          <span aria-hidden="true">→</span>
          <Link href="/chess/learn/openings">Openings</Link>
          <span aria-hidden="true">→</span>
          <span>{opening.name}</span>
        </nav>
        <h1 className={styles.heading}>{opening.name}</h1>
        <p className={styles.subtext}>{opening.description}</p>
        <div className={styles.metaRow}>
          <span className={styles.metaItem}>
            {DIFFICULTY_EMOJI[opening.difficulty]} {DIFFICULTY_META_LABEL[opening.difficulty]}
          </span>
          <span className={styles.metaDot} aria-hidden="true" />
          <span className={styles.metaItem}>{opening.playedBy === 'white' ? '♙ White' : '♟ Black'}</span>
          <span className={styles.metaDot} aria-hidden="true" />
          <span className={styles.metaItem}>{opening.moves.length} moves</span>
          <span className={styles.metaDot} aria-hidden="true" />
          <span className={styles.metaItem}>~{minutes} min</span>
        </div>
      </section>

      <OpeningLesson opening={opening} />
    </main>
  )
}
