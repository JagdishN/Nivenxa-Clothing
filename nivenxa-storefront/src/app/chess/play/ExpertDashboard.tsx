'use client'
import { useState } from 'react'
import { formatEvalLabel } from '@/lib/chess/engineEval'
import { matchOpeningFamily } from '@/lib/chess/openingMatch'
import { classificationTone, formatClassification } from '@/lib/chess/moveClassification'
import { getPositionFacts } from '@/lib/chess/positionFacts'
import type { MoveAnalysisEntry, QualityMoveEntry } from '@/lib/chess/types'
import MovePairsTable from './MovePairsTable'
import styles from './Play.module.scss'

/**
 * Expert's live right panel — a position dashboard, not a coaching feed. No
 * move gets auto-explained here (see shouldAutoExplainLive in skillTiers.ts)
 * — this reads classification/eval straight off entries useMoveAnalysis
 * already grades for every Expert move, no extra engine or AI calls.
 *
 * The eval/opening/position-facts block only reflects the last *completed*
 * move (latestEntry) — never the live position while the player is still
 * deciding their own move, so this never functions as a thinking-time hint,
 * same principle as never showing the engine's best move.
 */
export default function ExpertDashboard({
  strength,
  totalSteps,
  latestEntry,
  latestPlayerEntry,
  sanHistory,
  fen,
  plyCount,
  movePairs,
  selectedPly,
  onSelectMove,
  reviewing,
  onBackToLive,
}: {
  strength: number
  totalSteps: number
  latestEntry: QualityMoveEntry | undefined
  latestPlayerEntry: QualityMoveEntry | undefined
  sanHistory: string[]
  fen: string
  plyCount: number
  movePairs: [MoveAnalysisEntry | undefined, MoveAnalysisEntry | undefined][]
  selectedPly: number | null
  onSelectMove: (entry: MoveAnalysisEntry) => void
  reviewing: boolean
  onBackToLive: () => void
}) {
  const [tab, setTab] = useState<'position' | 'moves'>('position')

  const evalWhitePerspective = latestEntry ? (latestEntry.color === 'w' ? latestEntry.evalAfterCp : -latestEntry.evalAfterCp) : 0
  const { score, label } = formatEvalLabel(evalWhitePerspective)
  const opening = matchOpeningFamily(sanHistory)
  const facts = getPositionFacts(fen, plyCount)

  const showChip = latestPlayerEntry && latestPlayerEntry.classification !== 'best' && latestPlayerEntry.classification !== 'excellent' && latestPlayerEntry.classification !== 'good'

  return (
    <div className={styles.panelBody}>
      <p className={styles.dashboardEyebrow}>EXPERT · Strength {strength}/{totalSteps}</p>

      {showChip && latestPlayerEntry && (
        <div className={`${styles.classificationChip} ${styles[`classificationChip_${classificationTone(latestPlayerEntry.classification)}`]}`}>
          {latestPlayerEntry.san} — {formatClassification(latestPlayerEntry.classification)}
        </div>
      )}

      {reviewing && (
        <button type="button" className={styles.backToMovesBtn} onClick={onBackToLive}>
          ← Back to current position
        </button>
      )}

      <div className={styles.dashboardTabs}>
        <button
          type="button"
          className={`${styles.segmentedOption} ${tab === 'position' ? styles.segmentedOptionSelected : ''}`}
          onClick={() => setTab('position')}
        >
          Position
        </button>
        <button
          type="button"
          className={`${styles.segmentedOption} ${tab === 'moves' ? styles.segmentedOptionSelected : ''}`}
          onClick={() => setTab('moves')}
        >
          Moves
        </button>
      </div>

      {tab === 'position' ? (
        <div className={styles.dashboardBody}>
          <div className={styles.evalBlock}>
            <span className={styles.evalScore}>{score}</span>
            <span className={styles.evalLabel}>{label}</span>
          </div>

          {opening && (
            <div className={styles.dashboardSection}>
              <p className={styles.dashboardSectionTitle}>Opening</p>
              <p className={styles.dashboardSectionBody}>{opening.name}</p>
            </div>
          )}

          <div className={styles.dashboardSection}>
            <p className={styles.dashboardSectionTitle}>Position</p>
            {facts.map((fact) => (
              <p key={fact} className={styles.dashboardSectionBody}>
                {fact}
              </p>
            ))}
          </div>
        </div>
      ) : (
        <div className={styles.dashboardBody}>
          <MovePairsTable movePairs={movePairs} selectedPly={selectedPly} onSelectMove={onSelectMove} />
        </div>
      )}
    </div>
  )
}
