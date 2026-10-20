'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Chess } from 'chess.js'
import type { Key } from 'chessground/types'
import Board from '@/components/chess/Board'
import { PIECE_NAME, attackedPiecesFrom, findKingSquare, pieceBehindAlongLine } from './moveSquares'
import { hintTierFor, HINT_TIER_COUNT } from './feedbackCopy'
import { useLessonVoice, type VoiceCommand } from './useLessonVoice'
import VoiceControls, { VoiceStatusLine } from './VoiceControls'
import styles from './TacticPuzzleSet.module.scss'

const EMPTY_DESTS = new Map<Key, Key[]>()
// Beat before a wrong attempt snaps back — matches PracticePanel's own
// timing. A correct answer no longer auto-advances (see Next-puzzle button
// below) — the learner decides when they're ready to move on.
const REVERT_DELAY = 700
// How long a Show Me demonstration plays before resetting back to let the
// learner try it themselves.
const DEMO_DELAY = 1200
const CELEBRATE_DURATION = 1300

// `{yourPiece}`/`{capturedPiece}` tokens in a tactic's own wrongText/
// correctText get filled in from the actual move played — a no-op for any
// tactic whose copy has no tokens, so this is safe to always apply.
function fillTemplate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? '')
}

// "Try using your rook" isn't much of a hint when the rook is the only
// attacking piece on the board — naming how it moves, not just what it is,
// gives the learner something to actually look for.
const MOVEMENT_HINT: Record<string, string> = {
  p: 'Look at the squares just ahead of your pawn.',
  n: "Look for your knight's L-shaped jump.",
  b: 'Look along the diagonals from your bishop.',
  r: "Look along your rook's row and column.",
  q: "Look along your queen's row, column, and diagonals.",
  k: 'Look at the squares right next to your king.',
}

export interface TacticPuzzleConfig {
  fen: string
  correctFrom: string
  correctTo: string
  /** Shown instead of the shared `prompt` when this puzzle's own goal differs from the others. */
  objective?: string
  /**
   * Accepts ANY legal move satisfying this property, not just the one
   * authored at `correctFrom`/`correctTo` — "give check" has many right
   * answers, so only matching one exact square was always too strict for
   * tactics like this. `correctFrom`/`correctTo` still serve as the
   * demonstrated move for Hint/Show Me. Omitted (every other tactic) keeps
   * today's exact-match behavior unchanged.
   */
  acceptAnyMoveThat?:
    | 'givesCheck'
    | 'createsFork'
    | 'skewers'
    | 'createsDoubleAttack'
    | 'capturesHangingPiece'
    | 'deliversCheckmate'
    | 'givesDoubleCheck'
}

export interface TacticPuzzleSetExample {
  /** Exactly 3, in order. */
  puzzles: TacticPuzzleConfig[]
  /** Shown at rest, e.g. "Can you find the fork?" — same across all 3 puzzles. */
  prompt: string
  /** Tier-1 wrong-attempt text, e.g. "Not quite. Look for a move that attacks two pieces." */
  wrongText: string
  /** What the correct move demonstrated, e.g. "Your knight attacks two pieces." (no "That's it!" prefix — added by the component). */
  correctText: string
  completionSummary?: string[]
}

type AttemptState = 'idle' | 'correct' | 'reverting' | 'demonstrating'

// How the correct-move praise is framed, by how much help was actually used
// this puzzle — not one fixed "That's it!" regardless of whether a hint or
// Show Me was needed first. `correctText` itself stays whatever the tactic
// authored; only the wrapper around it changes.
function tieredCorrectText(correctText: string, hintTier: number): string {
  if (hintTier >= 3) return `${correctText} Let's try the next one together.`
  if (hintTier >= 2) return `You found it with a hint. ${correctText}`
  return `That's it! ${correctText}`
}

