'use client'
import { useEffect, useRef, useState } from 'react'
import { BRIEF_REACTION_MS, captionFor, captionStillValid, createReactionTracker, positionKey, resolveAvatarState, resultState } from '@/lib/chess/avatarReaction'
import type { AvatarState, GameOutcome } from '@/lib/chess/avatarReaction'
import { mistakeReason } from '@/lib/chess/mistakeReason'
import type { ExplanationMode, SkillTier } from '@/lib/chess/skillTiers'
import type { MoveAnalysisEntry } from '@/lib/chess/types'
import type { Bot } from '@/lib/chess/botRoster'
import TivviAvatar from './TivviAvatar'
import BotArt from './BotArt'
import styles from './OpponentAvatar.module.scss'

interface Props {
  /** The selected opponent. Only Tivvi has approved layered animation; every other character is flat artwork (no face substitution). */
  bot: Bot
  tier: SkillTier
  mode: ExplanationMode
  humanColor: 'w' | 'b'
  /** "Black" / "White": the side TIVVI plays. */
  sideLabel: string
  history: readonly string[]
  /** The live position: a reaction caption is shown only while the position it describes is on the board. */
  fen: string
  /** The grades the game ALREADY produces (useMoveAnalysis). Read-only: the avatar never starts analysis. */
  entries: readonly MoveAnalysisEntry[]
  /** Real engine activity (the page's own engineThinking state), not a timer. */
  engineThinking: boolean
  gameComplete: boolean
  outcome: GameOutcome
  /** Animations switch (game settings) AND the OS reduced-motion preference. */
  animate: boolean
  /** Test hook: hide the character entirely (no-avatar baseline for measurements). */
  hidden: boolean
}

export default function OpponentAvatar({ bot, tier, mode, humanColor, sideLabel, history, fen, entries, engineThinking, gameComplete, outcome, animate, hidden }: Props) {
  const tracker = useRef(createReactionTracker())
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // The page remounts this component (key=gameKey) for every game, so all state below starts fresh and in-flight results from a previous game can never land here.
  const [reaction, setReaction] = useState<AvatarState | null>('selected') // one brief greeting at the start of a game
  // The caption and the position/ply it describes. Stale captions are removed, never left up as current advice.
  const [note, setNote] = useState<{ text: string; fen: string | null; ply: number } | null>({ text: captionFor('selected', null, bot.name), fen: null, ply: 0 })
  const lastLen = useRef(0)

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }
  const react = (state: AvatarState, text: string | null, forFen: string, forPly: number) => {
    clearTimer()
    setReaction(state)
    // The caption outlives the pose (the face returns to idle after BRIEF_REACTION_MS) but only while its position is on the board.
    setNote(text ? { text, fen: forFen, ply: forPly } : null)
    timer.current = setTimeout(() => setReaction(null), BRIEF_REACTION_MS)
  }
  useEffect(() => {
    tracker.current.startGame()
    timer.current = setTimeout(() => setReaction(null), BRIEF_REACTION_MS) // end of the greeting pose
    return clearTimer
  }, [])

  // Move list changed. Any move makes the current caption stale (it described the previous position), so it is cleared; undo also
  // drops any in-flight pose. Late grades arriving afterwards update their history entry only and never replay a reaction.
  useEffect(() => {
    const shrank = tracker.current.onHistory(history.length)
    if (history.length !== lastLen.current) {
      lastLen.current = history.length
      setNote(null)
      if (shrank) {
        clearTimer()
        setReaction(null)
      }
    }
  }, [history.length])

  // Confirmed grades only (never starts analysis). Stale results (undo/restart/moved on) are ignored by the tracker, and each
  // move reacts at most once. The explanation is only specific when the position proves it; otherwise the wording is neutral.
  useEffect(() => {
    if (gameComplete) return
    const hit = tracker.current.consider(entries, { humanColor, history, tier, mode, complete: gameComplete })
    // Only while the graded move's resulting position is STILL the live one. If the opponent has already replied the advice is moot
    // (the grade and explanation remain on that move in the Insight history), and nothing is replayed.
    if (hit && positionKey(hit.entry.fenAfter) === positionKey(fen)) {
      react('concern', captionFor('concern', mistakeReason(hit.entry.fenBefore, hit.entry.fenAfter), bot.name), hit.entry.fenAfter, history.length)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, history, fen, gameComplete, humanColor, tier, mode])

  if (hidden) return <span className={styles.name}>{bot.name} · {sideLabel}</span>

  const resultPose = gameComplete ? resultState(outcome) : null
  const state = resolveAvatarState({ resultPose, reaction, engineThinking })
  const noteValid = !!note && captionStillValid(note.fen, fen, note.ply, history.length)
  const caption = resultPose ? captionFor(resultPose, null, bot.name) : noteValid ? note!.text : ''
  const size = typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches ? 48 : 64

  return (
    <div className={styles.wrap} data-testid="opponent-header">
      <div className={styles.disc}>
        {bot.animated ? (
          <TivviAvatar state={state} size={size} animate={animate} label={`${bot.name}, ${state === 'idle' ? 'relaxed' : state}`} />
        ) : (
          <BotArt id={bot.id} name={bot.name} size={size} />
        )}
      </div>
      <div className={styles.text}>
        <span className={styles.name} data-testid="opponent-name">
          {bot.name} · {sideLabel}
        </span>
        <span className={styles.sub} data-testid="opponent-sub">
          {bot.role}
        </span>
        {/* Fixed-height box (one line on desktop, two on phones): a caption appearing, changing or clearing never moves the board or controls. */}
        <span className={styles.captionBox}>
          {/* Reaction caption (announced politely, once per change). "<name> is thinking…" lives in the status chip, never repeated here. */}
          <span className={styles.caption} role="status" data-testid="avatar-caption" title={caption || undefined}>
            {caption}
          </span>
        </span>
      </div>
    </div>
  )
}
