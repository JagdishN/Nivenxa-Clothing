'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Board from '@/components/chess/Board'
import ExplanationBody from '@/components/chess/ExplanationBody'
import { useChessGame } from '@/lib/chess/useChessGame'
import { useStockfish } from '@/lib/chess/useStockfish'
import { useMoveAnalysis } from '@/lib/chess/useMoveAnalysis'
import { useChessClock, type LowTimeState } from '@/lib/chess/useChessClock'
import {
  SKILL_TIERS,
  SKILL_TIER_LIST,
  resolveExplanationMode,
  strengthSteps,
  skillForStrength,
  type SkillTier,
} from '@/lib/chess/skillTiers'
import { resolveDrawDecision } from '@/lib/chess/drawDecision'
import { TIME_CONTROLS, TIME_CONTROL_MODE_LIST, type TimeControlMode, type TimeControlPreset } from '@/lib/chess/timeControls'
import { accuracyFromEntries, classificationTone, formatClassification } from '@/lib/chess/moveClassification'
import { buildNormalizedGameFromPlaySession, type PlayResult } from '@/lib/chess/playToAnalysis'
import { setActiveGame } from '@/lib/chess/analysisSession'
import type { ColorChoice, MoveAnalysisEntry, QualityMoveEntry } from '@/lib/chess/types'
import MovePairsTable from './MovePairsTable'
import ExpertDashboard from './ExpertDashboard'
import MasterLivePanel from './MasterLivePanel'
import NivenxaNoticed from './NivenxaNoticed'
import styles from './Play.module.scss'

const SETUP_STORAGE_KEY = 'nivenxa-chess-setup'
// After Nivenxa declines a draw offer, Offer Draw is disabled for this many
// plies (5 of the player's own moves) so it can't be spammed every turn.
const DRAW_OFFER_COOLDOWN_PLIES = 10
// Offer Draw stays disabled until both sides have played 10 full moves (20
// plies) — a draw offer on move 1 doesn't mean anything, at any tier.
const DRAW_OFFER_MIN_PLIES = 20
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
  strength: number
}

/** 1-indexed "Strength: N of M" default for a tier — derived from its own defaultSkill, not hardcoded to 1. */
function defaultStrengthFor(tier: SkillTier): number {
  const t = SKILL_TIERS[tier]
  return t.defaultSkill - t.minSkill + 1
}

