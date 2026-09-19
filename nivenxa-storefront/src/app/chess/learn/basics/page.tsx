import Link from 'next/link'
import { BASICS } from '@/lib/chess/basics/data'
import BasicsGrid from './BasicsGrid'
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

      <BasicsGrid lessons={BASICS} />
    </main>
  )
}
