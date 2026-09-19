'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Chess } from 'chess.js'
import type { Key } from 'chessground/types'
import Board from '@/components/chess/Board'
import { useGameAnalysis } from '@/lib/chess/useGameAnalysis'
import { useAnalysisPlayback } from '@/lib/chess/useAnalysisPlayback'
import { usePracticePosition } from '@/lib/chess/usePracticePosition'
import { getActiveGame } from '@/lib/chess/analysisSession'
import { getOrCreateAnalysisOwnerId } from '@/lib/chess/analysisOwner'
import { saveAnalysisGame, loadAnalysisGame } from '@/lib/chess/analysisActions'
import { accuracyFromEntries } from '@/lib/chess/moveClassification'
import { sanToUci } from '@/lib/chess/uci'
import { SKILL_TIER_LIST, SKILL_TIERS, depthFor } from '@/lib/chess/skillTiers'
import type { SkillTier } from '@/lib/chess/skillTiers'
import type { PlayerStartMode } from '@/lib/chess/analysisSession'
import type { NormalizedGame } from '@/lib/chess/analysisTypes'
import type { ExplainMoveRequestBody, ExplainMoveResponseBody, QualityMoveEntry } from '@/lib/chess/types'
import PlaybackControls from './PlaybackControls'
import MoveList from './MoveList'
import GameJourney from './GameJourney'
import ExplanationPanel from './ExplanationPanel'
import PracticePrompt from './PracticePrompt'
import GameSummary from './GameSummary'
import styles from './Player.module.scss'

const EMPTY_DESTS = new Map<Key, Key[]>()
const STANDARD_START_FEN = new Chess().fen()

interface LoadedGame {
  game: NormalizedGame
  mode: PlayerStartMode
  /** Set when reopened from My Games — lets "Save this game" upsert the same row instead of creating a duplicate. */
  savedId?: string
}

/** Merges freshly-graded entries from useGameAnalysis into local state without discarding explanation text already fetched for earlier plies — see the note in useGameAnalysis: entry objects are stable per-ply, but the array itself is a new reference on every progress tick. */
function mergeEntries(prev: QualityMoveEntry[], fresh: QualityMoveEntry[]): QualityMoveEntry[] {
  const prevByPly = new Map(prev.map((e) => [e.ply, e]))
  return fresh.map((entry) => {
    const existing = prevByPly.get(entry.ply)
    if (existing && existing.explanationStatus !== 'idle') {
      return { ...entry, ...existing, fenBefore: entry.fenBefore, fenAfter: entry.fenAfter, classification: entry.classification }
    }
    return entry
  })
}

