'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
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
import { saveFinishedGame } from '@/lib/chess/activityActions'
import type { ColorChoice, MoveAnalysisEntry, QualityMoveEntry } from '@/lib/chess/types'
import MovePairsTable from './MovePairsTable'
import ExpertDashboard from './ExpertDashboard'
import MasterLivePanel from './MasterLivePanel'
import NivenxaNoticed from './NivenxaNoticed'
import OpponentAvatar from './avatar/OpponentAvatar'
import PlayerAvatar from './avatar/PlayerAvatar'
import { useAvatarSettings } from './avatar/useAvatarSettings'
import InsightPanel from './InsightPanel'
import { localizeEntry } from '@/lib/chess/insightFeed'
import { checkInfoFor, describeCheck, replyOptions } from '@/lib/chess/checkInfo'
import { assistanceLabel } from '@/lib/chess/avatarReaction'
import BotPicker from './avatar/BotPicker'
import { BOT_STORAGE_KEY, INTRO_GAMES, botById, introRestricted, isBotId, resolveBot, introLabel } from '@/lib/chess/botRoster'
import type { BotId } from '@/lib/chess/botRoster'
import { MIN_PLAYER_MOVES_TO_END_EARLY, countsAsIntroGame } from '@/lib/chess/coachIntro'
import { useChessSession } from '@/lib/chess/useChessSession'
import { useCoachIntro } from '@/lib/chess/useCoachIntro'
import type { Key } from 'chessground/types'
import { remainingHoldMs, replyMinMs, testOverrideMs } from '@/lib/chess/replyPace'
import { downloadEvidence, evidenceEnabled } from '@/lib/chess/reviewEvidence'
import { positionKey } from '@/lib/chess/moveFacts'

