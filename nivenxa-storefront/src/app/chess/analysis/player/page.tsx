import { Suspense } from 'react'
import { getChessSession } from '@/lib/chess/chessAuth'
import AnalysisPlayer from './AnalysisPlayer'
import styles from './Player.module.scss'

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
