import type { Metadata } from 'next'
import Link from 'next/link'
import ImportGameForm from './ImportGameForm'
import styles from './Import.module.scss'

// A workflow step reached only from the /chess/analysis picker, not a
// standalone landing page — noindex, not Disallow (which would still let
// the bare URL sit in results with no content). follow: true, it still
// links onward.
export const metadata: Metadata = { robots: { index: false, follow: true } }

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