// TEST-ONLY: the Tivvi opponent avatar renders only in builds made with NEXT_PUBLIC_CHESS_AVATAR_PROTOTYPE=1 (not approved for deployment).
const AVATAR_PROTOTYPE = process.env.NEXT_PUBLIC_CHESS_AVATAR_PROTOTYPE === '1'
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
  const { ready, error, setSkillLevel, setContempt, getMove, stop: stopEngine } = useStockfish()
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
  // Opponent character: a saved CHOICE (cosmetic), separate from level, strength and assistance. The opponent actually used is
  // resolved from it (the coach during the Beginner introduction). Changing it only affects the NEXT game.
  const [botPref, setBotPref] = useState<BotId | null>(null)
  const [activeBotId, setActiveBotId] = useState<BotId>('tivvi')
  const [introGame, setIntroGame] = useState<number | null>(null) // 1..3 while the running game is a coach introduction game
  const chessSession = useChessSession()
  const intro = useCoachIntro(chessSession.signedIn, chessSession.checked, chessSession.userId, chessSession.epoch)
  const introRecordedRef = useRef('')
  // What the coach introduction did with the game that just ended (shown in its result), and a note about an abandoned one (shown in setup).
  const [introOutcome, setIntroOutcome] = useState<{ counted: boolean; after: number; reason?: string } | null>(null)
  const [introNotice, setIntroNotice] = useState('')
  // The engine reply the player asked to see on the board for ONE move. It is drawn only on the position it belongs to.
  const [marks, setMarks] = useState<{ ply: number; fen: string; from: Key; to: Key } | null>(null)
  const draftBot = resolveBot(draftTier, intro.completed, botPref)

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
  // One canonical record per played game (My Activity → My Games): a fresh id per game, saved once when it ends.
  const gameLocalIdRef = useRef('')
  const gameStartedAtRef = useRef('')
  const gameSavePromiseRef = useRef<Promise<string | null> | null>(null)
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

  // The celebratory/announcement overlay shown once when a game ends —
  // dismissible, separate from the persistent result summary in the panel.
  const [showResultOverlay, setShowResultOverlay] = useState(false)
  // Bumped for every new game; the opponent avatar uses it to drop anything in flight from the previous one.
  const [gameKey, setGameKey] = useState(0)
  // When the human's last move was accepted (performance.now()): the opponent's minimum reply time is measured from here.
  const replyClockRef = useRef<number | null>(null)
  // What the opponent's pending reply must still match when it is about to be applied.
  const liveRef = useRef({ fen: '', gameKey: 0, over: false })
  const minReplyMsRef = useRef(500)
  const lastReplyAppliedRef = useRef<string>('')
  // The last move played (either side), so the board keeps its highlight until the next move.
  const [lastMove, setLastMove] = useState<Key[] | undefined>(undefined)
  // Game settings (Animations switch). Persisted by useAvatarSettings; the OS reduced-motion preference always wins.
  const avatarSettings = useAvatarSettings()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)
  const reviewSectionRef = useRef<HTMLElement>(null)

  const tierConfig = SKILL_TIERS[activeTierId]
  const explanationMode = resolveExplanationMode(activeTierId, activeMode)

  const {
    entries: analysisEntries,
    analyzeMove,
    requestExplanation,
    reset: resetAnalysis,
    popEntries,
  } = useMoveAnalysis(tierConfig, explanationMode)
  const analyzeMoveRef = useRef(analyzeMove)
  const makeMoveRef = useRef(makeMove)

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
    try {
      const b = localStorage.getItem(BOT_STORAGE_KEY)
      if (isBotId(b)) setBotPref(b)
    } catch {
      // storage unavailable: the default opponent is used
    }
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

  // Same for the game-settings popover (Escape also closes it).
  useEffect(() => {
    if (!settingsOpen) return
    const outside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setSettingsOpen(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setSettingsOpen(false)
    document.addEventListener('mousedown', outside)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', outside)
      document.removeEventListener('keydown', esc)
    }
  }, [settingsOpen])

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

  const beginGame = (tier: SkillTier, color: ColorChoice, mode: TimeControlMode, presetIndex: number, strength: number, bot: BotId) => {
    const resolved = resolveColor(color)
    const resolvedMode = tier === 'beginner' ? null : mode
    const resolvedPreset = resolvedMode ? TIME_CONTROLS[resolvedMode].presets[presetIndex] ?? TIME_CONTROLS[resolvedMode].presets[0] : null

    setActiveTierId(tier)
    const restricted = introRestricted(tier, intro.completed)
    setActiveBotId(resolveBot(tier, intro.completed, bot))
    setIntroGame(restricted ? Math.min(intro.completed + 1, 3) : null)
    setActiveColorChoice(color)
    setActiveMode(resolvedMode)
    setActivePreset(resolvedPreset)
    setActiveStrength(clampStrength(tier, strength))
    replyClockRef.current = null
    setLastMove(undefined)
    setMarks(null)
    setIntroOutcome(null)
    setIntroNotice('')
    setHumanColor(resolved)
    setOrientation(resolved === 'w' ? 'white' : 'black')
    gameLocalIdRef.current = crypto.randomUUID()
    gameStartedAtRef.current = new Date().toISOString()
    gameSavePromiseRef.current = null
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
    setShowResultOverlay(false)
    setGameKey((k) => k + 1)
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
    beginGame(draftTier, draftColor, draftMode, draftPresetIndex, draftStrength, draftBot)
  }

  const handleNewGame = () => {
    // Leaving a coach game that never finished: say plainly that it did not count (a finished game's result already said what happened).
    if (introGame !== null && !showGameComplete) setIntroNotice("Your last coach game was not finished, so it did not count. A game counts when it ends, or when you resign after 10 of your own moves.")
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
    beginGame(activeTierId, activeColorChoice, mode, presetIndex, activeStrength, activeBotId)
  }

  const handleAnalyzeGame = async () => {
    let result: PlayResult = '1/2-1/2'
    if (outcome === 'player-win') result = humanColor === 'w' ? '1-0' : '0-1'
    else if (outcome === 'engine-win' || outcome === 'player-resigned') result = humanColor === 'w' ? '0-1' : '1-0'
    const game = buildNormalizedGameFromPlaySession(analysisEntries, humanColor, activeTierId, result)
    const savedId = await gameSavePromiseRef.current?.catch(() => null)
    if (savedId) game.playedGameId = savedId
    setActiveGame(game, 'analyze')
    router.push('/chess/analysis/player')
  }

  // The setup screen is long (opponent picker): starting a game must show the board from the top, not wherever Start Game was scrolled to.
  useEffect(() => {
    if (screen === 'playing') {
      // On Chess pages the BODY is the scroller (not the window), so reset it directly as well.
      window.scrollTo({ top: 0 })
      document.body.scrollTop = 0
      document.documentElement.scrollTop = 0
    }
  }, [screen, gameKey])

  const chooseBot = (id: BotId) => {
    setBotPref(id)
    try {
      localStorage.setItem(BOT_STORAGE_KEY, id)
    } catch {
      // storage unavailable: the choice still applies to the next game
    }
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
    // While the opponent's reply is still pending only the player's own move exists to take back; the pending reply is cancelled
    // by the engine effect's cleanup as soon as the position changes.
    const count = turn !== humanColor ? 1 : 2
    undo(count)
    replyClockRef.current = null
    setLastMove(undefined)
    popEntries(Math.max(0, history.length - count)) // drop what belongs to the two undone plies (and their in-flight work); earlier moves keep theirs
    setSelectedPly(null) // the selected ply, if any, may no longer exist
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
        setShowResultOverlay(false) // the review opens on the page behind the result card
        window.setTimeout(() => reviewSectionRef.current?.scrollIntoView({ behavior: avatarSettings.reduced ? 'auto' : 'smooth', block: 'start' }), 0)
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

  // Keep the values a pending reply must re-check at the moment it would be applied (updated after every render, so a timer
  // that fires later always sees the CURRENT game, never the one it started in).
  const endedNow = isGameOver || endReason !== null
  useEffect(() => {
    analyzeMoveRef.current = analyzeMove
    makeMoveRef.current = makeMove
    minReplyMsRef.current = replyMinMs(activeTierId, testOverrideMs())
    liveRef.current = { fen, gameKey, over: endedNow }
  })
  // The engine search currently running (if any): a new search never starts until the previous one has finished, because the engine
  // answers one `go` at a time and a late "bestmove" from an abandoned search would otherwise be taken for the new one's.
  const searchRef = useRef<Promise<unknown> | null>(null)
  const [pendingReply, setPendingReply] = useState(false)

  // Whenever it becomes the engine's turn, it starts computing AT ONCE. The reply is applied when BOTH the computation is done and the
  // reply pace's minimum time (counted from the human move being accepted) has passed: engine time counts toward the minimum, and a
  // search that takes longer than the minimum is played when ready, with no extra delay. Nothing waits for commentary.
  // Cancelled safely on undo, restart, new game, resignation, game end and leaving the page (this effect's cleanup); and the reply
  // is re-validated against the live game and position right before it is applied, so a stale or resumed timer can never move.
  useEffect(() => {
    if (screen !== 'playing' || !ready || !skillSet || turn === humanColor || isGameOver || endReason !== null) return
    const token = { cancelled: false, timer: null as ReturnType<typeof setTimeout> | null, wake: null as (() => void) | null }
    const startedFen = fen
    const startedGame = gameKey
    // Measured from the human move being accepted (the engine's own first move of a game: from now).
    const acceptedAt = replyClockRef.current ?? performance.now()
    setEngineThinking(true)
    setPendingReply(true)

    const run = async () => {
      const previous = searchRef.current
      if (previous) await previous.catch(() => undefined)
      if (token.cancelled) return
      const search = getMove(startedFen, { movetime: tierConfig.movetime })
      searchRef.current = search
      let uci: string
      try {
        uci = await search
      } catch {
        return // the engine failed to produce a move: leave the position as it is
      } finally {
        if (searchRef.current === search) searchRef.current = null
      }
      if (token.cancelled) return
      const hold = remainingHoldMs(minReplyMsRef.current,performance.now() - acceptedAt)
      if (hold > 0) {
        await new Promise<void>((resolve) => {
          token.wake = resolve
          token.timer = setTimeout(resolve, hold)
        })
      }
      if (token.cancelled) return
      // Re-validate: the same game, the same position, still the engine's move, nothing ended, and this reply not already applied.
      const live = liveRef.current
      if (live.gameKey !== startedGame || live.fen !== startedFen || live.over) return
      // Per accepted move (not per position): replaying the very same move after an undo must still get its reply.
      const key = `${startedGame}|${startedFen}|${acceptedAt}`
      if (lastReplyAppliedRef.current === key) return
      const { from, to, promotion } = parseUciMove(uci)
      const result = makeMoveRef.current(from, to, promotion)
      if (!result) return
      lastReplyAppliedRef.current = key
      replyClockRef.current = null
      setLastMove([from as Key, to as Key])
      analyzeMoveRef.current(result, 'engine')
    }
    void run().finally(() => {
      if (!token.cancelled) {
        setEngineThinking(false)
        setPendingReply(false)
      }
    })

    return () => {
      token.cancelled = true
      if (token.timer) clearTimeout(token.timer)
      token.wake?.()
      // A search still running for an abandoned position is told to stop so the next one can start without waiting for it.
      if (searchRef.current) stopEngine()
      setEngineThinking(false)
      setPendingReply(false)
    }
  }, [screen, ready, skillSet, fen, turn, humanColor, isGameOver, endReason, gameKey, getMove, stopEngine, tierConfig.movetime])

  const handlePlayerMove = (from: string, to: string) => {
    const result = makeMove(from, to, 'q')
    if (result) {
      replyClockRef.current = performance.now() // the opponent's minimum reply time starts now, when the move is accepted
      setLastMove([from as Key, to as Key])
      setPlayerHasMoved(true)
      analyzeMove(result, 'player')
    }
  }

  // Reviewing a past move overlays the board display only — see the state
  // comment above. `reviewEntry` is only ever undefined mid-transition
  // (e.g. right after handleUndo clears a now-stale selectedPly).
  const reviewing = selectedPly !== null
  const reviewEntry = reviewing ? analysisEntries.find((e) => e.ply === selectedPly) : undefined

  // Check is read from the position being SHOWN (live or a reviewed move), never from asynchronous commentary.
  const shownFen = reviewEntry ? reviewEntry.fenAfter : fen
  const activeMarks = marks && positionKey(shownFen) === positionKey(marks.fen) ? marks : null
  const shownCheck = useMemo(() => checkInfoFor(shownFen), [shownFen])
  const liveCheck = useMemo(() => checkInfoFor(fen), [fen])

  const boardLocked = !ready || turn !== humanColor || isGameOver || endReason !== null || reviewing
  const showGameComplete = screen === 'playing' && (isGameOver || endReason !== null)

  // Opponent naming has to exist before the status line (TIVVI in avatar builds, "Nivenxa" otherwise).
  const activeBot = botById(activeBotId)
  const opponentName = AVATAR_PROTOTYPE ? activeBot.name : 'Nivenxa'
  let statusText: string
  if (error) statusText = `Engine error: ${error}`
  else if (!ready) statusText = 'Loading engine…'
  else if (isCheckmate) statusText = turn === humanColor ? (AVATAR_PROTOTYPE ? `Checkmate — ${opponentName} wins` : 'Checkmate — the engine wins') : 'Checkmate — you win'
  else if (isStalemate) statusText = 'Stalemate — draw'
  else if (isDraw) statusText = 'Draw'
  else if (isCheck) statusText = turn === humanColor ? 'Check — your move' : AVATAR_PROTOTYPE ? `Check — ${opponentName} to move` : 'Check'
  else if (engineThinking) statusText = AVATAR_PROTOTYPE ? `${opponentName} is thinking…` : 'Engine thinking…'
  else statusText = turn === humanColor ? 'Your move' : AVATAR_PROTOTYPE ? `${opponentName}'s move` : "Engine's move"
  const statusIsCheck = !error && ready && isCheck && !isCheckmate

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

  // The one turn/check indicator lives in the header of the side whose turn it is, right beside the board (never across the panel).
  // It is derived from the game state alone, so commentary can neither delay nor change it.
  const statusHost: 'human' | 'engine' | null = showGameComplete ? null : !ready || error || turn === humanColor ? 'human' : 'engine'
  const statusChip = (
    <p
      className={`${styles.statusBadge} ${statusIsCheck ? styles.statusCheck : ''}`}
      data-testid="game-status"
      data-check={statusIsCheck ? 'true' : undefined}
      data-host={statusHost ?? undefined}
    >
      {statusIsCheck && <span className={styles.checkMark} aria-hidden="true">!</span>}
      {statusText}
    </p>
  )

  const renderEngineRow = () => (
    <div className={styles.playerRow}>
      <div className={styles.playerIdentity}>
        {AVATAR_PROTOTYPE ? (
          <OpponentAvatar
            key={gameKey}
            bot={activeBot}
            tier={activeTierId}
            mode={explanationMode}
            humanColor={humanColor}
            sideLabel={colorLabel(engineColor)}
            history={history}
            fen={fen}
            entries={analysisEntries}
            engineThinking={engineThinking}
            gameComplete={showGameComplete}
            outcome={outcome}
            animate={avatarSettings.animate}
            hidden={avatarSettings.hidden}
          />
        ) : (
          <span className={styles.playerName}>Nivenxa · {colorLabel(engineColor)}</span>
        )}
      </div>
      {renderClock(engineColor)}
      {statusHost === 'engine' && statusChip}
    </div>
  )

  const humanRow = (
    <div className={styles.playerRow}>
      <div className={styles.playerIdentity}>
        {AVATAR_PROTOTYPE && !avatarSettings.hidden ? (
          <PlayerAvatar>You · {colorLabel(humanColor)}</PlayerAvatar>
        ) : (
          <span className={styles.playerName}>You · {colorLabel(humanColor)}</span>
        )}
      </div>
      {renderClock(humanColor)}
      {statusHost === 'human' && statusChip}
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
  // The summary counts COMPLETED ENGINE GRADES only (never commentary). If some of your moves have no grade yet (still being analysed,
  // or the analysis was unavailable) the numbers are labelled provisional instead of being presented as final.
  const humanMoveCount = Math.floor((history.length + (humanColor === 'w' ? 1 : 0)) / 2)
  const gradedMoveCount = playerQualityEntries.length
  const summaryProvisional = gradedMoveCount < humanMoveCount
  // Still being reviewed, or the analysis gave up on some moves (then the summary is partial, and says so).
  const failedMoveCount = analysisEntries.filter((e) => e.color === humanColor && e.analysisUnavailable).length
  const summaryInProgress = humanMoveCount - gradedMoveCount - failedMoveCount > 0
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

  // Save the finished game once (signed-in players only — a guest's call is refused by the server and ignored).
  // Only the final record is written: no per-move or clock writes while the game is in progress.
  useEffect(() => {
    if (!showGameComplete || gameSavePromiseRef.current || !gameLocalIdRef.current || analysisEntries.length === 0) return
    const result = outcome === 'draw' ? '1/2-1/2' : outcome === 'player-win' ? (humanColor === 'w' ? '1-0' : '0-1') : humanColor === 'w' ? '0-1' : '1-0'
    gameSavePromiseRef.current = saveFinishedGame({
      localId: gameLocalIdRef.current,
      status: endReason === 'resigned' ? 'resigned' : 'completed',
      playerColor: humanColor,
      opponent: `Nivenxa · ${tierConfig.label}`,
      tier: activeTierId,
      timeControl: activePreset?.label ?? null,
      result,
      movesSan: [...analysisEntries].sort((a, b) => a.ply - b.ply).map((e) => e.san),
      startedAt: gameStartedAtRef.current || new Date().toISOString(),
    })
      .then((r) => (r.ok ? r.id : null))
      .catch(() => null)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires once per finished game (guarded by the ref); the values it reads are final at that moment
  }, [showGameComplete])

  // Coach introduction: a finished game counts ONCE (keyed by the game's own id). Restarted or abandoned games never get here, and
  // ending early by resignation or agreement only counts after enough of the player's own moves.
  useEffect(() => {
    if (!showGameComplete || introGame === null || !gameLocalIdRef.current || introRecordedRef.current === gameLocalIdRef.current) return
    const playerMoves = humanColor === 'w' ? Math.ceil(history.length / 2) : Math.floor(history.length / 2)
    const endKind = endReason === 'resigned' ? 'resigned' : endReason === 'draw-agreed' ? 'draw-agreed' : isCheckmate ? 'checkmate' : isStalemate ? 'stalemate' : 'draw-rule'
    introRecordedRef.current = gameLocalIdRef.current
    if (countsAsIntroGame({ endKind, playerMoves })) {
      intro.record(gameLocalIdRef.current)
      setIntroOutcome({ counted: true, after: Math.min(INTRO_GAMES, intro.completed + 1) })
    } else {
      setIntroOutcome({ counted: false, after: intro.completed, reason: `This game did not count: you ended it before making ${MIN_PLAYER_MOVES_TO_END_EARLY} moves of your own. A finished game, or a resignation after ${MIN_PLAYER_MOVES_TO_END_EARLY} of your moves, counts.` })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires once per finished game (guarded by the ref)
  }, [showGameComplete])

  const terminationText = endReason === 'resigned' ? 'Resignation' : endReason === 'draw-agreed' ? 'Agreement' : isCheckmate ? 'Checkmate' : 'Draw'

  const resultCopy = (() => {
    switch (outcome) {
      case 'player-win':
        return {
          headline: 'You win',
          sub: activeTierId === 'master' ? 'A difficult game, well played.' : 'Well played.',
          detail: `You defeated ${opponentName} on ${tierConfig.label}`,
          celebrate: true,
        }
      case 'engine-win':
        return { headline: `${opponentName} wins`, sub: 'Good effort. Want to review it together?', detail: '', celebrate: false }
      case 'player-resigned':
        return { headline: `${opponentName} wins`, sub: 'You resigned. Good effort. Want to review it together?', detail: '', celebrate: false }
      case 'draw':
        return { headline: 'Draw', sub: drawReasonText.replace(/^Draw( —)?\s*/, '') || 'Draw', detail: '', celebrate: false }
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
          <span className={styles.statValue}>{gradedMoveCount === 0 ? '—' : `${accuracy}%`}</span>
          <span className={styles.statLabel}>Your accuracy</span>
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
      {introGame !== null && introOutcome && (
        <p className={styles.resultHint} data-testid="intro-progress" data-counted={introOutcome.counted ? 'true' : 'false'} role="status">
          {!introOutcome.counted
            ? introOutcome.reason
            : introOutcome.after >= INTRO_GAMES
              ? 'Your coach introduction is complete. You can now choose any opponent.'
              : `Coach introduction: game ${introOutcome.after} of ${INTRO_GAMES} complete.`}
        </p>
      )}
      <p className={styles.resultHint} data-testid="result-owner">
        These figures are for your moves only.
      </p>
      {summaryProvisional && (
        <p className={styles.resultHint} data-testid="result-provisional" data-state={summaryInProgress ? 'in-progress' : 'partial'}>
          {summaryInProgress
            ? `Analysis in progress — ${gradedMoveCount} of ${humanMoveCount} moves reviewed.`
            : `Partial summary — based on ${gradedMoveCount} of ${humanMoveCount} moves.`}
        </p>
      )}
      <NivenxaNoticed entries={playerQualityEntries} tone={tierConfig.tone} onAnalyze={handleAnalyzeGame} />
      {/* Two different jobs: notes right here (explanations of each move) vs the Analysis board with engine lines. */}
      <button type="button" className={styles.resultPrimaryBtn} onClick={handleReviewGameToggle} aria-describedby="review-hint" data-testid="review-with-explanations">
        {reviewOpen ? 'Hide review' : 'Review with explanations'}
      </button>
      <p id="review-hint" className={styles.resultHint}>
        Move-by-move notes on this page.
      </p>
      <div className={styles.resultActions}>
        <button type="button" className={styles.controlBtn} onClick={handlePlayAgain}>
          Rematch
        </button>
        <button type="button" className={styles.controlBtn} onClick={handleNewGame}>
          New Game
        </button>
      </div>
      <button type="button" className={styles.reviewLinkBtn} onClick={handleAnalyzeGame} aria-describedby="analysis-hint">
        Open full analysis →
      </button>
      <p id="analysis-hint" className={styles.resultHint}>
        The Analysis board, with engine lines.
      </p>
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

  // Shown in the Insight tab before any move has been played — Beginner gets a concrete starting suggestion, everyone else
  // (who reaches the live tab at all) gets a short standing objective instead of a lesson.
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
    <main className={styles.page} data-full-viewport>
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

              {AVATAR_PROTOTYPE && (
                <>
                  <p className={styles.setupSectionTitle}>Opponent</p>
                  <BotPicker notice={introNotice} tier={draftTier} completedIntro={intro.completed} selected={draftBot} onSelect={chooseBot} browserOnly={intro.browserOnly} signedIn={chessSession.signedIn} />
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

              <button type="button" className={styles.startGameBtn} onClick={handleStartGame} disabled={AVATAR_PROTOTYPE && draftTier === 'beginner' && !intro.ready}>
                Start Game
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.playColumn}>
            <div className={styles.topRow}>
              <h1 className={styles.heading}>Play</h1>
              {AVATAR_PROTOTYPE && introGame !== null && (
                <span className={styles.metaText} data-testid="coach-intro-label">
                  {introLabel(introGame - 1)}
                </span>
              )}
              <span className={styles.metaText} data-testid="game-meta">
                {tierConfig.label}
                {strengthSteps(activeTierId) > 1 ? ` · Strength ${activeStrength}/${strengthSteps(activeTierId)}` : ''}
                {activePreset ? ` · ${activePreset.label}` : ''}
                {` · `}
                <span data-testid="assistance-label">{assistanceLabel(explanationMode)}</span>
              </span>
              {/* Announced once when check starts or ends; "thinking" updates are not announced. */}
              <span className={styles.srOnly} role="status">
                {statusIsCheck ? statusText : ''}
              </span>
            </div>

            <div className={styles.playRow}>
              <div className={styles.boardCol}>
                <div className={styles.boardStack}>
                  {orientationColor === humanColor ? renderEngineRow() : humanRow}

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
                      lastMove={reviewEntry ? undefined : lastMove}
                      extraArrows={activeMarks ? [{ from: activeMarks.from, to: activeMarks.to, brush: 'red' }] : undefined}
                      check={shownCheck ? (shownCheck.side === 'w' ? 'white' : 'black') : false}
                      onMove={handlePlayerMove}
                    />
                    {showGameComplete && resultCopy.celebrate && (
                      <span className={styles.mateSweep} aria-hidden="true" />
                    )}
                  </div>

                  {orientationColor === humanColor ? humanRow : renderEngineRow()}
                </div>

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
                          disabled={history.length === 0}
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
                      {AVATAR_PROTOTYPE && (
                        <div className={styles.moreMenuWrap} ref={settingsRef}>
                          <button
                            type="button"
                            className={styles.controlBtn}
                            aria-expanded={settingsOpen}
                            aria-haspopup="true"
                            onClick={() => setSettingsOpen((o) => !o)}
                            data-testid="game-settings"
                          >
                            Settings
                          </button>
                          {settingsOpen && (
                            <div className={styles.settingsPop} role="group" aria-label="Game settings">
                              <div className={styles.settingRow}>
                                <span id="animations-label" className={styles.settingLabel}>
                                  Animations
                                </span>
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={avatarSettings.animate}
                                  aria-labelledby="animations-label"
                                  aria-describedby="animations-note"
                                  disabled={avatarSettings.reduced}
                                  className={`${styles.switchTrack} ${avatarSettings.animate ? styles.switchOn : ''}`}
                                  onClick={() => avatarSettings.setPref(!avatarSettings.pref)}
                                  data-testid="animations-switch"
                                >
                                  <span className={styles.switchKnob} aria-hidden="true" />
                                </button>
                              </div>
                              {evidenceEnabled() && (
                                <button type="button" className={styles.controlBtn} onClick={downloadEvidence} data-testid="download-review-evidence">
                                  Download review evidence (test builds)
                                </button>
                              )}
                              <p id="animations-note" className={styles.settingNote}>
                                {avatarSettings.reduced
                                  ? 'Your device asks for reduced motion, so animations stay off.'
                                  : activeBot.animated
                                    ? `Moves ${opponentName}'s face. Expressions and captions stay either way.`
                                    : `${opponentName} uses still artwork, so there is nothing to animate. Captions stay either way.`}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
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
                  </>
                )}

                {!showGameComplete && (
                  <>
                    <div className={`${styles.controls} ${styles.controlsSecondary}`} aria-label="Game actions" role="group">
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
                        className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                        onClick={handleResignClick}
                        disabled={!playerHasMoved}
                        title={resignHint}
                      >
                        Resign
                      </button>
                    </div>
                    {drawOfferState === 'pending' && <p className={styles.drawBanner}>Draw offered…</p>}
                    {drawOfferState === 'accepted' && <p className={styles.drawBanner}>{opponentName} accepts the draw.</p>}
                    {drawOfferState === 'declined' && <p className={styles.drawBanner}>{opponentName} wants to keep playing.</p>}
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
                        <InsightPanel
                          key={gameKey}
                          tier={activeTierId}
                          check={
                            !reviewing && liveCheck
                              ? {
                                  key: fen,
                                  text: describeCheck(liveCheck, liveCheck.side === humanColor, opponentName),
                                  options: liveCheck.side === humanColor ? replyOptions(liveCheck) : null,
                                  checkmate: liveCheck.checkmate,
                                }
                              : null
                          }
                          entries={analysisEntries}
                          history={history}
                          humanColor={humanColor}
                          opponentName={opponentName}
                          welcome={firstMoveGuidance}
                          reviewEntry={reviewing ? reviewEntry : undefined}
                          onBackToMoves={handleBackToMoves}
                          liveFen={fen}
                          marked={activeMarks ? activeMarks.ply : null}
                          onMark={(entry) => {
                            const [from, to] = (entry.highlights ?? []) as Key[]
                            if (!from || !to) return
                            if (activeMarks?.ply === entry.ply) return setMarks(null) // drawn right now: hide it
                            setMarks({ ply: entry.ply, fen: entry.fenAfter, from, to })
                            if (positionKey(fen) !== positionKey(entry.fenAfter)) {
                              setSelectedPly(entry.ply) // explicit review of that earlier position; the way back is the review's own control
                              setPanelTab('insight')
                            }
                          }}
                          onShowPosition={(entry) => {
                            setSelectedPly(entry.ply)
                            setPanelTab('insight')
                          }}
                        />
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

                {/* One summary at a time: while the announcement is open it IS the summary; the panel shows the same content once it is dismissed. */}
                {showGameComplete && !showResultOverlay && <div className={styles.resultPanel}>{resultBody}</div>}
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
                      ? `The game will end and ${opponentName} will win.`
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
        <section className={styles.review} ref={reviewSectionRef}>
          <div className={styles.reviewInner}>
            <h2 className={styles.reviewTitle}>Game Review</h2>
            <ol className={styles.reviewList}>
              {analysisEntries.map((entry) => (
                <li key={entry.ply} className={styles.reviewRow}>
                  <span className={styles.reviewPly}>{moveNumberLabel(entry.ply, entry.color)}</span>
                  <span className={styles.reviewMover}>{entry.color === humanColor ? 'You' : opponentName}</span>
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
                      <ExplanationBody entry={localizeEntry(entry, opponentName)} />
                    </div>
                  )}
                  {entry.explanationStatus === 'error' && (
                    <span className={styles.reviewError}>Explanation unavailable right now.</span>
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
