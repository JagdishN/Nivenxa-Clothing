import Link from 'next/link'
import ImportGameForm from './ImportGameForm'
import styles from './Import.module.scss'

export default function ChessAnalysisImportPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <Link href="/chess/analysis" className={styles.breadcrumb}>
          ← Analysis
        </Link>
        <p className={styles.eyebrow}>NIVENXA CHESS · ANALYSIS</p>
        <h1 className={styles.heading}>Import a Game</h1>
        <p className={styles.subtext}>Already have your game? Upload it or paste your moves below.</p>
      </section>
      <ImportGameForm />
    </main>
  )
}
