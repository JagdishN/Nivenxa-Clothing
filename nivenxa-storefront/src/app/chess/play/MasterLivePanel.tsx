import { getCapturedPieces } from '@/lib/chess/positionFacts'
import type { MoveAnalysisEntry } from '@/lib/chess/types'
import MovePairsTable from './MovePairsTable'
import styles from './Play.module.scss'

/**
 * Master's live right panel — Board/Clock/Moves, nothing else. No live
 * prose ever (Master is graded silently the whole game — see
 * resolveExplanationMode's 'summary-only' — Review Game after the game is
 * still where all of Master's explanations live, unchanged from before).
 *
 * The Moves list and Captured Pieces are real chess-game information that
 * naturally fills the panel as the game progresses, rather than artificial
 * padding for an early-game move count.
 */
export default function MasterLivePanel({
  movePairs,
  selectedPly,
  onSelectMove,
  turn,
  plyCount,
  fen,
  reviewing,
  onBackToLive,
}: {
  movePairs: [MoveAnalysisEntry | undefined, MoveAnalysisEntry | undefined][]
  selectedPly: number | null
  onSelectMove: (entry: MoveAnalysisEntry) => void
  turn: 'w' | 'b'
  plyCount: number
  fen: string
  reviewing: boolean
  onBackToLive: () => void
}) {
  const moveNumber = Math.floor(plyCount / 2) + 1
  const captured = getCapturedPieces(fen)

  return (
    <div className={styles.panelBody}>
      <p className={styles.dashboardEyebrow}>MASTER</p>
      <p className={styles.dashboardSectionBody}>
        Move {moveNumber} · {turn === 'w' ? 'White' : 'Black'} to move
      </p>

      {reviewing && (
        <button type="button" className={styles.backToMovesBtn} onClick={onBackToLive}>
          ← Back to current position
        </button>
      )}

      <div className={styles.dashboardBody}>
        <MovePairsTable movePairs={movePairs} selectedPly={selectedPly} onSelectMove={onSelectMove} />

        <div className={styles.capturedSection}>
          <p className={styles.dashboardSectionTitle}>Captured Pieces</p>
          <div className={styles.capturedRow}>
            <span className={styles.capturedLabel}>White</span>
            <span className={styles.capturedPieces}>{captured.white.length > 0 ? captured.white.join(' ') : '—'}</span>
          </div>
          <div className={styles.capturedRow}>
            <span className={styles.capturedLabel}>Black</span>
            <span className={styles.capturedPieces}>{captured.black.length > 0 ? captured.black.join(' ') : '—'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
