import type { Metadata } from 'next'
import VerifyGame from './VerifyGame'
import styles from './Verify.module.scss'

// Session-specific content, not generic enough to index — see
// chess/analysis/import/page.tsx for the full reasoning. (This route reads
// its game from sessionStorage, not a URL token — see this task's report
// for the referrer check that ruled out.)
export const metadata: Metadata = { robots: { index: false, follow: true } }

export default function ChessAnalysisVerifyPage() {
  return (
    <main className={styles.page}>
      <VerifyGame />
    </main>
  )
}
