import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getChessSession } from '@/lib/chess/chessAuth'
import AnalysisPlayer from './AnalysisPlayer'
import styles from './Player.module.scss'

// Session-specific content, not generic enough to index — see
// chess/analysis/import/page.tsx for the full reasoning.
export const metadata: Metadata = { robots: { index: false, follow: true } }

export default async function ChessAnalysisPlayerPage() {
  const session = await getChessSession()

  return (
    <main className={styles.page}>
      <Suspense fallback={null}>
        <AnalysisPlayer isLoggedIn={!!session} />
      </Suspense>
    </main>
  )
}
