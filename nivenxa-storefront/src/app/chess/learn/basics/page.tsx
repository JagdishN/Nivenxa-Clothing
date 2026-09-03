import Link from 'next/link'
import { BASICS } from '@/lib/chess/basics/data'
import styles from './BasicsList.module.scss'

export default function ChessLearnBasicsPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <Link href="/chess/learn" className={styles.breadcrumb}>
          ← Learn
        </Link>
        <h1 className={styles.heading}>Chess Basics</h1>
        <p className={styles.subtext}>Learn the board, the pieces, and how the game works — one lesson at a time.</p>
      </section>

      <div className={styles.grid}>
        {BASICS.map((lesson, i) => (
          <Link key={lesson.slug} href={`/chess/learn/basics/${lesson.slug}`} className={styles.card}>
            <span className={styles.cardNumber}>{i + 1}</span>
            <h2 className={styles.cardTitle}>{lesson.name}</h2>
            <p className={styles.cardDesc}>{lesson.summary}</p>
          </Link>
        ))}
      </div>
    </main>
  )
}
