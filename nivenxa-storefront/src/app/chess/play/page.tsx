'use client'
import { useEffect, useState } from 'react'
import Board from '@/components/chess/Board'
import { useChessGame } from '@/lib/chess/useChessGame'
import { useStockfish } from '@/lib/chess/useStockfish'
import { useMoveAnalysis } from '@/lib/chess/useMoveAnalysis'
import { useChessClock, type LowTimeState } from '@/lib/chess/useChessClock'
import { SKILL_TIERS, SKILL_TIER_LIST, resolveExplanationMode, type SkillTier } from '@/lib/chess/skillTiers'
import { TIME_CONTROLS, TIME_CONTROL_MODE_LIST, type TimeControlMode, type TimeControlPreset } from '@/lib/chess/timeControls'
import { accuracyFromEntries } from '@/lib/chess/moveClassification'
import type { ColorChoice, MoveAnalysisEntry, MoveClassification, QualityMoveEntry } from '@/lib/chess/types'
import styles from './Play.module.scss'

const SETUP_STORAGE_KEY = 'nivenxa-chess-setup'
// The live feed shows just the latest exchange — your move, then Nivenxa's
// reply — not a scrollback history. Each move still has its own slot in
// analysisEntries; this is purely a display cap, not a data-loss boundary.
const LIVE_FEED_SIZE = 2
// After Nivenxa declines a draw offer, Offer Draw is disabled for this many
// plies (3 of the player's own moves) so it can't be spammed every turn.
const DRAW_OFFER_COOLDOWN_PLIES = 6
// Nivenxa declines a draw offer once its own position evaluation (from its
// perspective) clears this many centipawns — i.e. it thinks it's clearly winning.
const DRAW_DECLINE_THRESHOLD_CP = 150
// Historical dests never correspond to the live position, so reviewing a
// past move always shows an empty (non-interactive) set of legal moves.
const EMPTY_DESTS = new Map()
// Safety net for the "wait for the player's explanation" gate below — the
// engine responds anyway if the explanation hasn't resolved by then, rather
// than blocking the game indefinitely on a slow API call.
const EXPLANATION_WAIT_TIMEOUT_MS = 4500

interface StoredSetup {
  tier: SkillTier
  color: ColorChoice
  mode: TimeControlMode | null
  presetIndex: number
}

function loadStoredSetup(): StoredSetup | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(SETUP_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const tierValid = parsed && typeof parsed.tier === 'string' && parsed.tier in SKILL_TIERS
    const colorValid = parsed?.color === 'w' || parsed?.color === 'b' || parsed?.color === 'random'
    const modeValid = parsed?.mode === null || parsed?.mode === 'rapid' || parsed?.mode === 'classical'
    const presetIndexValid = typeof parsed?.presetIndex === 'number'
    if (tierValid && colorValid && modeValid && presetIndexValid) return parsed as StoredSetup
  } catch {
    // stale/malformed value — ignore, fall back to defaults
  }
  return null
}

function saveSetup(setup: StoredSetup) {
  if (typeof window === 'undefined') return
  localStorage.setItem(SETUP_STORAGE_KEY, JSON.stringify(setup))
}

function resolveColor(choice: ColorChoice): 'w' | 'b' {
  if (choice === 'random') return Math.random() < 0.5 ? 'w' : 'b'
  return choice
}

function clampPresetIndex(mode: TimeControlMode, index: number): number {
  const max = TIME_CONTROLS[mode].presets.length - 1
  return Math.min(Math.max(0, index), max)
}

function parseUciMove(uci: string) {
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length > 4 ? uci.slice(4, 5) : undefined,
  }
}

function classificationTone(c: MoveClassification): 'success' | 'warning' | 'danger' {
  if (c === 'inaccuracy') return 'warning'
  if (c === 'mistake' || c === 'blunder') return 'danger'
  return 'success'
}

function formatClassification(c: MoveClassification): string {
  return c.charAt(0).toUpperCase() + c.slice(1)
}

function colorLabel(color: 'w' | 'b'): string {
  return color === 'w' ? 'White' : 'Black'
}

function moveNumberLabel(ply: number, color: 'w' | 'b'): string {
  return `${Math.floor(ply / 2) + 1}${color === 'w' ? '.' : '...'}`
}

function panelTitleFor(tier: SkillTier): string {
  if (tier === 'beginner') return 'Move Explanation'
  if (tier === 'intermediate') return 'Game Insight'
  if (tier === 'expert') return 'Position Note'
  return 'Game'
}

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * Renders the loaded content of one move's explanation — headline, body,
 * and whichever of bullets/suggestion/notice/remember the API filled in.
 * Callers own the row's own header (san, mover, classification pill) since
 * that differs between the live feed and the post-game review list; this
 * only renders what came back from Claude. At 'plain' depth (Expert/Master,
 * review-only) there's no headline — just the original single paragraph.
 */
