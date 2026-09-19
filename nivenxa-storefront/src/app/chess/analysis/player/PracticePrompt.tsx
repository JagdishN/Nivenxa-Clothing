import { useState } from 'react'
import type { UsePracticePositionResult } from '@/lib/chess/usePracticePosition'
import { getOrCreateAnalysisOwnerId } from '@/lib/chess/analysisOwner'
import { savePracticePosition } from '@/lib/chess/analysisActions'
import styles from './Player.module.scss'

/**
 * The "Try It Yourself" chrome — sits beside the shared board while it's in
 * Practice mode. Deliberately has no board of its own; AnalysisPlayer feeds
 * the same Board component practice.fen/dests/onMove while this is active.
 */
export default function PracticePrompt({
  practice,
  startFen,
  sourceGameId,
  onContinue,
}: {
  practice: UsePracticePositionResult
  startFen: string | null
  sourceGameId?: string
  onContinue: () => void
}) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  async function handleSavePuzzle() {
    if (!startFen) return
    setSaveStatus('saving')
    const ownerId = getOrCreateAnalysisOwnerId()
    const result = await savePracticePosition({ ownerId, fen: startFen, sourceGameId })
    setSaveStatus(result.error ? 'error' : 'saved')
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelMoveNum}>Practice Position</span>
        <button type="button" className={styles.linkBtn} onClick={handleSavePuzzle} disabled={saveStatus === 'saving' || saveStatus === 'saved'}>
          {saveStatus === 'saved' ? 'Saved to My Puzzles ✓' : saveStatus === 'saving' ? 'Saving…' : 'Save to My Puzzles'}
        </button>
      </div>

      {practice.status === 'loading' && <p className={styles.panelPlaceholder}>Setting up the position…</p>}

      {(practice.status === 'ready' || practice.status === 'trying') && (
        <>
          <p className={styles.panelPlayed}>Your turn — find a better move.</p>
          {practice.hintText && <p className={styles.practiceHint}>{practice.hintText}</p>}
          <button type="button" className={styles.linkBtn} onClick={practice.revealAnswer}>
            Show Answer
          </button>
        </>
      )}

      {practice.status === 'wrong' && (
        <p className={styles.practiceFeedback}>
          {practice.wrongAttempts <= 1
            ? "Interesting idea, but there's a stronger move here. Try again."
            : 'Not quite — look again at the position.'}
        </p>
      )}

      {practice.status === 'correct' && (
        <>
          <p className={styles.practiceFeedbackGood}>Excellent! That was the strongest move here.</p>
          <button type="button" className={styles.transportBtnPrimary} onClick={onContinue}>
            Continue Analysis
          </button>
        </>
      )}

      {practice.status === 'revealed' && (
        <>
          <p className={styles.practiceFeedback}>The best move was {practice.solutionSan}.</p>
          <button type="button" className={styles.transportBtnPrimary} onClick={onContinue}>
            Continue Analysis
          </button>
        </>
      )}
    </div>
  )
}