function clampStrength(tier: SkillTier, strength: number): number {
  return Math.min(Math.max(1, Math.round(strength)), strengthSteps(tier))
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
    if (tierValid && colorValid && modeValid && presetIndexValid) {
      const strength = typeof parsed.strength === 'number' ? clampStrength(parsed.tier, parsed.strength) : defaultStrengthFor(parsed.tier)
      return { ...parsed, strength } as StoredSetup
    }
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

function colorLabel(color: 'w' | 'b'): string {
  return color === 'w' ? 'White' : 'Black'
}

// White/black king glyphs read correctly with no extra styling — U+2654
// (WHITE CHESS KING) renders as an outline shape, U+265A (BLACK CHESS KING)
// as a solid one, in effectively every font — so "White"/"Black" stay
// visually distinct without color-coding text that must also work in dark mode.
function colorIcon(c: ColorChoice): string {
  return c === 'w' ? '♔' : c === 'b' ? '♚' : '♔♚'
}

/** "15 minutes + 10 seconds per move" — spells out a preset's shorthand label so "15+10" is never ambiguous. */
function presetDescription(p: TimeControlPreset): string {
  return `${p.minutes} minute${p.minutes === 1 ? '' : 's'} + ${p.incrementSeconds} second${p.incrementSeconds === 1 ? '' : 's'} added per move`
}

/** "Strength 4 · A demanding Expert challenge" — a dynamic read of where a strength step sits within its own tier's range, not just a bare number. */
// Master's 7 steps get their own named scale — "gentle" reads oddly for a
// tier someone deliberately chose as the toughest option, so it isn't just
// the generic band wording with a different tier name substituted in.
const MASTER_STRENGTH_NAMES = ['Entry', 'Strong', 'Advanced', 'Demanding', 'Elite', 'Exceptional', 'Peak']

function strengthHint(tier: SkillTier, n: number, totalSteps: number): string {
  const label = SKILL_TIERS[tier].label
  if (tier === 'master') return `Strength ${n} · ${MASTER_STRENGTH_NAMES[n - 1] ?? MASTER_STRENGTH_NAMES[0]} Master challenge`
  const fraction = n / totalSteps
  const band = n === 1 ? 'gentle' : n === totalSteps ? 'toughest' : fraction <= 0.5 ? 'balanced' : 'demanding'
  return `Strength ${n} · A ${band} ${label} challenge`
}

/** The one-line summary a collapsed history row shows instead of the full explanation — just the verdict half of the headline ("e4 — Good opening move" -> "Good opening move"), since the move itself is already in the row's own header. */
function collapsedSummary(entry: MoveAnalysisEntry): string {
  if (entry.headline) {
    const dashIndex = entry.headline.indexOf(' — ')
    return dashIndex >= 0 ? entry.headline.slice(dashIndex + 3) : entry.headline
  }
  return entry.explanation ?? ''
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

export default function ChessPlayPage() {
  const router = useRouter()
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
  const { ready, error, setSkillLevel, setContempt, getMove } = useStockfish()
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
  const [draftMode, setDraftMode] = useState<TimeControlMode>('rapid')
  const [draftPresetIndex, setDraftPresetIndex] = useState(0)
  const [draftStrength, setDraftStrength] = useState(() => defaultStrengthFor('beginner'))

  // The config actually driving the game in progress.
  const [activeTierId, setActiveTierId] = useState<SkillTier>('beginner')
  const [activeColorChoice, setActiveColorChoice] = useState<ColorChoice>('random')
  const [activeMode, setActiveMode] = useState<TimeControlMode | null>(null)
  const [activePreset, setActivePreset] = useState<TimeControlPreset | null>(null)
  const [activeStrength, setActiveStrength] = useState(() => defaultStrengthFor('beginner'))
  const [humanColor, setHumanColor] = useState<'w' | 'b'>('w')

  const [skillSet, setSkillSet] = useState(false)
  const [engineThinking, setEngineThinking] = useState(false)
  const [orientation, setOrientation] = useState<'white' | 'black'>('white')
  const [reviewOpen, setReviewOpen] = useState(false)

  // Gates Resign — enabled only once the player has actually made a move
  // (not just whenever `history` is non-empty, since if the player is Black
  // the engine's own opening move would otherwise flip this too early).
  const [playerHasMoved, setPlayerHasMoved] = useState(false)

  // Terminal states beyond what chess.js itself can reach (checkmate/
  // stalemate/draw-by-rule) — resignation and an agreed draw.
  const [endReason, setEndReason] = useState<'resigned' | 'draw-agreed' | null>(null)
  // Drives an inline "are you sure" swap in place of the button that
  // triggered it, for the two actions that abandon/end a game in progress.
  const [pendingConfirm, setPendingConfirm] = useState<'resign' | 'new-game' | null>(null)
  // The "•••" overflow menu holding New Game — kept out of the primary
  // controls row so it isn't the strongest-looking action during a live
  // game (see moreMenuRef's click-outside effect below).
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const moreMenuRef = useRef<HTMLDivElement>(null)
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

  // Which non-latest Insight-feed entries the player has manually expanded
  // (Beginner/Intermediate only) — the latest entry is always shown
  // expanded regardless of this set, see the feed rendering below.
  const [expandedHistoryPlies, setExpandedHistoryPlies] = useState<Set<number>>(new Set())
  const toggleHistoryEntry = (ply: number) => {
    setExpandedHistoryPlies((prev) => {
      const next = new Set(prev)
      if (next.has(ply)) next.delete(ply)
      else next.add(ply)
      return next
    })
  }

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
      setDraftStrength(stored.strength)
      if (stored.mode) {
        setDraftMode(stored.mode)
        setDraftPresetIndex(clampPresetIndex(stored.mode, stored.presetIndex))
      }
    }
  }, [])

  // Closes the "•••" overflow menu on any click outside it — the standard
  // dismiss behavior for a small popover menu.
  useEffect(() => {
    if (!moreMenuOpen) return
    const handleClick = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) setMoreMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [moreMenuOpen])

  const beginGame = (tier: SkillTier, color: ColorChoice, mode: TimeControlMode, presetIndex: number, strength: number) => {
    const resolved = resolveColor(color)
    const resolvedMode = tier === 'beginner' ? null : mode
    const resolvedPreset = resolvedMode ? TIME_CONTROLS[resolvedMode].presets[presetIndex] ?? TIME_CONTROLS[resolvedMode].presets[0] : null

    setActiveTierId(tier)
    setActiveColorChoice(color)
    setActiveMode(resolvedMode)
    setActivePreset(resolvedPreset)
    setActiveStrength(clampStrength(tier, strength))
    setHumanColor(resolved)
    setOrientation(resolved === 'w' ? 'white' : 'black')
    setSkillSet(false)
    setScreen('playing')
    setReviewOpen(false)
    setEndReason(null)
    setPlayerHasMoved(false)
    setPendingConfirm(null)
    setDrawOfferState('idle')
    setDeclinedUntilPly(null)
    setSelectedPly(null)
    setPanelTab('insight')
    setAwaitingExplanationForPly(null)
    setShowResultOverlay(false)
    setExpandedHistoryPlies(new Set())
    reset()
    resetAnalysis()
    resetClock(resolvedPreset)
  }

  const handleStartGame = () => {
    saveSetup({
      tier: draftTier,
      color: draftColor,
      mode: draftTier === 'beginner' ? null : draftMode,
      presetIndex: draftPresetIndex,
      strength: draftStrength,
    })
    beginGame(draftTier, draftColor, draftMode, draftPresetIndex, draftStrength)
  }

  const handleNewGame = () => {
    // Reopen full setup, prefilled with the game's current config.
    setDraftTier(activeTierId)
    setDraftColor(activeColorChoice)
    setDraftStrength(activeStrength)
    if (activeMode && activePreset) {
      setDraftMode(activeMode)
      setDraftPresetIndex(TIME_CONTROLS[activeMode].presets.indexOf(activePreset))
    }
    setScreen('setup')
  }

  // The mid-game "New Game" button goes through this — abandoning an active
  // game needs a confirm first; the post-game "New Game" button (there's no
  // active game left to lose) calls handleNewGame directly.
  const handleNewGameClick = () => {
    setPendingConfirm('new-game')
  }

  const handlePlayAgain = () => {
    const mode = activeMode ?? 'classical'
    const presetIndex = activeMode && activePreset ? TIME_CONTROLS[activeMode].presets.indexOf(activePreset) : 0
    beginGame(activeTierId, activeColorChoice, mode, presetIndex, activeStrength)
  }

  const handleAnalyzeGame = () => {
    let result: PlayResult = '1/2-1/2'
    if (outcome === 'player-win') result = humanColor === 'w' ? '1-0' : '0-1'
    else if (outcome === 'engine-win' || outcome === 'player-resigned') result = humanColor === 'w' ? '0-1' : '1-0'
    const game = buildNormalizedGameFromPlaySession(analysisEntries, humanColor, activeTierId, result)
    setActiveGame(game, 'analyze')
    router.push('/chess/analysis/player')
  }

  const handleDraftTierChange = (tier: SkillTier) => {
    setDraftTier(tier)
    setDraftStrength(defaultStrengthFor(tier))
    // Rapid is the more practical everyday default — Master leans Classical
    // instead, matching its own competitive/tournament framing.
    setDraftMode(tier === 'master' ? 'classical' : 'rapid')
    setDraftPresetIndex(0)
  }

  const handleUndo = () => {
    undo(2) // undoes the player's move and the engine's reply
    popEntries(2) // ...and both of those moves were analyzed now
    setSelectedPly(null) // the selected ply, if any, may no longer exist
    setAwaitingExplanationForPly(null) // ditto for a pending explanation wait
  }

  const handleResignClick = () => {
    if (!playerHasMoved) return
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
    if (drawOfferDisabled) return
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
        // Evaluation failed — fail toward declining rather than silently
        // giving up a possible advantage on a broken read of the position.
        engineEvalCp = SKILL_TIERS[activeTierId].drawRejectCp
      }

      const decision = resolveDrawDecision(engineEvalCp, activeTierId)

      if (decision === 'reject') {
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
      setSkillLevel(skillForStrength(activeTierId, activeStrength))
      setContempt(0)
      setSkillSet(true)
    }
  }, [ready, screen, skillSet, activeTierId, activeStrength, setSkillLevel, setContempt])

  // Whenever it becomes the engine's turn, let it respond — except in live
  // explanation contexts, where awaitingExplanationForPly (set below) holds
  // it back until the player's own move has been explained, so the engine's
  // move/explanation doesn't appear before they've read their own feedback.
  useEffect(() => {
    if (screen !== 'playing' || !ready || !skillSet || turn === humanColor || isGameOver || endReason !== null) return
    if (awaitingExplanationForPly !== null) return

    let cancelled = false
    setEngineThinking(true)

    getMove(fen, { movetime: tierConfig.movetime })
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
    getMove,
    makeMove,
    analyzeMove,
    tierConfig.movetime,
  ])

  // Clears awaitingExplanationForPly once the entry it's watching either
  // resolves (loaded/error) or was never going to be explained at all
  // (idle forever — useMoveAnalysis's shouldAutoExplainLive decided to skip
  // it, e.g. an unremarkable Intermediate move, or anything at Expert).
  // Safe to key off "not loading": insertEntry's idle-insert and
  // fetchExplanation's loading-patch happen synchronously in the same tick
  // when an explanation IS wanted (React 18 batches them into one render),
  // so idle only ever means "decided not to explain this one," never a
  // fetch that's merely about to start.
  useEffect(() => {
    if (awaitingExplanationForPly === null) return
    const entry = analysisEntries.find((e) => e.ply === awaitingExplanationForPly)
    if (entry && entry.explanationStatus !== 'loading') {
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
      setPlayerHasMoved(true)
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
        <span className={styles.playerName}>Nivenxa · {colorLabel(engineColor)}</span>
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
      <NivenxaNoticed entries={playerQualityEntries} tone={tierConfig.tone} onAnalyze={handleAnalyzeGame} />
      <button type="button" className={styles.resultPrimaryBtn} onClick={handleAnalyzeGame}>
        Analyze Game →
      </button>
      <div className={styles.resultActions}>
        <button type="button" className={styles.controlBtn} onClick={handlePlayAgain}>
          Rematch
        </button>
        <button type="button" className={styles.controlBtn} onClick={handleNewGame}>
          New Game
        </button>
      </div>
      <button type="button" className={styles.reviewLinkBtn} onClick={handleReviewGameToggle}>
        {reviewOpen ? 'Hide Review' : 'Review Game'}
      </button>
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

  // Intermediate is selective — silently-skipped moves (see
  // shouldAutoExplainLive in skillTiers.ts) never leave 'idle', so they're
  // filtered out here before the feed only shows what Nivenxa actually
  // decided was worth flagging. Beginner still sees every move.
  const feedSourceEntries =
    activeTierId === 'intermediate' ? analysisEntries.filter((e) => e.explanationStatus !== 'idle') : analysisEntries
  // Full history, not just the latest couple — older entries render
  // collapsed to one line (see the feed rendering below), which is what
  // keeps a long game's feed from dominating the panel instead of a hard cap.
  const insightEntries = reviewing ? (reviewEntry ? [reviewEntry] : []) : feedSourceEntries
  const latestInsightPly = feedSourceEntries[feedSourceEntries.length - 1]?.ply
  // Whether the game has moves at all yet — distinguishes "hasn't started"
  // (pre-first-move welcome) from "played moves, nothing notable lately"
  // (Intermediate only) so the same welcome copy doesn't repeat oddly mid-game.
  const midGameQuiet = activeTierId === 'intermediate' && insightEntries.length === 0 && analysisEntries.length > 0

  // Shown in the Insight tab before any move has been analyzed yet — Beginner
  // gets a concrete starting suggestion, everyone else (who reaches the live
  // tab at all) gets a short standing objective instead of a lesson.
  const firstMoveGuidance =
    activeTierId === 'beginner'
      ? {
          headline: 'Your first move',
          body: 'Start by moving a centre pawn or developing a knight. Controlling the centre gives your pieces more space.',
        }
      : midGameQuiet
        ? { headline: 'All quiet', body: 'Nothing to flag right now — keep playing your plan.' }
        : {
            headline: 'Your move',
            body: 'Control the centre, develop your pieces, and prepare your king for safety.',
          }

  // Expert dashboard data — the most recent graded move of any color (drives
  // the eval, frozen at the last *completed* move) and the most recent
  // graded move specifically by the player (drives the classification chip,
  // which persists across Nivenxa's own reply until the player moves again).
  const qualityEntries = analysisEntries.filter((e): e is QualityMoveEntry => e.kind === 'quality')
  const latestEntry = qualityEntries[qualityEntries.length - 1]
  const latestPlayerEntry = [...qualityEntries].reverse().find((e) => e.color === humanColor)
  const sanHistory = analysisEntries.map((e) => e.san)

  const showUndo = activeTierId === 'beginner' || activeTierId === 'intermediate'
  const belowMinMoves = history.length < DRAW_OFFER_MIN_PLIES
  const inCooldown = declinedUntilPly !== null && history.length < declinedUntilPly
  // Hidden entirely (not just disabled) until it's actually a real option —
  // a permanently-greyed-out control with no context reads as broken. Once
  // past the minimum, it stays visible even during a cooldown, which is a
  // genuinely temporary/explained disabled state (see drawOfferHint).
  const showOfferDraw = activeTierId !== 'beginner' && !belowMinMoves
  const drawOfferDisabled = drawOfferState === 'pending' || drawOfferState === 'accepted' || inCooldown
  const drawOfferHint =
    drawOfferState === 'pending' || drawOfferState === 'accepted'
      ? undefined
      : inCooldown
        ? 'You can offer again in a few moves.'
        : undefined
  const resignHint = playerHasMoved ? undefined : "You can resign once you've made a move."

  return (
    <main className={styles.page}>
      <section className={styles.layout}>
        {screen === 'setup' ? (
          <div className={styles.setupColumn}>
            <h1 className={styles.heading}>Play</h1>
            <div className={styles.setupDivider} />

            <div className={styles.setupArea}>
              <p className={styles.tierPickerTitle}>Choose Your Level</p>
              <div className={styles.tierGrid}>
                {SKILL_TIER_LIST.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`${styles.tierOption} ${draftTier === t.id ? styles.tierOptionSelected : ''}`}
                    onClick={() => handleDraftTierChange(t.id)}
                    title={t.description}
                  >
                    <span className={styles.tierOptionTop}>
                      <span className={styles.tierOptionLabel}>{t.label}</span>
                      {draftTier === t.id && (
                        <span className={styles.tierOptionCheck} aria-hidden="true">
                          ✓
                        </span>
                      )}
                    </span>
                    <span className={styles.tierOptionEyebrow}>{t.experienceLabel}</span>
                    <span className={styles.tierOptionVerb}>{t.experienceVerb}</span>
                  </button>
                ))}
              </div>

              {strengthSteps(draftTier) > 1 && (
                <>
                  <p className={styles.setupSectionTitle}>{SKILL_TIERS[draftTier].label.toUpperCase()} STRENGTH</p>
                  <div className={styles.strengthSteps} role="group" aria-label={`Strength within ${SKILL_TIERS[draftTier].label}`}>
                    {Array.from({ length: strengthSteps(draftTier) }, (_, i) => i + 1).map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={`${styles.strengthStep} ${draftStrength === n ? styles.strengthStepSelected : ''}`}
                        onClick={() => setDraftStrength(n)}
                        aria-pressed={draftStrength === n}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <p className={styles.setupHint}>{strengthHint(draftTier, draftStrength, strengthSteps(draftTier))}</p>
                </>
              )}

              <p className={styles.setupSectionTitle}>Play As</p>
              <div className={styles.colorGrid}>
                {(['w', 'b', 'random'] as ColorChoice[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`${styles.colorOption} ${draftColor === c ? styles.colorOptionSelected : ''}`}
                    onClick={() => setDraftColor(c)}
                  >
                    {draftColor === c && (
                      <span className={styles.colorOptionCheck} aria-hidden="true">
                        ✓
                      </span>
                    )}
                    <span className={styles.colorOptionIcon} aria-hidden="true">
                      {colorIcon(c)}
                    </span>
                    <span className={styles.colorOptionLabel}>{c === 'random' ? 'Random' : colorLabel(c)}</span>
                  </button>
                ))}
              </div>

              {draftTier !== 'beginner' && (
                <>
                  <p className={styles.setupSectionTitle}>Game Pace</p>
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

                  <p className={styles.setupSectionTitle}>Time Control</p>
                  <div className={styles.timeControlGrid}>
                    {TIME_CONTROLS[draftMode].presets.map((p, i) => (
                      <button
                        key={p.label}
                        type="button"
                        className={`${styles.timeControlTile} ${draftPresetIndex === i ? styles.timeControlTileSelected : ''}`}
                        onClick={() => setDraftPresetIndex(i)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <p className={styles.setupHint}>
                    {presetDescription(TIME_CONTROLS[draftMode].presets[draftPresetIndex] ?? TIME_CONTROLS[draftMode].presets[0])}
                  </p>
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
                {strengthSteps(activeTierId) > 1 ? ` · Strength ${activeStrength}/${strengthSteps(activeTierId)}` : ''}
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
                {!showGameComplete && (
                  <>
                    <div className={styles.controls}>
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
                      <div className={styles.moreMenuWrap} ref={moreMenuRef}>
                        <button
                          type="button"
                          className={styles.moreMenuBtn}
                          onClick={() => setMoreMenuOpen((open) => !open)}
                          aria-label="More options"
                          aria-expanded={moreMenuOpen}
                        >
                          •••
                        </button>
                        {moreMenuOpen && (
                          <div className={styles.moreMenu} role="menu">
                            <button
                              type="button"
                              className={styles.moreMenuItem}
                              role="menuitem"
                              onClick={() => {
                                setMoreMenuOpen(false)
                                handleNewGameClick()
                              }}
                            >
                              New Game
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={styles.panelDivider} />
                  </>
                )}

                {!showGameComplete && (
                  <>
                    <div className={styles.controls}>
                      {showOfferDraw && (
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={handleOfferDraw}
                          disabled={drawOfferDisabled}
                          title={drawOfferHint}
                        >
                          Offer Draw
                        </button>
                      )}
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={handleResignClick}
                        disabled={!playerHasMoved}
                        title={resignHint}
                      >
                        Resign
                      </button>
                    </div>
                    {drawOfferState === 'pending' && <p className={styles.drawBanner}>Draw offered…</p>}
                    {drawOfferState === 'accepted' && <p className={styles.drawBanner}>Nivenxa accepts the draw.</p>}
                    {drawOfferState === 'declined' && <p className={styles.drawBanner}>Nivenxa wants to keep playing.</p>}
                    <div className={styles.panelDivider} />
                  </>
                )}

                {!showGameComplete &&
                  (activeTierId === 'expert' ? (
                    <ExpertDashboard
                      strength={activeStrength}
                      totalSteps={strengthSteps('expert')}
                      latestEntry={latestEntry}
                      latestPlayerEntry={latestPlayerEntry}
                      sanHistory={sanHistory}
                      fen={fen}
                      plyCount={history.length}
                      movePairs={movePairs}
                      selectedPly={selectedPly}
                      onSelectMove={handleSelectMove}
                      reviewing={reviewing}
                      onBackToLive={handleBackToMoves}
                    />
                  ) : activeTierId === 'master' ? (
                    <MasterLivePanel
                      movePairs={movePairs}
                      selectedPly={selectedPly}
                      onSelectMove={handleSelectMove}
                      turn={turn}
                      plyCount={history.length}
                      fen={fen}
                      reviewing={reviewing}
                      onBackToLive={handleBackToMoves}
                    />
                  ) : explanationMode === 'live' ? (
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
                              insightEntries.map((entry) => {
                                const isLatest = !reviewing && entry.ply === latestInsightPly
                                const isExpanded = reviewing || isLatest || expandedHistoryPlies.has(entry.ply)
                                const moverLine = (
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
                                )

                                return (
                                  <div
                                    key={entry.ply}
                                    className={
                                      entry.kind === 'quality'
                                        ? `${styles.feedRow} ${styles[`feedRow_${classificationTone(entry.classification)}`]}`
                                        : styles.feedPlain
                                    }
                                  >
                                    {isLatest || reviewing ? (
                                      <div className={styles.historyRowHeader}>{moverLine}</div>
                                    ) : (
                                      <button
                                        type="button"
                                        className={styles.historyRowHeader}
                                        onClick={() => toggleHistoryEntry(entry.ply)}
                                        aria-expanded={isExpanded}
                                      >
                                        <span className={styles.historyChevron} aria-hidden="true">
                                          {isExpanded ? '▼' : '›'}
                                        </span>
                                        {moverLine}
                                      </button>
                                    )}

                                    {entry.explanationStatus === 'idle' && (
                                      <span className={styles.calloutLoading}>Waiting…</span>
                                    )}
                                    {entry.explanationStatus === 'loading' && (
                                      <span className={styles.calloutLoading}>{entry.san} — thinking it through…</span>
                                    )}
                                    {entry.explanationStatus === 'loaded' &&
                                      (isExpanded ? (
                                        <ExplanationBody entry={entry} />
                                      ) : (
                                        <p className={styles.historySummary}>{collapsedSummary(entry)}</p>
                                      ))}
                                    {entry.explanationStatus === 'error' && (
                                      <span className={styles.calloutError}>
                                        Couldn&apos;t load explanation for {entry.san}.
                                      </span>
                                    )}
                                  </div>
                                )
                              })
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <p className={styles.panelTitle}>Moves</p>
                          <MovePairsTable movePairs={movePairs} selectedPly={selectedPly} onSelectMove={handleSelectMove} />
                        </>
                      )}
                    </div>
                  ) : (
                    <div className={styles.panelBody}>
                      <p className={styles.panelTitle}>{panelTitleFor(activeTierId)}</p>
                      <div className={styles.panelPlaceholder}>
                        <span className={styles.calloutPlaceholder}>
                          Live coaching is off for this time control — full analysis is available after the game.
                        </span>
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
                      : "Your current game hasn't finished."}
                  </p>
                  <div className={styles.confirmModalActions}>
                    <button type="button" className={styles.controlBtn} onClick={() => setPendingConfirm(null)}>
                      {pendingConfirm === 'resign' ? 'Cancel' : 'Continue Playing'}
                    </button>
                    <button
                      type="button"
                      className={styles.controlBtnDanger}
                      onClick={pendingConfirm === 'resign' ? handleResignConfirm : handleNewGame}
                    >
                      {pendingConfirm === 'resign' ? 'Resign Game' : 'Start New Game'}
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
