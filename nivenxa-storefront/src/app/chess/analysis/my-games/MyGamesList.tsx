'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getOrCreateAnalysisOwnerId } from '@/lib/chess/analysisOwner'
import { listMyGames, deleteAnalysisGame, type AnalysisGameSummary } from '@/lib/chess/analysisActions'
import { outcomeForAnalysisGame } from '@/lib/chess/analysisOutcome'
import styles from './MyGames.module.scss'

export type AnalysisGameFilter = 'all' | 'analyzed' | 'not-analyzed'

const FILTERS: { id: AnalysisGameFilter; label: string }[] = [
  { id: 'all', label: 'All Games' },
  { id: 'analyzed', label: 'Analyzed' },
  { id: 'not-analyzed', label: 'Not Analyzed' },
]

const SOURCE_LABEL: Record<AnalysisGameSummary['source'], string> = {
  paste: 'Imported',
  'pgn-upload': 'Imported',
  manual: 'Recreate a Game',
  'image-ocr': 'Imported',
  'pdf-ocr': 'Imported',
  'nivenxa-play': 'Nivenxa Game',
}

function titleFor(game: AnalysisGameSummary): string {
  if (game.white === 'You' && game.black) return `vs ${game.black}`
  if (game.black === 'You' && game.white) return `vs ${game.white}`
  if (game.white && game.black) return `${game.white} vs ${game.black}`
  return 'Analyzed Game'
}

export default function MyGamesList({ initialFilter = 'all' }: { initialFilter?: AnalysisGameFilter }) {
  const [games, setGames] = useState<AnalysisGameSummary[] | null>(null)
  const [filter, setFilter] = useState<AnalysisGameFilter>(initialFilter)
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null)

  useEffect(() => {
    const ownerId = getOrCreateAnalysisOwnerId()
    listMyGames(ownerId).then(setGames)
  }, [])

  async function handleDelete(id: string) {
    const ownerId = getOrCreateAnalysisOwnerId()
    await deleteAnalysisGame(ownerId, id)
    setGames((prev) => prev?.filter((g) => g.id !== id) ?? null)
    setConfirmingDelete(null)
  }

  if (games === null) return <p className={styles.loading}>Loading your games…</p>

  const filtered = games.filter((g) => {
    if (filter === 'analyzed') return g.analyzed
    if (filter === 'not-analyzed') return !g.analyzed
    return true
  })

  return (
    <div className={styles.wrap}>
      <div className={styles.filters}>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`${styles.filterBtn} ${filter === f.id ? styles.filterBtnActive : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && <p className={styles.empty}>No games here yet.</p>}

      <div className={styles.list}>
        {filtered.map((game) => {
          const outcome = outcomeForAnalysisGame(game)
          return (
            <div key={game.id} className={styles.card}>
              <div className={styles.cardMain}>
                <p className={styles.cardTitle}>{titleFor(game)}</p>
                <p className={styles.cardMeta}>
                  {outcome && <span className={styles.cardOutcome}>{outcome === 'won' ? 'Won' : outcome === 'lost' ? 'Lost' : 'Draw'} · </span>}
                  {game.moveCount} moves · {SOURCE_LABEL[game.source]}
                  {game.accuracyWhite !== null && game.accuracyBlack !== null && (
                    <> · Accuracy {game.white === 'You' ? game.accuracyWhite : game.accuracyBlack}%</>
                  )}
                </p>
                <p className={game.analyzed ? styles.cardStatusDone : styles.cardStatus}>
                  {game.analyzed ? 'Analysis completed' : 'Not analyzed'}
                </p>
              </div>
              <div className={styles.cardActions}>
                <Link href={`/chess/analysis/player?gameId=${game.id}`} className={styles.continueBtn}>
                  {game.analyzed ? 'View Analysis' : 'Analyze Game'}
                </Link>
                {confirmingDelete === game.id ? (
                  <button type="button" className={styles.deleteConfirmBtn} onClick={() => handleDelete(game.id)}>
                    Confirm delete?
                  </button>
                ) : (
                  <button type="button" className={styles.deleteBtn} onClick={() => setConfirmingDelete(game.id)}>
                    Delete
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
