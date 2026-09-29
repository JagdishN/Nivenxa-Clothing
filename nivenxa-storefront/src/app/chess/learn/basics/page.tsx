import Link from 'next/link'
import { BASICS } from '@/lib/chess/basics/data'
import BasicsGrid from './BasicsGrid'
import styles from './BasicsList.module.scss'

export default function ChessLearnBasicsPage() {
  return (
    <main className={styles.page}>
      <div className={styles.pageInner}>
        <section className={styles.hero}>
          <Link href="/chess/learn" className={styles.breadcrumb}>
            ← Back to Learn
          </Link>
          <h1 className={styles.heading}>Chess Basics</h1>
          <p className={styles.subtext}>Learn how chess works, one simple lesson at a time.</p>
        </section>

        <BasicsGrid lessons={BASICS} />
      </div>
    </main>
  )
}
