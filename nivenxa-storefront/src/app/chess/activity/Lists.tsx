import Link from 'next/link'
import type { PlayedGameSummary, SavedAnalysisSummary, PuzzleAttemptSummary } from '@/lib/chess/activityActions'
import { GAME_STATUS_LABEL, OUTCOME_LABEL, assistanceText, attemptOutcome, shortDate, topicFor } from '@/lib/chess/activityFormat'
import { outcomeOfPlayedGame } from '@/lib/chess/gamePgn'
import GameActions from './games/GameActions'
import AnalysisActions from './analyses/AnalysisActions'
import styles from './Activity.module.scss'

// The three history lists as plain components over already-fetched summary rows (the pages fetch; these only render),
// so the same markup is used by the real pages and by the dev-only fixture preview.

const OUTCOME = {
  won: { label: 'Won', cls: styles.badgeGood },
  lost: { label: 'Lost', cls: styles.badgeBad },
  draw: { label: 'Draw', cls: styles.badgeNeutral },
  unfinished: { label: 'Unfinished', cls: styles.badgeWarn },
} as const

const SOURCE_LABEL: Record<string, string> = {
  paste: 'Imported game',
  'pgn-upload': 'Imported game',
  'image-ocr': 'Imported game',
  'pdf-ocr': 'Imported game',
  manual: 'Recreated game',
  'nivenxa-play': 'Game played on NIVENXA',
}

const BADGE = {
  solved: 'badgeGood',
  solved_with_hint: 'badgeNeutral',
  solution_viewed: 'badgeWarn',
  skipped: 'badgeWarn',
  attempted: 'badgeBad',
} as const

export function GameRows({ rows }: { rows: PlayedGameSummary[] }) {
  return (
    <ul className={styles.list}>
      {rows.map((g) => {
        const outcome = OUTCOME[outcomeOfPlayedGame(g.result, g.playerColor)]
        return (
          <li key={g.id} className={styles.row}>
            <div>
              <p className={styles.rowTitle}>
                <span className={`${styles.badge} ${outcome.cls}`}>{outcome.label}</span>
                vs {g.opponent}
              </p>
              <p className={styles.rowMeta}>
                {shortDate(g.startedAt)} · You played {g.playerColor === 'w' ? 'White' : 'Black'} · {g.timeControl ?? 'Untimed'} · {g.moveCount} moves
                {g.status !== 'completed' ? ` · ${GAME_STATUS_LABEL[g.status] ?? g.status}` : ''}
              </p>
              <p className={styles.rowMeta}>{g.analysisGameId ? 'Analysis saved' : 'Not analysed yet'}</p>
            </div>
            <GameActions id={g.id} analysisGameId={g.analysisGameId} />
          </li>
        )
      })}
    </ul>
  )
}

export function AnalysisRows({ rows }: { rows: SavedAnalysisSummary[] }) {
  return (
    <ul className={styles.list}>
      {rows.map((a) => {
        const title =
          a.event ||
          (a.white && a.black
            ? a.white === 'You'
              ? `You vs ${a.black}`
              : a.black === 'You'
                ? `You vs ${a.white}`
                : `${a.white} vs ${a.black}`
            : 'Untitled game')
        const accuracy =
          a.accuracyWhite !== null && a.accuracyBlack !== null
            ? a.white === 'You' || !a.black
              ? a.accuracyWhite
              : a.black === 'You'
                ? a.accuracyBlack
                : a.accuracyWhite
            : null
        return (
          <li key={a.id} className={styles.row}>
            <div>
              <p className={styles.rowTitle}>
                <span className={`${styles.badge} ${a.analysed ? styles.badgeGood : styles.badgeWarn}`}>
                  {a.analysed ? 'Analysis complete' : 'Saved, not analysed'}
                </span>
                {title}
              </p>
              <p className={styles.rowMeta}>
                {SOURCE_LABEL[a.source] ?? 'Game'} · saved {shortDate(a.createdAt)} · {a.moveCount} moves
                {accuracy !== null ? ` · Accuracy ${accuracy}%` : ''}
              </p>
            </div>
            <AnalysisActions id={a.id} analysed={a.analysed} />
          </li>
        )
      })}
    </ul>
  )
}

export function PuzzleRows({ rows }: { rows: PuzzleAttemptSummary[] }) {
  return (
    <ul className={styles.list}>
      {rows.map((r) => {
        const outcome = attemptOutcome({ outcome: r.outcome, solved: r.solved })
        const topic = topicFor(r.themes)
        const retry = topic ? `/chess/puzzles/${topic.slug}${r.lichessId ? `?puzzle=${encodeURIComponent(r.lichessId)}` : ''}` : '/chess/puzzles'
        return (
          <li key={r.id} className={styles.row}>
            <div>
              <p className={styles.rowTitle}>
                <span className={`${styles.badge} ${styles[BADGE[outcome]]}`}>{OUTCOME_LABEL[outcome]}</span>
                {topic?.label ?? 'Puzzle'}
                {r.rating ? ` · rated ${r.rating}` : ''}
              </p>
              <p className={styles.rowMeta}>
                {shortDate(r.attemptedAt)} · {assistanceText({ hints_used: r.hintsUsed, wrong_attempts: r.wrongAttempts }, outcome)}
              </p>
            </div>
            <div className={styles.actions}>
              <Link href={retry} className={styles.actionPrimary}>
                Retry
              </Link>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