function ExplanationBody({ entry }: { entry: MoveAnalysisEntry }) {
  if (!entry.headline) {
    return entry.explanation ? <p className={styles.calloutText}>{entry.explanation}</p> : null
  }

  return (
    <>
      <p className={styles.calloutHeadline}>{entry.headline}</p>
      {entry.explanation && <p className={styles.calloutText}>{entry.explanation}</p>}
      {entry.bullets && entry.bullets.length > 0 && (
        <div className={styles.calloutSection}>
          <span className={styles.calloutSectionLabel}>{entry.kind === 'quality' ? 'Why it works' : 'Why it helps'}</span>
          <ul className={styles.calloutBullets}>
            {entry.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
      )}
      {entry.suggestion && (
        <div className={styles.calloutSection}>
          <span className={styles.calloutSectionLabel}>Better idea</span>
          <p className={styles.calloutText}>{entry.suggestion}</p>
        </div>
      )}
      {entry.notice && (
        <p className={styles.calloutWatch}>
          <strong>Watch:</strong> {entry.notice}
        </p>
      )}
      {entry.remember && (
        <div className={styles.calloutSection}>
          <span className={styles.calloutSectionLabel}>Remember</span>
          <p className={styles.calloutText}>{entry.remember}</p>
        </div>
      )}
    </>
  )
}

export default function ChessPlayPage() {
  const {
    fen,
    turn,
    dests,
    isCheck,
    isCheckmate,
    isDraw,
    isStalemate,
    isThreefoldRepetition,
    isInsufficientMaterial,
    isDrawByFiftyMoves,
    isGameOver,
    history,
    makeMove,
    reset,
    undo,
  } = useChessGame()
  const { ready, error, setSkillLevel, getBestMove } = useStockfish()
  // Dedicated instance for draw-offer evaluation — kept separate from the
  // gameplay engine and the analysis engine in useMoveAnalysis so it never
  // overlaps an in-flight `go` command on a shared Worker (same reasoning
  // documented in useMoveAnalysis.ts).
  const { evaluatePosition: evaluateDrawPosition } = useStockfish()

  const [screen, setScreen] = useState<'setup' | 'playing'>('setup')

  // Draft selections shown on the setup screen (prefilled from storage / the
  // currently active game when reopened via "New Game").
  const [draftTier, setDraftTier] = useState<SkillTier>('beginner')
  const [draftColor, setDraftColor] = useState<ColorChoice>('random')
  const [draftMode, setDraftMode] = useState<TimeControlMode>('classical')
  const [draftPresetIndex, setDraftPresetIndex] = useState(0)

  // The config actually driving the game in progress.
  const [activeTierId, setActiveTierId] = useState<SkillTier>('beginner')
  const [activeColorChoice, setActiveColorChoice] = useState<ColorChoice>('random')
  const [activeMode, setActiveMode] = useState<TimeControlMode | null>(null)
  const [activePreset, setActivePreset] = useState<TimeControlPreset | null>(null)
  const [humanColor, setHumanColor] = useState<'w' | 'b'>('w')

  const [skillSet, setSkillSet] = useState(false)
  const [engineThinking, setEngineThinking] = useState(false)
  const [orientation, setOrientation] = useState<'white' | 'black'>('white')
  const [reviewOpen, setReviewOpen] = useState(false)

  // Terminal states beyond what chess.js itself can reach (checkmate/
  // stalemate/draw-by-rule) — resignation and an agreed draw.
  const [endReason, setEndReason] = useState<'resigned' | 'draw-agreed' | null>(null)
  // Drives an inline "are you sure" swap in place of the button that
  // triggered it, for the two actions that abandon/end a game in progress.
  const [pendingConfirm, setPendingConfirm] = useState<'resign' | 'new-game' | null>(null)
  // 'pending'/'declined' also drive a transient banner near the board;
  // 'declined' clears itself after a few seconds but declinedUntilPly keeps
  // gating the button so the offer can't just be spammed again immediately.
  const [drawOfferState, setDrawOfferState] = useState<'idle' | 'pending' | 'accepted' | 'declined'>('idle')
  const [declinedUntilPly, setDeclinedUntilPly] = useState<number | null>(null)

  // Move history: `null` selectedPly means "show the latest exchange" (the
  // long-standing default). Selecting a move in the MOVES tab both sets this
  // and temporarily shows that move's resulting position on the board —
  // entirely a display overlay, see `reviewing` below; the live game, clock,
  // and engine keep running underneath regardless.
  const [selectedPly, setSelectedPly] = useState<number | null>(null)
  const [panelTab, setPanelTab] = useState<'insight' | 'moves'>('insight')

  // The ply of the player's own move we're holding the engine's reply for,
  // until its explanation resolves (loaded or errored) — see the effects
  // below. Only ever set in live-explanation contexts; `null` means the
  // engine is free to respond as soon as it's its turn, same as before.
  const [awaitingExplanationForPly, setAwaitingExplanationForPly] = useState<number | null>(null)

  // The celebratory/announcement overlay shown once when a game ends —
  // dismissible, separate from the persistent result summary in the panel.
  const [showResultOverlay, setShowResultOverlay] = useState(false)

  const tierConfig = SKILL_TIERS[activeTierId]
  const explanationMode = resolveExplanationMode(activeTierId, activeMode)

  const {
    entries: analysisEntries,
    analyzeMove,
    requestExplanation,
    reset: resetAnalysis,
    popEntries,
  } = useMoveAnalysis(tierConfig, explanationMode)

  // Resignation/draw-agreement end the game before chess.js's own isGameOver
  // would ever be true, so the clock needs both signals to actually freeze —
  // isGameOver alone left it ticking after a resign or an agreed draw.
  const { times: clockTimes, enabled: clockEnabled, lowTimeState, reset: resetClock } = useChessClock(
    activePreset,
    turn,
    isGameOver || endReason !== null
  )

  // Prefill the setup screen from a previous visit — doesn't skip the screen,
  // just saves a returning player from re-picking the same config.
  useEffect(() => {
    const stored = loadStoredSetup()
    if (stored) {
      setDraftTier(stored.tier)
      setDraftColor(stored.color)
      if (stored.mode) {
        setDraftMode(stored.mode)
        setDraftPresetIndex(clampPresetIndex(stored.mode, stored.presetIndex))
      }
    }
  }, [])

  const beginGame = (tier: SkillTier, color: ColorChoice, mode: TimeControlMode, presetIndex: number) => {
    const resolved = resolveColor(color)
    const resolvedMode = tier === 'beginner' ? null : mode
    const resolvedPreset = resolvedMode ? TIME_CONTROLS[resolvedMode].presets[presetIndex] ?? TIME_CONTROLS[resolvedMode].presets[0] : null

    setActiveTierId(tier)
    setActiveColorChoice(color)
    setActiveMode(resolvedMode)
    setActivePreset(resolvedPreset)
    setHumanColor(resolved)
    setOrientation(resolved === 'w' ? 'white' : 'black')
    setSkillSet(false)
    setScreen('playing')
    setReviewOpen(false)
    setEndReason(null)
    setPendingConfirm(null)
    setDrawOfferState('idle')
    setDeclinedUntilPly(null)
    setSelectedPly(null)
    setPanelTab('insight')
    setAwaitingExplanationForPly(null)
    setShowResultOverlay(false)
    reset()
    resetAnalysis()
    resetClock(resolvedPreset)
  }

  const handleStartGame = () => {
    saveSetup({ tier: draftTier, color: draftColor, mode: draftTier === 'beginner' ? null : draftMode, presetIndex: draftPresetIndex })
    beginGame(draftTier, draftColor, draftMode, draftPresetIndex)
  }

  const handleNewGame = () => {
    // Reopen full setup, prefilled with the game's current config.
    setDraftTier(activeTierId)
    setDraftColor(activeColorChoice)
    if (activeMode && activePreset) {
      setDraftMode(activeMode)
      setDraftPresetIndex(TIME_CONTROLS[activeMode].presets.indexOf(activePreset))
    }
    setScreen('setup')
  }

  // The mid-game "New Game" button goes through this — abandoning an active
  // game needs a confirm first; the post-game "Change Opponent" button
  // (there's no active game left to lose) calls handleNewGame directly.
  const handleNewGameClick = () => {
    setPendingConfirm('new-game')
  }

  const handlePlayAgain = () => {
    const mode = activeMode ?? 'classical'
    const presetIndex = activeMode && activePreset ? TIME_CONTROLS[activeMode].presets.indexOf(activePreset) : 0
    beginGame(activeTierId, activeColorChoice, mode, presetIndex)
  }

  const handleUndo = () => {
    undo(2) // undoes the player's move and the engine's reply
    popEntries(2) // ...and both of those moves were analyzed now
    setSelectedPly(null) // the selected ply, if any, may no longer exist
    setAwaitingExplanationForPly(null) // ditto for a pending explanation wait
  }

  const handleResignClick = () => {
    setPendingConfirm('resign')
  }

  const handleResignConfirm = () => {
    setPendingConfirm(null)
    setEndReason('resigned')
  }

  // Nivenxa's accept/decline is driven by its own position evaluation, not
  // chance — it declines only when it judges itself clearly better. `offeredFen`/
  // `offeredTurn` are captured from this render's closure so the decision is
  // evaluated against the position as it stood the moment the offer was made,
  // even though resolving it takes a beat.
  const handleOfferDraw = () => {
    setPendingConfirm(null)
    setDrawOfferState('pending')
    const offeredFen = fen
    const offeredTurn = turn

    void (async () => {
      await new Promise((resolve) => setTimeout(resolve, 700))
      let engineEvalCp = 0
      try {
        const raw = await evaluateDrawPosition(offeredFen, 12)
        engineEvalCp = offeredTurn === engineColor ? raw : -raw
      } catch {
        // Evaluation failed — fail toward accepting rather than leaving the offer stuck.
        engineEvalCp = 0
      }

      if (engineEvalCp > DRAW_DECLINE_THRESHOLD_CP) {
        setDrawOfferState('declined')
        setDeclinedUntilPly(history.length + DRAW_OFFER_COOLDOWN_PLIES)
        setTimeout(() => setDrawOfferState('idle'), 4000)
      } else {
        setDrawOfferState('accepted')
        setTimeout(() => setEndReason('draw-agreed'), 1200)
      }
    })()
  }

  const handleSelectMove = (entry: MoveAnalysisEntry) => {
    setSelectedPly(entry.ply)
    setPanelTab('insight')
    if (entry.explanationStatus === 'idle') {
      requestExplanation(entry.ply, { tone: tierConfig.tone, revealBestMove: false })
    }
  }

  // The only way to reach a reviewing state is via handleSelectMove above, so
  // "leaving" it always means both: drop back to the live position and land
  // back on the list the move was picked from.
  const handleBackToMoves = () => {
    setSelectedPly(null)
    setPanelTab('moves')
  }

  const handleReviewGameToggle = () => {
    setReviewOpen((open) => {
      const opening = !open
      if (opening) {
        for (const entry of analysisEntries) {
          if (entry.kind === 'quality' && entry.classification === 'best') continue
          requestExplanation(entry.ply, { tone: tierConfig.tone, revealBestMove: true })
        }
      }
      return opening
    })
  }

  // Apply the chosen tier's engine strength once the engine is ready.
  useEffect(() => {
    if (ready && screen === 'playing' && !skillSet) {
      setSkillLevel(tierConfig.skillLevel)
      setSkillSet(true)
    }
  }, [ready, screen, skillSet, tierConfig, setSkillLevel])

  // Whenever it becomes the engine's turn, let it respond — except in live
  // explanation contexts, where awaitingExplanationForPly (set below) holds
  // it back until the player's own move has been explained, so the engine's
  // move/explanation doesn't appear before they've read their own feedback.
  useEffect(() => {
    if (screen !== 'playing' || !ready || !skillSet || turn === humanColor || isGameOver || endReason !== null) return
    if (awaitingExplanationForPly !== null) return

    let cancelled = false
    setEngineThinking(true)

    getBestMove(fen, { movetime: tierConfig.movetime })
      .then((uci) => {
        if (cancelled) return
        const { from, to, promotion } = parseUciMove(uci)
        const result = makeMove(from, to, promotion)
        if (result) analyzeMove(result, 'engine')
      })
      .catch(() => {
        // Engine failed to produce a move — leave the position as-is.
      })
      .finally(() => {
        if (!cancelled) setEngineThinking(false)
      })

    return () => {
      cancelled = true
    }
  }, [
    screen,
    ready,
    skillSet,
    fen,
    turn,
    humanColor,
    isGameOver,
    endReason,
    awaitingExplanationForPly,
    getBestMove,
    makeMove,
    analyzeMove,
    tierConfig.movetime,
  ])

  // Clears awaitingExplanationForPly once the entry it's watching resolves
  // (loaded or errored) — the effect above then lets the engine respond.
  useEffect(() => {
    if (awaitingExplanationForPly === null) return
    const entry = analysisEntries.find((e) => e.ply === awaitingExplanationForPly)
    if (entry && (entry.explanationStatus === 'loaded' || entry.explanationStatus === 'error')) {
      setAwaitingExplanationForPly(null)
    }
  }, [awaitingExplanationForPly, analysisEntries])

  // Safety net — don't hold up the game indefinitely on a slow explanation.
  // The explanation itself isn't discarded; it'll still render once it
  // arrives, this just stops blocking the engine's move on it.
  useEffect(() => {
    if (awaitingExplanationForPly === null) return
    const timer = setTimeout(() => setAwaitingExplanationForPly(null), EXPLANATION_WAIT_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [awaitingExplanationForPly])

  const handlePlayerMove = (from: string, to: string) => {
    const plyAboutToBePlayed = history.length
    const result = makeMove(from, to, 'q')
    if (result) {
      analyzeMove(result, 'player')
      if (explanationMode === 'live') setAwaitingExplanationForPly(plyAboutToBePlayed)
    }
  }

  // Reviewing a past move overlays the board display only — see the state
  // comment above. `reviewEntry` is only ever undefined mid-transition
  // (e.g. right after handleUndo clears a now-stale selectedPly).
  const reviewing = selectedPly !== null
  const reviewEntry = reviewing ? analysisEntries.find((e) => e.ply === selectedPly) : undefined

  const boardLocked = !ready || turn !== humanColor || isGameOver || endReason !== null || reviewing
  const showGameComplete = screen === 'playing' && (isGameOver || endReason !== null)

  let statusText: string
  if (error) statusText = `Engine error: ${error}`
  else if (!ready) statusText = 'Loading engine…'
  else if (isCheckmate) statusText = turn === humanColor ? 'Checkmate — the engine wins' : 'Checkmate — you win'
  else if (isStalemate) statusText = 'Stalemate — draw'
  else if (isDraw) statusText = 'Draw'
  else if (engineThinking) statusText = 'Engine thinking…'
  else if (isCheck) statusText = turn === humanColor ? 'Check — your move' : 'Check'
  else statusText = turn === humanColor ? 'Your move' : "Engine's move"

  const engineColor: 'w' | 'b' = humanColor === 'w' ? 'b' : 'w'
  const orientationColor: 'w' | 'b' = orientation === 'white' ? 'w' : 'b'

  const renderClock = (color: 'w' | 'b') => {
    if (!clockEnabled) return null
    const state: LowTimeState = lowTimeState(color)
    const isActive = turn === color && !showGameComplete
    return (
      <span className={styles.clockWrap}>
        {isActive && <span className={styles.activeDot} aria-hidden="true" />}
        <span
          className={`${styles.clock} ${isActive ? styles.clock_active : ''} ${state !== 'normal' ? styles[`clock_${state}`] : ''}`}
        >
          {formatClock(clockTimes[color])}
        </span>
      </span>
    )
  }

  const engineRow = (
    <div className={styles.playerRow}>
      <div className={styles.playerIdentity}>
        <span className={styles.playerName}>{colorLabel(engineColor)} · Nivenxa</span>
      </div>
      {renderClock(engineColor)}
    </div>
  )

  const humanRow = (
    <div className={styles.playerRow}>
      <div className={styles.playerIdentity}>
        <span className={styles.playerName}>You · {colorLabel(humanColor)}</span>
      </div>
      {renderClock(humanColor)}
    </div>
  )

  // If the game ends while a past move is selected, snap back to the live
  // position — otherwise the board would stay frozen on that old position
  // with no way back, since the "Return to current position" control lives
  // in the live panel, which the result panel replaces entirely.
  useEffect(() => {
    if (showGameComplete) setSelectedPly(null)
  }, [showGameComplete])

  // Bring up the announcement overlay exactly once, the moment the game ends.
  useEffect(() => {
    if (showGameComplete) setShowResultOverlay(true)
  }, [showGameComplete])

  const playerQualityEntries = analysisEntries.filter(
    (e): e is QualityMoveEntry => e.kind === 'quality' && e.color === humanColor
  )
  const accuracy = accuracyFromEntries(playerQualityEntries)
  const bestCount = playerQualityEntries.filter((e) => e.classification === 'best').length
  const mistakeCount = playerQualityEntries.filter((e) => e.classification === 'mistake').length
  const blunderCount = playerQualityEntries.filter((e) => e.classification === 'blunder').length

  // Outcome + copy for the result overlay/panel. `celebrate` gates the gold
  // win treatment — reserved for the player actually winning, at any tier
  // (a Beginner win is a real win; the tier is shown, never used to soften
  // the language). Every other ending gets plain, calm language instead.
  let outcome: 'player-win' | 'engine-win' | 'draw' | 'player-resigned' = 'draw'
  if (endReason === 'resigned') outcome = 'player-resigned'
  else if (endReason === 'draw-agreed') outcome = 'draw'
  else if (isCheckmate) outcome = turn === humanColor ? 'engine-win' : 'player-win'
  else outcome = 'draw' // stalemate / repetition / insufficient material / fifty-move

  let drawReasonText = 'Draw'
  if (endReason === 'draw-agreed') drawReasonText = 'Draw by agreement'
  else if (isStalemate) drawReasonText = 'Draw — stalemate'
  else if (isThreefoldRepetition) drawReasonText = 'Draw — threefold repetition'
  else if (isInsufficientMaterial) drawReasonText = 'Draw — insufficient material'
  else if (isDrawByFiftyMoves) drawReasonText = 'Draw — fifty-move rule'

  const terminationText = endReason === 'resigned' ? 'Resignation' : endReason === 'draw-agreed' ? 'Agreement' : isCheckmate ? 'Checkmate' : 'Draw'

  const resultCopy = (() => {
    switch (outcome) {
      case 'player-win':
        return {
          headline: 'You won.',
          sub: activeTierId === 'master' ? 'A difficult game, well played.' : 'Well played.',
          detail: `You defeated Nivenxa on ${tierConfig.label}`,
          celebrate: true,
        }
      case 'engine-win':
        return { headline: 'Game over.', sub: 'Nivenxa wins.', detail: '', celebrate: false }
      case 'player-resigned':
        return { headline: 'You resigned.', sub: 'Nivenxa wins.', detail: '', celebrate: false }
      case 'draw':
        return { headline: 'Draw.', sub: drawReasonText.replace(/^Draw( —)?\s*/, '') || 'Draw', detail: '', celebrate: false }
    }
  })()

  const fullMoveCount = Math.ceil(history.length / 2)
  const timeRemainingText = clockEnabled ? `${formatClock(clockTimes[humanColor])} remaining` : null

  // Shared between the persistent inline summary (.resultPanel) and the
  // transient announcement overlay — same information, same actions, just a
  // different frame around it.
  const resultBody = (
    <>
      <p className={styles.resultHeadline}>{resultCopy.headline}</p>
      <p className={styles.resultSub}>{resultCopy.sub}</p>
      {resultCopy.detail && <p className={styles.resultDetail}>{resultCopy.detail}</p>}
      <p className={styles.resultMeta}>
        {tierConfig.label}
        {activePreset ? ` · ${activePreset.label}` : ''} · {terminationText}
      </p>
      <p className={styles.resultMoves}>
        {fullMoveCount} move{fullMoveCount === 1 ? '' : 's'}
        {timeRemainingText ? ` · ${timeRemainingText}` : ''}
      </p>
      <div className={styles.statGrid}>
        <div className={styles.statCell}>
          <span className={styles.statValue}>{accuracy}%</span>
          <span className={styles.statLabel}>Accuracy</span>
        </div>
        <div className={styles.statCell}>
          <span className={styles.statValue}>{bestCount}</span>
          <span className={styles.statLabel}>Best moves</span>
        </div>
        <div className={styles.statCell}>
          <span className={styles.statValue}>{mistakeCount}</span>
          <span className={styles.statLabel}>Mistakes</span>
        </div>
        <div className={styles.statCell}>
          <span className={styles.statValue}>{blunderCount}</span>
          <span className={styles.statLabel}>Blunders</span>
        </div>
      </div>
      <div className={styles.resultActions}>
        <button type="button" className={styles.controlBtnPrimary} onClick={handleReviewGameToggle}>
          {reviewOpen ? 'Hide Review' : 'Review Game'}
        </button>
        <button type="button" className={styles.controlBtn} onClick={handlePlayAgain}>
          Play Again
        </button>
      </div>
    </>
  )

  // MOVES tab data — grouped by each entry's own `ply` (not its array
  // index): a move can rarely be missing from analysisEntries (e.g. it was
  // played before the analysis engine finished loading), and pairing by
  // index alone would then silently shift every later move into the wrong
  // White/Black column and misidentify which position a click reviews.
  const movePairs: [MoveAnalysisEntry | undefined, MoveAnalysisEntry | undefined][] = []
  for (const entry of analysisEntries) {
    const row = Math.floor(entry.ply / 2)
    if (!movePairs[row]) movePairs[row] = [undefined, undefined]
    movePairs[row][entry.ply % 2] = entry
  }
  for (let i = 0; i < movePairs.length; i++) {
    if (!movePairs[i]) movePairs[i] = [undefined, undefined]
  }

  const insightEntries = reviewing ? (reviewEntry ? [reviewEntry] : []) : analysisEntries.slice(-LIVE_FEED_SIZE)

  // Shown in the Insight tab before any move has been analyzed yet — Beginner
  // gets a concrete starting suggestion, everyone else (who reaches the live
  // tab at all) gets a short standing objective instead of a lesson.
  const firstMoveGuidance =
    activeTierId === 'beginner'
      ? {
          headline: 'Your first move',
          body: 'Start by moving a centre pawn or developing a knight. Controlling the centre gives your pieces more space.',
        }
      : {
          headline: 'Your move',
          body: 'Control the centre, develop your pieces, and prepare your king for safety.',
        }

  const showUndo = activeTierId === 'beginner' || activeTierId === 'intermediate'
  const showOfferDraw = activeTierId !== 'beginner'
  const drawOfferDisabled =
    drawOfferState === 'pending' || drawOfferState === 'accepted' || (declinedUntilPly !== null && history.length < declinedUntilPly)

  return (
    <main className={styles.page}>
      <section className={styles.layout}>
        {screen === 'setup' ? (
          <div className={styles.setupColumn}>
            <h1 className={styles.heading}>Play</h1>
            <div className={styles.setupDivider} />

            <div className={styles.setupArea}>
              <p className={styles.tierPickerTitle}>Choose your opponent</p>
              <div className={styles.tierGrid}>
                {SKILL_TIER_LIST.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`${styles.tierOption} ${draftTier === t.id ? styles.tierOptionSelected : ''}`}
                    onClick={() => setDraftTier(t.id)}
                  >
                    <span className={styles.tierOptionLabel}>{t.label}</span>
                    <span className={styles.tierOptionDesc}>{t.description}</span>
                  </button>
                ))}
              </div>

              <p className={styles.setupSectionTitle}>Play as</p>
              <div className={styles.segmentedRow}>
                {(['w', 'b', 'random'] as ColorChoice[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`${styles.segmentedOption} ${draftColor === c ? styles.segmentedOptionSelected : ''}`}
                    onClick={() => setDraftColor(c)}
                  >
                    {c === 'random' ? 'Random' : colorLabel(c)}
                  </button>
                ))}
              </div>

              {draftTier !== 'beginner' && (
                <>
                  <p className={styles.setupSectionTitle}>Time control</p>
                  <div className={styles.segmentedRow}>
                    {TIME_CONTROL_MODE_LIST.map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={`${styles.segmentedOption} ${draftMode === m ? styles.segmentedOptionSelected : ''}`}
                        onClick={() => {
                          setDraftMode(m)
                          setDraftPresetIndex(0)
                        }}
                      >
                        {TIME_CONTROLS[m].label}
                      </button>
                    ))}
                  </div>

                  <div
                    className={styles.timeControlGrid}
                    style={{ gridTemplateColumns: `repeat(${TIME_CONTROLS[draftMode].presets.length}, 1fr)` }}
                  >
                    {TIME_CONTROLS[draftMode].presets.map((p, i) => (
                      <button
                        key={p.label}
                        type="button"
                        className={`${styles.timeControlTile} ${draftPresetIndex === i ? styles.timeControlTileSelected : ''}`}
                        onClick={() => setDraftPresetIndex(i)}
                      >
                        <span className={styles.timeControlLabel}>{p.label}</span>
                        <span className={styles.timeControlCategory}>{p.category}</span>
                      </button>
                    ))}
                  </div>
                  <p className={styles.setupHint}>Minutes + increment per move</p>
                </>
              )}

              <button type="button" className={styles.startGameBtn} onClick={handleStartGame}>
                Start Game
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.playColumn}>
            <h1 className={styles.heading}>Play</h1>
            <div className={styles.setupDivider} />
            <div className={styles.metaRow}>
              <span className={styles.metaText}>
                {tierConfig.label}
                {activePreset ? ` · ${activePreset.label}` : ''}
              </span>
            </div>

            <div className={styles.playRow}>
              <div className={styles.boardCol}>
                <div className={styles.boardStack}>
                  {orientationColor === humanColor ? engineRow : humanRow}

                  <div className={styles.boardOverlayWrap}>
                    <Board
                      fen={reviewEntry ? reviewEntry.fenAfter : fen}
                      turnColor={
                        reviewEntry
                          ? reviewEntry.color === 'w'
                            ? 'black'
                            : 'white'
                          : turn === 'w'
                            ? 'white'
                            : 'black'
                      }
                      dests={reviewing ? EMPTY_DESTS : dests}
                      orientation={orientation}
                      viewOnly={boardLocked}
                      check={!reviewing && isCheckmate ? (turn === 'w' ? 'white' : 'black') : false}
                      onMove={handlePlayerMove}
                    />
                    {showGameComplete && resultCopy.celebrate && (
                      <span className={styles.mateSweep} aria-hidden="true" />
                    )}
                  </div>

                  {orientationColor === humanColor ? humanRow : engineRow}
                </div>

                {!showGameComplete && <p className={styles.statusBadge}>{statusText}</p>}
              </div>

              <div className={styles.panelCol}>
                {showGameComplete ? (
                  <div className={styles.controls}>
                    <button type="button" className={styles.controlBtn} onClick={handleNewGame}>
                      Change Opponent
                    </button>
                  </div>
                ) : (
                  <div className={styles.controls}>
                    <button type="button" className={styles.controlBtnPrimary} onClick={handleNewGameClick}>
                      New Game
                    </button>
                    <div className={styles.controlsSecondary}>
                      {showUndo && (
                        <button
                          type="button"
                          className={styles.controlBtn}
                          onClick={handleUndo}
                          disabled={history.length === 0 || engineThinking}
                        >
                          Undo
                        </button>
                      )}
                      <button
                        type="button"
                        className={styles.controlBtn}
                        onClick={() => setOrientation((o) => (o === 'white' ? 'black' : 'white'))}
                      >
                        Flip
                      </button>
                    </div>
                  </div>
                )}
                <div className={styles.panelDivider} />

                {!showGameComplete && (
                  <>
                    <div className={styles.controls}>
                      {showOfferDraw && (
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={handleOfferDraw}
                          disabled={drawOfferDisabled}
                        >
                          Offer Draw
                        </button>
                      )}
                      <button type="button" className={styles.actionBtn} onClick={handleResignClick}>
                        Resign
                      </button>
                    </div>
                    {drawOfferState === 'pending' && <p className={styles.drawBanner}>Draw offered…</p>}
                    {drawOfferState === 'accepted' && <p className={styles.drawBanner}>Nivenxa accepts the draw.</p>}
                    {drawOfferState === 'declined' && <p className={styles.drawBanner}>Nivenxa declines the draw.</p>}
                    <div className={styles.panelDivider} />
                  </>
                )}

                {!showGameComplete &&
                  (explanationMode === 'live' ? (
                    <div className={styles.panelBody}>
                      <div className={styles.panelTabs}>
                        <button
                          type="button"
                          className={`${styles.segmentedOption} ${panelTab === 'insight' ? styles.segmentedOptionSelected : ''}`}
                          onClick={() => setPanelTab('insight')}
                        >
                          Insight
                        </button>
                        <button
                          type="button"
                          className={`${styles.segmentedOption} ${panelTab === 'moves' ? styles.segmentedOptionSelected : ''}`}
                          onClick={() => setPanelTab('moves')}
                        >
                          Moves
                        </button>
                      </div>

                      {panelTab === 'insight' ? (
                        <>
                          {reviewing && (
                            <button type="button" className={styles.backToMovesBtn} onClick={handleBackToMoves}>
                              ← Back to moves
                            </button>
                          )}
                          <div className={styles.feed}>
                            {insightEntries.length === 0 ? (
                              <div className={styles.insightWelcome}>
                                <p className={styles.insightWelcomeHeadline}>{firstMoveGuidance.headline}</p>
                                <p className={styles.insightWelcomeText}>{firstMoveGuidance.body}</p>
                              </div>
                            ) : (
                              insightEntries.map((entry) => (
                                <div
                                  key={entry.ply}
                                  className={
                                    entry.kind === 'quality'
                                      ? `${styles.feedRow} ${styles[`feedRow_${classificationTone(entry.classification)}`]}`
                                      : styles.feedPlain
                                  }
                                >
                                  <span className={styles.entryMover}>
                                    <span className={styles.entryMoverName}>
                                      {entry.color === humanColor ? 'You' : 'Nivenxa'}
                                    </span>
                                    {' · '}
                                    <span className={styles.entryMoverNotation}>
                                      {moveNumberLabel(entry.ply, entry.color)}
                                      {entry.san}
                                    </span>
                                  </span>
                                  {entry.explanationStatus === 'idle' && (
                                    <span className={styles.calloutLoading}>Waiting…</span>
                                  )}
                                  {entry.explanationStatus === 'loading' && (
                                    <span className={styles.calloutLoading}>{entry.san} — thinking it through…</span>
                                  )}
                                  {entry.explanationStatus === 'loaded' && <ExplanationBody entry={entry} />}
                                  {entry.explanationStatus === 'error' && (
                                    <span className={styles.calloutError}>
                                      Couldn&apos;t load explanation for {entry.san}.
                                    </span>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <p className={styles.panelTitle}>Moves</p>
                          {movePairs.length === 0 ? (
                            <div className={styles.feedEmpty}>
                              <span className={styles.calloutPlaceholder}>Play a move to see it listed here.</span>
                            </div>
                          ) : (
                            <div className={styles.movesTable}>
                              {movePairs.map(([w, b], i) => (
                                <div key={i} className={styles.moveRow}>
                                  <span className={styles.moveNum}>{i + 1}</span>
                                  {w ? (
                                    <button
                                      type="button"
                                      className={`${styles.moveCell} ${selectedPly === w.ply ? styles.moveCellSelected : ''}`}
                                      onClick={() => handleSelectMove(w)}
                                    >
                                      {w.san}
                                    </button>
                                  ) : (
                                    <span className={styles.moveCell} />
                                  )}
                                  {b ? (
                                    <button
                                      type="button"
                                      className={`${styles.moveCell} ${selectedPly === b.ply ? styles.moveCellSelected : ''}`}
                                      onClick={() => handleSelectMove(b)}
                                    >
                                      {b.san}
                                    </button>
                                  ) : (
                                    <span className={styles.moveCell} />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ) : (
                    <div className={styles.panelBody}>
                      <p className={styles.panelTitle}>{panelTitleFor(activeTierId)}</p>
                      <div className={styles.panelPlaceholder}>
                        {activeTierId === 'master' ? (
                          <div>
                            <p className={styles.placeholderEmphasis}>Game in progress</p>
                            <span className={styles.calloutPlaceholder}>Analysis will be available when the game ends.</span>
                          </div>
                        ) : (
                          <span className={styles.calloutPlaceholder}>
                            Live coaching is off for this time control — full analysis is available after the game.
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                {showGameComplete && <div className={styles.resultPanel}>{resultBody}</div>}
              </div>
            </div>

            {showGameComplete && showResultOverlay && (
              <div
                className={styles.resultOverlay}
                role="presentation"
                onClick={() => setShowResultOverlay(false)}
              >
                <div
                  className={`${styles.resultCard} ${resultCopy.celebrate ? styles.resultCardCelebrate : ''}`}
                  role="dialog"
                  aria-modal="true"
                  aria-label={resultCopy.headline}
                  onClick={(e) => e.stopPropagation()}
                >
                  {resultCopy.celebrate && (
                    <div className={styles.sparkleField} aria-hidden="true">
                      {Array.from({ length: 6 }, (_, i) => (
                        <span key={i} className={styles.sparkle} />
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    className={styles.resultCardClose}
                    onClick={() => setShowResultOverlay(false)}
                    aria-label="Dismiss"
                  >
                    ×
                  </button>
                  {resultBody}
                </div>
              </div>
            )}

            {pendingConfirm && (
              <div className={styles.confirmOverlay} role="presentation" onClick={() => setPendingConfirm(null)}>
                <div
                  className={styles.confirmModal}
                  role="alertdialog"
                  aria-modal="true"
                  aria-label={pendingConfirm === 'resign' ? 'Resign this game?' : 'Start a new game?'}
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className={styles.confirmModalTitle}>
                    {pendingConfirm === 'resign' ? 'Resign this game?' : 'Start a new game?'}
                  </p>
                  <p className={styles.confirmModalText}>
                    {pendingConfirm === 'resign'
                      ? 'The game will end and Nivenxa will win.'
                      : 'This will end the current game.'}
                  </p>
                  <div className={styles.confirmModalActions}>
                    <button type="button" className={styles.controlBtn} onClick={() => setPendingConfirm(null)}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      className={styles.controlBtnDanger}
                      onClick={pendingConfirm === 'resign' ? handleResignConfirm : handleNewGame}
                    >
                      {pendingConfirm === 'resign' ? 'Resign Game' : 'New Game'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {screen === 'playing' && showGameComplete && reviewOpen && (
        <section className={styles.review}>
          <div className={styles.reviewInner}>
            <h2 className={styles.reviewTitle}>Game Review</h2>
            <ol className={styles.reviewList}>
              {analysisEntries.map((entry) => (
                <li key={entry.ply} className={styles.reviewRow}>
                  <span className={styles.reviewPly}>{moveNumberLabel(entry.ply, entry.color)}</span>
                  <span className={styles.reviewMover}>{entry.color === humanColor ? 'You' : 'Nivenxa'}</span>
                  <span className={styles.reviewSan}>{entry.san}</span>
                  {entry.kind === 'quality' ? (
                    <span className={`${styles.reviewPill} ${styles[`pill_${classificationTone(entry.classification)}`]}`}>
                      {formatClassification(entry.classification)}
                    </span>
                  ) : (
                    <span className={`${styles.reviewPill} ${styles.pill_neutral}`}>Engine note</span>
                  )}
                  {entry.explanationStatus === 'loading' && <span className={styles.reviewLoading}>Loading…</span>}
                  {entry.explanationStatus === 'loaded' && (
                    <div className={styles.reviewExplanation}>
                      <ExplanationBody entry={entry} />
                    </div>
                  )}
                  {entry.explanationStatus === 'error' && (
                    <span className={styles.reviewError}>Couldn&apos;t load explanation.</span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}
    </main>
  )
}