export default function AnalysisPlayer() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const gameId = searchParams.get('gameId')

  const [loaded, setLoaded] = useState<LoadedGame | null | undefined>(undefined) // undefined = still resolving
  const [level, setLevel] = useState<SkillTier>('beginner')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const localIdRef = useRef<string>(typeof crypto !== 'undefined' ? crypto.randomUUID() : '')
  const startedRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    async function resolve() {
      if (gameId) {
        const ownerId = getOrCreateAnalysisOwnerId()
        const result = await loadAnalysisGame(ownerId, gameId)
        if (cancelled) return
        if (!result) {
          setLoaded(null)
          return
        }
        setLoaded({ game: result.game, mode: 'analyze', savedId: gameId })
        if (result.game.metadata.suggestedTier) setLevel(result.game.metadata.suggestedTier)
        return
      }
      const active = getActiveGame()
      if (cancelled) return
      setLoaded(active ? { game: active.game, mode: active.mode } : null)
      if (active?.game.metadata.suggestedTier) setLevel(active.game.metadata.suggestedTier)
    }
    resolve()
    return () => {
      cancelled = true
    }
  }, [gameId])

  const game = loaded?.game ?? null
  const { entries: gradedEntries, progress, ready: engineReady } = useGameAnalysis(game)
  const [entries, setEntries] = useState<QualityMoveEntry[]>([])
  useEffect(() => {
    setEntries((prev) => mergeEntries(prev, gradedEntries))
  }, [gradedEntries])

  const totalPlies = game?.moves.length ?? 0
  const playback = useAnalysisPlayback({ totalPlies, entries })

  const [boardMode, setBoardMode] = useState<'watch' | 'practice'>('watch')
  const [practiceFen, setPracticeFen] = useState<string | null>(null)
  const practice = usePracticePosition(boardMode === 'practice' ? practiceFen : null)

  const enterPractice = useCallback(
    (fen: string) => {
      playback.pause()
      setPracticeFen(fen)
      setBoardMode('practice')
    },
    [playback]
  )
  const exitPractice = useCallback(() => {
    setBoardMode('watch')
    setPracticeFen(null)
  }, [])

  // Start autoplay once the game is loaded, with pause-at-key-moments on for
  // Start Analysis and off for Watch Full Game — runs exactly once per game.
  useEffect(() => {
    if (startedRef.current || !loaded?.game || totalPlies === 0) return
    startedRef.current = true
    playback.setPauseAtKeyMoments(loaded.mode !== 'watch')
    playback.play()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, totalPlies])

  const ensureExplanation = useCallback(
    async (entry: QualityMoveEntry) => {
      if (entry.explanationStatus === 'loading' || entry.explanationStatus === 'loaded') return
      setEntries((prev) => prev.map((e) => (e.ply === entry.ply ? { ...e, explanationStatus: 'loading' } : e)))
      try {
        const body: ExplainMoveRequestBody = {
          fen: entry.fenBefore,
          move: entry.san,
          classification: entry.classification,
          evalBefore: entry.evalBeforeCp,
          evalAfter: entry.evalAfterCp,
          bestMove: entry.classification !== 'best' ? entry.bestMoveSan : undefined,
          tone: SKILL_TIERS[level].tone,
          depth: depthFor(level, true),
        }
        const res = await fetch('/api/chess/explain-move', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error('Request failed')
        const data: ExplainMoveResponseBody = await res.json()
        setEntries((prev) =>
          prev.map((e) => (e.ply === entry.ply ? { ...e, ...data, explanationStatus: 'loaded', explanationRevealed: true } : e))
        )
      } catch {
        setEntries((prev) => prev.map((e) => (e.ply === entry.ply ? { ...e, explanationStatus: 'error' } : e)))
      }
    },
    [level]
  )

  useEffect(() => {
    if (playback.currentEntry) ensureExplanation(playback.currentEntry)
  }, [playback.currentEntry, ensureExplanation])

  async function handleSave() {
    if (!game) return
    setSaveStatus('saving')
    const ownerId = getOrCreateAnalysisOwnerId()
    const result = await saveAnalysisGame({
      ownerId,
      localId: loaded?.savedId ?? localIdRef.current,
      game,
      analysis: entries,
      accuracyWhite: accuracyFromEntries(entries.filter((e) => e.color === 'w')),
      accuracyBlack: accuracyFromEntries(entries.filter((e) => e.color === 'b')),
    })
    setSaveStatus(result.error ? 'error' : 'saved')
  }

  if (loaded === undefined) return null
  if (!loaded || !game) {
    return (
      <div className={styles.empty}>
        <p>No game to analyze yet.</p>
        <button type="button" className={styles.transportBtnPrimary} onClick={() => router.push('/chess/analysis')}>
          Start an Analysis
        </button>
      </div>
    )
  }

  const positionFen =
    playback.currentPly === 0
      ? (game.moves[0]?.fenBefore ?? game.startingFen ?? STANDARD_START_FEN)
      : game.moves[playback.currentPly - 1].fenAfter
  const positionTurn: 'white' | 'black' = positionFen.split(' ')[1] === 'b' ? 'black' : 'white'

  const currentMove = playback.currentPly > 0 ? game.moves[playback.currentPly - 1] : undefined
  const lastMoveUci = currentMove ? sanToUci(currentMove.fenBefore, currentMove.san) : null
  const lastMove: Key[] | undefined = lastMoveUci ? [lastMoveUci.slice(0, 2) as Key, lastMoveUci.slice(2, 4) as Key] : undefined

  const currentEntry = playback.currentEntry
  const weakMove = currentEntry && currentEntry.classification !== 'best' && currentEntry.bestMoveUci
  const hintArrow: Key[] | undefined = weakMove
    ? [currentEntry!.bestMoveUci.slice(0, 2) as Key, currentEntry!.bestMoveUci.slice(2, 4) as Key]
    : undefined

  const opponentLabel = game.metadata.white && game.metadata.black ? `${game.metadata.white} vs ${game.metadata.black}` : 'Game Analysis'
  const perspectiveColor: 'w' | 'b' = game.metadata.black === 'You' ? 'b' : 'w'

  function handlePracticeFromLesson(ply: number) {
    if (!game) return
    playback.jumpTo(ply)
    const move = game.moves[ply - 1]
    if (move) enterPractice(move.fenBefore)
  }

  return (
    <>
      <header className={styles.header}>
        <div>
          <Link href="/chess/analysis" className={styles.breadcrumb}>
            ← Analysis
          </Link>
          <h1 className={styles.matchup}>{opponentLabel}</h1>
          <p className={styles.matchMeta}>
            {game.metadata.result ? `${game.metadata.result} · ` : ''}
            {game.moves.length} moves
            {game.metadata.event ? ` · ${game.metadata.event}` : ''}
          </p>
        </div>
        <div className={styles.levelGroup}>
          <span className={styles.optionsLabel}>Level:</span>
          {SKILL_TIER_LIST.map((tier) => (
            <button
              key={tier.id}
              type="button"
              className={`${styles.levelBtn} ${level === tier.id ? styles.levelBtnActive : ''}`}
              onClick={() => setLevel(tier.id)}
            >
              {tier.label}
            </button>
          ))}
        </div>
      </header>

      {!engineReady && <p className={styles.progressNote}>Loading the analysis engine…</p>}
      {engineReady && progress < 1 && <p className={styles.progressNote}>Analyzing the game — {Math.round(progress * 100)}%</p>}

      <div className={styles.modeSwitch}>
        <button
          type="button"
          className={`${styles.modeBtn} ${boardMode === 'watch' ? styles.modeBtnActive : ''}`}
          onClick={exitPractice}
        >
          Watch Analysis
        </button>
        <button
          type="button"
          className={`${styles.modeBtn} ${boardMode === 'practice' ? styles.modeBtnActive : ''}`}
          onClick={() => currentMove && enterPractice(currentMove.fenBefore)}
          disabled={!currentMove}
        >
          Practice Position
        </button>
      </div>

      <div className={styles.workspace}>
        <div className={styles.boardCol}>
          {boardMode === 'practice' ? (
            <Board
              fen={practice.fen}
              turnColor={practice.turnColor}
              dests={practice.dests}
              highlightSquares={practice.hintSquares}
              hintArrow={practice.solutionArrow}
              onMove={(from, to) => practice.attemptMove(from, to)}
            />
          ) : (
            <Board
              fen={positionFen}
              turnColor={positionTurn}
              dests={EMPTY_DESTS}
              viewOnly
              lastMove={lastMove}
              hintArrow={currentEntry?.explanationStatus === 'loaded' ? hintArrow : undefined}
              onMove={() => {}}
            />
          )}
          {boardMode === 'watch' && <PlaybackControls playback={playback} totalPlies={totalPlies} />}
        </div>

        <div className={styles.panelCol}>
          {boardMode === 'practice' ? (
            <PracticePrompt practice={practice} startFen={practiceFen} sourceGameId={loaded.savedId} onContinue={exitPractice} />
          ) : (
            <ExplanationPanel entry={currentEntry} atStart={playback.atStart} onTryYourself={currentMove ? () => enterPractice(currentMove.fenBefore) : undefined} />
          )}
          <MoveList moves={game.moves} entries={entries} currentPly={playback.currentPly} onJump={playback.jumpTo} />
        </div>
      </div>

      <GameJourney entries={entries} currentPly={playback.currentPly} onJump={playback.jumpTo} />

      {playback.atEnd && boardMode === 'watch' && (
        <GameSummary
          entries={entries}
          perspectiveColor={perspectiveColor}
          tone={SKILL_TIERS[level].tone}
          onSave={handleSave}
          saveStatus={saveStatus}
          onJumpToPly={handlePracticeFromLesson}
        />
      )}
    </>
  )
}