export default function TacticPuzzleSet({
  example,
  nextCta,
}: {
  example: TacticPuzzleSetExample
  nextCta?: { href: string; label: string }
}) {
  const { puzzles, prompt, wrongText, correctText, completionSummary } = example
  const [puzzleIndex, setPuzzleIndex] = useState(0)
  const puzzle = puzzles[puzzleIndex]
  // A puzzle's own goal, when it differs from the rest (Attack & Capture
  // mixes capture puzzles with attack-only ones) — falls back to the
  // tactic-wide prompt, unchanged for every other tactic's puzzles.
  const puzzlePrompt = puzzle.objective ?? prompt

  // Set once a move is judged correct (exact-match or, for an open-ended
  // puzzle, via `acceptAnyMoveThat`) — every feedback computation below
  // reads `effectiveFrom`/`effectiveTo` instead of `puzzle.correctFrom`/
  // `puzzle.correctTo` directly, so a learner who solves an open puzzle
  // with a genuinely different legal move gets feedback describing THAT
  // move, not the one originally authored. Before a puzzle is solved (and
  // for every exact-match puzzle, where the two are always identical
  // anyway) this is simply `null`, and everything falls back to the
  // authored move exactly as before.
  const [solvedMove, setSolvedMove] = useState<{ from: string; to: string } | null>(null)
  const effectiveFrom = solvedMove?.from ?? puzzle.correctFrom
  const effectiveTo = solvedMove?.to ?? puzzle.correctTo

  // The following are pure, puzzle-derived computations (no component
  // state involved beyond `solvedMove` above) — deliberately placed before
  // any other state/effects below, since the very first effect needs
  // `resolvedPuzzlePrompt` already resolved (speaking it the moment a
  // puzzle mounts).
  const pieceName = useMemo(() => {
    const piece = new Chess(puzzle.fen).get(effectiveFrom as Parameters<Chess['get']>[0])
    return piece ? PIECE_NAME[piece.type] : 'piece'
  }, [puzzle.fen, effectiveFrom])

  const pieceType = useMemo(() => {
    const piece = new Chess(puzzle.fen).get(effectiveFrom as Parameters<Chess['get']>[0])
    return piece?.type
  }, [puzzle.fen, effectiveFrom])

  // The piece actually being captured — puzzles within one tactic don't
  // always capture the same kind of piece (Hanging Pieces' 4 puzzles win a
  // knight, a rook, a bishop, and a knight), so this feeds `correctText`'s
  // `{capturedPiece}` token instead of a tactic guessing one fixed name.
  const capturedPieceName = useMemo(() => {
    const piece = new Chess(puzzle.fen).get(effectiveTo as Parameters<Chess['get']>[0])
    return piece ? PIECE_NAME[piece.type] : 'piece'
  }, [puzzle.fen, effectiveTo])

  // Tells a capture puzzle from an attack-only one (Attack & Capture mixes
  // both) and names the actually-threatened piece/square either way — for
  // an attack, `correctTo` is empty, so the threatened piece sits elsewhere,
  // found by placing the mover there (via chess.js's board-editing `remove`/
  // `put`, which leaves whose turn it is alone) and asking what it could
  // now capture. King captures are filtered out — a plain attack on the
  // opponent's king would otherwise show up as "attacking the king", which
  // is just check under another name, not what this tactic teaches.
  const attackTarget = useMemo((): { name: string; square: string } => {
    const wasCapture = !!new Chess(puzzle.fen).get(effectiveTo as Parameters<Chess['get']>[0])
    if (wasCapture) return { name: capturedPieceName, square: effectiveTo }
    const chess = new Chess(puzzle.fen)
    const movingPiece = chess.get(effectiveFrom as Parameters<Chess['get']>[0])
    if (!movingPiece) return { name: 'piece', square: effectiveTo }
    chess.remove(effectiveFrom as Parameters<Chess['get']>[0])
    chess.put(movingPiece, effectiveTo as Parameters<Chess['get']>[0])
    const capture = chess
      .moves({ square: effectiveTo as Parameters<Chess['get']>[0], verbose: true })
      .find((m) => m.captured && m.captured !== 'k')
    return capture ? { name: PIECE_NAME[capture.captured!] ?? 'piece', square: capture.to } : { name: 'piece', square: effectiveTo }
  }, [puzzle.fen, effectiveFrom, effectiveTo, capturedPieceName])

  const wasCapture = !!new Chess(puzzle.fen).get(effectiveTo as Parameters<Chess['get']>[0])

  // For a pin: after the capture, which of MY OTHER pieces is what actually
  // stops the king from recapturing — "the king cannot take your rook
  // because your bishop protects it" needs to name that bishop, not assert
  // it generically. `chess.attackers(square, color)` (chess.js 1.x) lists
  // exactly the squares of `color`'s pieces attacking `square`; the piece
  // that just moved is now sitting ON that square, not attacking it from
  // elsewhere, so it never shows up here — only a genuine second defender
  // (the pinning piece) does.
  const protectingPieceName = useMemo(() => {
    const chess = new Chess(puzzle.fen)
    const result = chess.move({ from: effectiveFrom, to: effectiveTo, promotion: 'q' })
    if (!result) return 'piece'
    const defenderSquares = chess.attackers(effectiveTo as Parameters<Chess['get']>[0], result.color)
    const defender = defenderSquares[0] ? chess.get(defenderSquares[0]) : undefined
    return defender ? PIECE_NAME[defender.type] ?? 'piece' : 'piece'
  }, [puzzle.fen, effectiveFrom, effectiveTo])

  // Whether the correct move actually delivers check — almost every
  // position has a king somewhere, so merely finding one isn't enough to
  // know this is a "check" puzzle (Hanging Pieces' and Attack & Capture's
  // own kings would otherwise get dragged into their highlight/description
  // for no reason). Verified by actually playing the move.
  const givesCheck = useMemo(() => {
    const chess = new Chess(puzzle.fen)
    const result = chess.move({ from: effectiveFrom, to: effectiveTo, promotion: 'q' })
    return result ? chess.inCheck() : false
  }, [puzzle.fen, effectiveFrom, effectiveTo])

  // The opponent king's square — only meaningful (and only computed for)
  // check puzzles; `attackDescription`/`attackVisual` both gate on
  // `givesCheck` before ever reading this.
  const kingSquare = useMemo(() => {
    if (!givesCheck) return undefined
    const chess = new Chess(puzzle.fen)
    const opponentColor = chess.turn() === 'w' ? 'b' : 'w'
    return findKingSquare(puzzle.fen, opponentColor)
  }, [puzzle.fen, givesCheck])

  // Which line the move actually attacks along — "Check! Your rook attacks
  // the king along this row" needs to know whether it's really the row, the
  // column, or (bishop/queen) a diagonal; a knight has no line at all, so
  // it names the square it jumped to instead. Falls back to the plain
  // "here" for any non-check tactic, where `{attackDescription}` never
  // even appears in that tactic's own copy.
  const attackDescription = useMemo(() => {
    if (!pieceType || !kingSquare) return 'here'
    if (pieceType === 'n') return `from ${effectiveTo}`
    const sameFile = effectiveTo[0] === kingSquare[0]
    const sameRank = effectiveTo[1] === kingSquare[1]
    if (pieceType === 'r') return sameFile ? 'along this column' : 'along this row'
    if (pieceType === 'b') return 'along this diagonal'
    if (pieceType === 'q') return sameFile ? 'along this column' : sameRank ? 'along this row' : 'along this diagonal'
    return 'here'
  }, [pieceType, effectiveTo, kingSquare])

  // Skewers only: whichever enemy piece sits behind the now-checked king,
  // along the checking piece's own line — feeds `correctText`'s
  // `{behindPiece}` token so the feedback names the actual piece won, not
  // a vague "what's behind it". `undefined` (and the token left blank) for
  // any tactic that isn't a skewer.
  const behindPieceName = useMemo(() => {
    if (!kingSquare) return undefined
    const chess = new Chess(puzzle.fen)
    const result = chess.move({ from: effectiveFrom, to: effectiveTo, promotion: 'q' })
    if (!result) return undefined
    const behind = pieceBehindAlongLine(chess.fen(), effectiveTo, kingSquare)
    return behind ? PIECE_NAME[behind.type] ?? 'piece' : undefined
  }, [puzzle.fen, effectiveFrom, effectiveTo, kingSquare])

  // The visual confirmation of *why* a move worked (or, at Hint tier 2+, a
  // preview of it) — a straight line really is the attack for a rook/
  // bishop/queen, so an arrow from the destination to the king communicates
  // it directly; a knight's attack is explicitly NOT a straight line, so it
  // only gets both squares lit, never a connecting arrow (drawing one would
  // visually claim a diagonal slide that isn't real). Falls back to just
  // the destination square for anything that isn't a check at all (Hanging
  // Pieces, Attack & Capture) — same as the single-square highlight this
  // replaces.
  const attackVisual = useMemo((): { squares: Key[]; arrow?: Key[] } => {
    const to = effectiveTo as Key
    if (!kingSquare) return { squares: [to] }
    const king = kingSquare as Key
    if (pieceType === 'r' || pieceType === 'b' || pieceType === 'q') return { squares: [to, king], arrow: [to, king] }
    return { squares: [to, king] }
  }, [effectiveTo, kingSquare, pieceType])

  const templateVars = {
    yourPiece: pieceName,
    capturedPiece: capturedPieceName,
    square: effectiveTo,
    attackDescription,
    captureOrAttack: wasCapture ? 'captured' : 'now attacks',
    targetPiece: attackTarget.name,
    targetSquare: attackTarget.square,
    protectingPiece: protectingPieceName,
    behindPiece: behindPieceName ?? 'piece',
  }
  const resolvedWrongText = fillTemplate(wrongText, templateVars)
  const resolvedCorrectText = fillTemplate(correctText, templateVars)
  // `objective`/`prompt` can use the same tokens (e.g. "Capture the pinned
  // {capturedPiece}." resolving per-puzzle) without a tactic needing to
  // author one literal string per puzzle.
  const resolvedPuzzlePrompt = fillTemplate(puzzlePrompt, templateVars)

  const [displayFen, setDisplayFen] = useState(puzzle.fen)
  const [attemptState, setAttemptState] = useState<AttemptState>('idle')
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [lastMove, setLastMove] = useState<Key[] | undefined>(undefined)
  const [allDone, setAllDone] = useState(false)
  const [showModal, setShowModal] = useState(false)
  // Set by a manual Hint/Show Me request (click or voice command) — kept
  // separate from wrongAttempts-driven escalation (never regresses it, see
  // `hintTier` below) so asking for a hint doesn't erase progress a wrong
  // attempt already made toward one.
  const [forcedHintTier, setForcedHintTier] = useState<number | null>(null)
  // Skewers only: a legal move that gives check but doesn't skewer anything
  // gets an encouraging redirect instead of the tactic's plain wrongText —
  // set alongside `attemptState: 'reverting'`, read by `promptLines` below,
  // cleared by `clearWrongState` same as every other per-attempt flag.
  const [partialFeedback, setPartialFeedback] = useState<string | null>(null)
  const revertTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const voice = useLessonVoice()

  // No separate Start gate here — this component is only ever mounted as
  // the direct result of Learn mode's own "Your Turn →" click one component
  // up (TacticDetail.tsx's mode state starts at 'learn' and only flips via
  // that click), so that click is already the user gesture autoplay needs.
  // A second "Ready to begin?" screen here was pure redundancy.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `puzzle` is derived from puzzleIndex; re-running on puzzle identity would be redundant.
  useEffect(() => {
    if (revertTimer.current) clearTimeout(revertTimer.current)
    voice.cancel()
    setDisplayFen(puzzle.fen)
    setAttemptState('idle')
    setWrongAttempts(0)
    setLastMove(undefined)
    setForcedHintTier(null)
    setSolvedMove(null)
    setPartialFeedback(null)
    if (!voice.muted) voice.speak(resolvedPuzzlePrompt)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `voice`/`prompt` deliberately excluded: this must run once per puzzleIndex change only, reading whichever is current at that moment.
  }, [puzzleIndex])

  useEffect(
    () => () => {
      if (revertTimer.current) clearTimeout(revertTimer.current)
    },
    []
  )

  useEffect(() => {
    if (!allDone) {
      setShowModal(false)
      return
    }
    const timer = setTimeout(() => setShowModal(true), CELEBRATE_DURATION)
    return () => clearTimeout(timer)
  }, [allDone])

  // Speaks the completion recap the moment the modal actually shows it —
  // not earlier, during the celebration animation.
  useEffect(() => {
    if (!showModal || voice.muted) return
    voice.speak(['Great practice!', ...(completionSummary ?? [])].join('. '))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately keyed only on showModal; completionSummary/voice are static per tactic instance.
  }, [showModal])

  const dests = useMemo(() => {
    if (attemptState !== 'idle') return EMPTY_DESTS
    const chess = new Chess(puzzle.fen)
    const map = new Map<Key, Key[]>()
    for (const move of chess.moves({ verbose: true })) {
      const arr = map.get(move.from as Key) ?? []
      arr.push(move.to as Key)
      map.set(move.from as Key, arr)
    }
    return map
  }, [puzzle.fen, attemptState])

  // Shared by the wrong-attempt auto-revert timeout, the Show Me
  // demonstration's reset, AND the voice "try again" command — a spoken
  // "try again" just fires this early instead of waiting out REVERT_DELAY.
  function clearWrongState() {
    if (revertTimer.current) clearTimeout(revertTimer.current)
    setDisplayFen(puzzle.fen)
    setAttemptState('idle')
    setLastMove(undefined)
    setPartialFeedback(null)
  }

  function advancePuzzle() {
    if (puzzleIndex === puzzles.length - 1) setAllDone(true)
    else setPuzzleIndex((i) => i + 1)
  }

  // Whether `from`/`to` (already known legal — chessground's own `dests`
  // restriction never offers an illegal destination in the first place)
  // satisfies this puzzle's objective. Exact-match for every tactic that
  // doesn't set `acceptAnyMoveThat` — unchanged from before this existed.
  function satisfiesObjective(chessAfterMove: Chess, from: string, to: string, wasCaptureMove: boolean): boolean {
    switch (puzzle.acceptAnyMoveThat) {
      case 'givesCheck':
        return chessAfterMove.inCheck()
      case 'createsFork':
      case 'createsDoubleAttack':
        // A fork and a double attack are the same mechanism here — one
        // piece now attacking 2+ enemy pieces — so both reuse this check.
        return attackedPiecesFrom(chessAfterMove.fen(), to).length >= 2
      case 'skewers':
        return isGenuineSkewer(chessAfterMove, to)
      case 'capturesHangingPiece':
        // The actual definition of "hanging": a capture that can't be
        // recaptured — not just the one authored square. Also reused by
        // Pins, where the pinning piece and the piece it pins can both
        // often capture safely on the same square.
        return wasCaptureMove && chessAfterMove.attackers(to as Parameters<Chess['get']>[0], chessAfterMove.turn()).length === 0
      case 'deliversCheckmate':
        return chessAfterMove.isCheckmate()
      case 'givesDoubleCheck':
        return isGenuineDoubleCheck(chessAfterMove)
      default:
        return from === puzzle.correctFrom && to === puzzle.correctTo
    }
  }

  // A skewer needs the check AND a real piece lined up behind the king on
  // the checking piece's own line — `pieceBehindAlongLine` is geometry, not
  // an attack query, because the king still blocks the checking piece's own
  // vision past it (see moveSquares.ts).
  function isGenuineSkewer(chessAfterMove: Chess, to: string): boolean {
    if (!chessAfterMove.inCheck()) return false
    const defendingColor = chessAfterMove.turn()
    const kingSq = findKingSquare(chessAfterMove.fen(), defendingColor)
    if (!kingSq) return false
    const behind = pieceBehindAlongLine(chessAfterMove.fen(), to, kingSq)
    return !!behind && behind.color !== defendingColor
  }

  // A double check needs 2+ attackers on the king at once — a single check
  // (even from a move that looks similar) doesn't count.
  function isGenuineDoubleCheck(chessAfterMove: Chess): boolean {
    if (!chessAfterMove.inCheck()) return false
    const defendingColor = chessAfterMove.turn()
    const attackingColor = defendingColor === 'w' ? 'b' : 'w'
    const kingSq = findKingSquare(chessAfterMove.fen(), defendingColor)
    if (!kingSq) return false
    return chessAfterMove.attackers(kingSq as Parameters<Chess['get']>[0], attackingColor).length >= 2
  }

  // The "right idea, not finished yet" case — a fully legal, on-topic move
  // that's closer than a plain wrong answer deserves its own encouraging
  // redirect toward the actual objective, not "wrong". Each open-ended mode
  // that has a natural intermediate state gets one; everything else (plain
  // exact-match, or a mode with no clean "closer" description) falls
  // through to the ordinary wrongText.
  function partialCreditMessage(chessAfterMove: Chess, to: string, wasCaptureMove: boolean): string | undefined {
    switch (puzzle.acceptAnyMoveThat) {
      case 'skewers': {
        if (!chessAfterMove.inCheck()) return undefined
        const defendingColor = chessAfterMove.turn()
        const kingSq = findKingSquare(chessAfterMove.fen(), defendingColor)
        const behind = kingSq ? pieceBehindAlongLine(chessAfterMove.fen(), to, kingSq) : undefined
        const behindName = behind ? PIECE_NAME[behind.type] ?? 'piece' : 'piece'
        return `Yes, that gives check! Now look for a check that also helps you win the ${behindName} behind it.`
      }
      case 'givesDoubleCheck':
        if (!chessAfterMove.inCheck()) return undefined
        return 'Yes, that gives check! Now look for a move that checks with two pieces at the same time.'
      case 'deliversCheckmate':
        if (!chessAfterMove.inCheck()) return undefined
        return "Yes, that's check! But the king can still escape — look for a check it can't get away from."
      case 'capturesHangingPiece':
        if (!wasCaptureMove) return undefined
        return "That piece can be captured back — look for one that's truly undefended."
      default:
        return undefined
    }
  }

  function handleMove(from: Key, to: Key) {
    if (attemptState !== 'idle') return
    const chess = new Chess(puzzle.fen)
    const result = chess.move({ from, to, promotion: 'q' })
    if (!result) return
    setLastMove([from, to])
    setDisplayFen(chess.fen())
    const wasCaptureMove = !!result.captured

    if (satisfiesObjective(chess, from, to, wasCaptureMove)) {
      setSolvedMove({ from, to })
      setAttemptState('correct')
      // Narration is spoken from a `[attemptState]`-keyed effect below, not
      // here — `resolvedCorrectText` in THIS render still reflects the
      // move before this one (solvedMove hasn't taken effect yet in this
      // same event), so speaking it synchronously here would describe the
      // wrong move for an open-ended puzzle solved via a different square
      // than the one authored.
      // No auto-advance timer — the solved board and praise stay on screen
      // until the learner taps Next puzzle (or says "next"), so they have
      // time to see what happened before the board changes.
      return
    }

    const partial = partialCreditMessage(chess, to, wasCaptureMove)
    if (partial) {
      setAttemptState('reverting')
      setPartialFeedback(partial)
      setWrongAttempts((n) => n + 1)
      if (!voice.muted) voice.speak(partial)
      revertTimer.current = setTimeout(clearWrongState, REVERT_DELAY)
      return
    }

    setAttemptState('reverting')
    setWrongAttempts((n) => n + 1)
    if (!voice.muted) voice.speak(resolvedWrongText)
    revertTimer.current = setTimeout(clearWrongState, REVERT_DELAY)
  }

  function handlePracticeAgain() {
    setPuzzleIndex(0)
    setAllDone(false)
    setShowModal(false)
  }

  // 1st wrong: text only. 2nd: the piece-name hint. 3rd+: hint plus the
  // piece highlighted. Math.max, not a replacement — a manual Hint/Show Me
  // request (forcedHintTier) never regresses the automatic
  // wrongAttempts-driven tier, and a later wrong attempt still climbs
  // normally even after a hint was already requested.
  const hintTier = Math.max(forcedHintTier ?? 0, hintTierFor(wrongAttempts))

  let promptLines: string[]
  if (allDone) {
    promptLines = ['Great practice!']
  } else if (attemptState === 'correct') {
    promptLines = [`✓ ${tieredCorrectText(resolvedCorrectText, hintTier)}`]
  } else if (attemptState === 'demonstrating') {
    promptLines = [`Watch — your ${pieceName} captures the ${capturedPieceName}.`, 'Now you try.']
  } else if (attemptState === 'reverting' && partialFeedback) {
    promptLines = [partialFeedback]
  } else if (hintTier === 0) {
    promptLines = [resolvedPuzzlePrompt]
  } else if (hintTier === 1) {
    promptLines = [resolvedWrongText]
  } else {
    promptLines = ['Need a hint?', (pieceType && MOVEMENT_HINT[pieceType]) || `Try using your ${pieceName}.`]
  }

  // Shown on a correct move (confirming why it worked) or from Hint tier 2
  // onward (previewing the same line as a stronger hint than naming the
  // piece alone) — otherwise just the plain correctFrom highlight tier 3
  // already used, dropped now that Show Me (tier 3) demonstrates the whole
  // move instead of just pointing at a square.
  const showAttackVisual = attemptState === 'correct' || (hintTier >= 2 && attemptState === 'idle')
  const highlightSquares = showAttackVisual ? [effectiveFrom as Key, ...attackVisual.squares] : undefined
  const hintArrow = showAttackVisual ? attackVisual.arrow : undefined
  const celebrating = allDone && !showModal

  function currentSpokenText(): string {
    return promptLines.join('. ')
  }

  // Speaks the success line once the render that actually reflects
  // `solvedMove` has committed — `resolvedCorrectText` here is guaranteed
  // to describe whichever move was just judged correct, exact-match or
  // open-ended, unlike speaking it synchronously inside handleMove (which
  // would still be reading the previous render's text).
  useEffect(() => {
    if (attemptState !== 'correct' || voice.muted) return
    voice.speak(tieredCorrectText(resolvedCorrectText, hintTier))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately keyed only on attemptState entering 'correct'; resolvedCorrectText/hintTier/voice read fresh via closure, same render that set solvedMove.
  }, [attemptState])

  function requestHint() {
    if (allDone) return
    if (attemptState === 'correct') {
      voice.speak('You already solved this — say or tap Next.')
      return
    }
    if (attemptState !== 'idle') return
    setForcedHintTier((t) => Math.min((t ?? hintTierFor(wrongAttempts)) + 1, HINT_TIER_COUNT - 1))
  }

  // Plays the correct move on the board, then resets back to `puzzle.fen`
  // after DEMO_DELAY — a demonstration, not an auto-solve: `attemptState`
  // never becomes 'correct' here, so this never counts as the puzzle being
  // solved, and the correct-square highlight (from forcedHintTier) is still
  // showing once it resets, so the learner's retry has that aid in place.
  function requestShowMe() {
    if (allDone) return
    if (attemptState === 'correct') {
      voice.speak('You already solved this — say or tap Next.')
      return
    }
    if (attemptState !== 'idle') return
    setForcedHintTier(HINT_TIER_COUNT - 1)
    setAttemptState('demonstrating')
    const chess = new Chess(puzzle.fen)
    chess.move({ from: puzzle.correctFrom, to: puzzle.correctTo, promotion: 'q' })
    setDisplayFen(chess.fen())
    setLastMove([puzzle.correctFrom as Key, puzzle.correctTo as Key])
    if (revertTimer.current) clearTimeout(revertTimer.current)
    revertTimer.current = setTimeout(clearWrongState, DEMO_DELAY)
  }

  // Speaks the newly-revealed tier text the instant a Hint request (click
  // or voice) changes forcedHintTier — not on every render, and not when
  // wrongAttempts alone drives the tier up (that's already spoken live
  // inside handleMove's wrong branch). Skipped while a Show Me
  // demonstration is playing — that gets its own dedicated line below,
  // which this would otherwise immediately talk over.
  useEffect(() => {
    if (forcedHintTier === null || attemptState === 'demonstrating') return
    voice.speak(currentSpokenText())
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately keyed only on the request itself; currentSpokenText/voice/attemptState intentionally excluded (attemptState read fresh via closure, same render as the forcedHintTier change that triggered this).
  }, [forcedHintTier])

  // The Show Me demonstration's own narration — kept separate from the
  // effect above so it isn't immediately overwritten by the generic hint
  // text (both would otherwise fire off the same forcedHintTier change).
  useEffect(() => {
    if (attemptState !== 'demonstrating' || voice.muted) return
    voice.speak(currentSpokenText())
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately keyed only on attemptState entering 'demonstrating'; currentSpokenText/voice read fresh via closure.
  }, [attemptState])

  function requestTryAgain() {
    if (attemptState !== 'reverting') return
    clearWrongState()
    voice.speak('Go ahead, try again.')
  }

  function handleVoiceCommand(command: VoiceCommand | null) {
    if (!command) {
      voice.speak("I didn't catch that. Please try again or use the buttons.")
      return
    }
    switch (command) {
      case 'repeat':
        voice.speak(currentSpokenText())
        break
      case 'hint':
      case 'explain':
        requestHint()
        break
      case 'showMe':
        requestShowMe()
        break
      case 'tryAgain':
        requestTryAgain()
        break
      case 'next':
        if (attemptState === 'correct') {
          advancePuzzle()
        } else {
          voice.speak('Finish this puzzle first.')
        }
        break
      case 'pause':
        voice.pause()
        break
      case 'resume':
        voice.resume()
        break
    }
  }

  const voiceStatus: 'speaking' | 'yourTurn' | null = voice.speaking ? 'speaking' : allDone || attemptState === 'correct' ? null : 'yourTurn'

  return (
    <>
      <div className={styles.boardCol}>
        <div className={styles.boardWrap}>
          <Board
            fen={displayFen}
            turnColor={puzzle.fen.split(' ')[1] === 'b' ? 'black' : 'white'}
            dests={dests}
            viewOnly={attemptState !== 'idle' || allDone}
            lastMove={lastMove}
            highlightSquares={highlightSquares}
            highlightColor="green"
            hintArrow={hintArrow}
            onMove={handleMove}
          />
          {celebrating && (
            <div className={styles.celebrate} aria-hidden="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <span key={i} className={styles.spark} style={{ left: `${12 + i * 14}%`, animationDelay: `${i * 70}ms` }} />
              ))}
              <span className={styles.celebrateCheck}>✓</span>
            </div>
          )}
        </div>
      </div>

      <div className={styles.panelCol}>
        {!allDone && (
          <p className={styles.puzzleIndicator}>{puzzle.fen.split(' ')[1] === 'b' ? 'Black' : 'White'} to move</p>
        )}
        <p className={styles.puzzleIndicator}>{allDone ? 'Complete' : `Puzzle ${puzzleIndex + 1} of ${puzzles.length}`}</p>

        <div
          className={`${styles.promptCard} ${attemptState === 'correct' ? styles.promptCardCorrect : ''} ${
            allDone ? styles.promptCardDone : ''
          }`}
        >
          {promptLines.map((line, i) => (
            <p key={i} className={styles.promptText}>
              {line}
            </p>
          ))}
        </div>

        {attemptState === 'correct' && !allDone && (
          <div className={styles.actions}>
            <button type="button" className={styles.actionBtnGhost} onClick={advancePuzzle}>
              {puzzleIndex === puzzles.length - 1 ? 'Finish →' : 'Next puzzle →'}
            </button>
          </div>
        )}

        {!allDone && (
          <VoiceControls
            supported={voice.supported}
            micSupported={voice.micSupported}
            voiceOn={!voice.muted}
            rate={voice.rate}
            listening={voice.listening}
            showHintControls
            onToggleVoice={voice.toggleMute}
            onSetRate={voice.setSpeechRate}
            onReplay={() => voice.speak(currentSpokenText())}
            onHint={requestHint}
            onShowMe={requestShowMe}
            onMicStart={() => voice.startPushToTalk(handleVoiceCommand)}
            onMicEnd={voice.stopPushToTalk}
          />
        )}
        {!allDone && <VoiceStatusLine status={voiceStatus} />}

        {allDone && (
          <div className={styles.actions}>
            <button type="button" className={styles.actionBtnGhost} onClick={handlePracticeAgain}>
              Practice again
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <p className={styles.modalTag}>✓ Practice complete</p>
            <p className={styles.modalHeading}>🎉 Great practice!</p>
            {(completionSummary ?? []).map((line, i) => (
              <p key={i} className={styles.modalBody}>
                {line}
              </p>
            ))}
            <div className={styles.modalActions}>
              <button type="button" className={styles.actionBtnGhost} onClick={handlePracticeAgain}>
                Practice again
              </button>
              {nextCta && (
                <Link href={nextCta.href} className={styles.modalPrimary}>
                  {nextCta.label}
                </Link>
              )}
              <Link href="/chess/learn/tactics" className={styles.modalSecondary}>
                Back to Tactics
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
