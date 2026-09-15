import { Suspense } from 'react'
import AnalysisPlayer from './AnalysisPlayer'
import styles from './Player.module.scss'

export default function ChessAnalysisPlayerPage() {
  return (
    <main className={styles.page}>
      <Suspense fallback={null}>
        <AnalysisPlayer />
      </Suspense>
    </main>
  )
}
