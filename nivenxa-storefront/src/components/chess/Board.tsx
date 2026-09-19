'use client'
import { useEffect, useRef } from 'react'
import { Chessground } from 'chessground'
import type { Api } from 'chessground/api'
import type { Color, Key } from 'chessground/types'
import 'chessground/assets/chessground.base.css'
import 'chessground/assets/chessground.brown.css'
import 'chessground/assets/chessground.cburnett.css'
import styles from './Board.module.scss'

function noop() {}

export interface BoardProps {
  fen: string
  turnColor: Color
  dests: Map<Key, Key[]>
  orientation?: Color
  viewOnly?: boolean
  /** Highlights the given color's king square (chessground's built-in check styling) — used for the checkmated king at game end. */
  check?: Color | boolean
  /** [from, to] of the last move — chessground's built-in last-move square highlight. */
  lastMove?: Key[]
  /** Squares to circle (chessground's shape overlay) — e.g. the square a piece newly aims at. */
  highlightSquares?: Key[]
  /** Circle color for `highlightSquares` — yellow for a hint/callout, green for "these are legal squares." */
  highlightColor?: 'yellow' | 'green'
  /** [from, to] to draw as an arrow (chessground's shape overlay) — e.g. a "this piece to this square" hint. */
  hintArrow?: Key[]
  /**
   * Multiple simultaneous arrows with their own colors — e.g. Analysis
   * drawing both an attack path (red) and a suggested better move (green) at
   * once. `hintArrow` stays the single-arrow yellow shorthand for callers
   * that only ever need one; this is additive, not a replacement.
   */
  extraArrows?: { from: Key; to: Key; brush?: 'yellow' | 'green' | 'red' | 'blue' }[]
  /** Square groups to circle together as one idea (e.g. an open file or a dangerous diagonal), each with its own brush. */
  lineHighlights?: { squares: Key[]; brush?: 'yellow' | 'green' | 'red' | 'blue' }[]
  /** Boosts the rank/file coordinate labels' size and weight — for the specific steps of a lesson that are actively teaching coordinates, off (the normal subtle read) everywhere else. */
  emphasizeCoordinates?: boolean
  /** Briefly pulses the current `highlightSquares` circles — a lightweight "you got it" animation for a just-found square, distinct from the static highlight itself. */
  pulseHighlights?: boolean
  onMove?: (from: Key, to: Key) => void
  /**
   * Fires when any square is clicked — used for click-to-identify quizzes
   * ("find e4", "click a light square") that aren't piece moves, as opposed
   * to `onMove`/`dests` which govern drag-a-piece interactions. The two are
   * independent: a board can take clicks with no pieces/dests at all.
   */
  onSquareClick?: (key: Key) => void
}

export default function Board({
  fen,
  turnColor,
  dests,
  orientation = 'white',
  viewOnly = false,
  check = false,
  lastMove,
  highlightSquares,
  highlightColor = 'yellow',
  hintArrow,
  extraArrows,
  lineHighlights,
  emphasizeCoordinates = false,
  pulseHighlights = false,
  onMove = noop,
  onSquareClick,
}: BoardProps) {
  const elRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<Api | null>(null)
  const onMoveRef = useRef(onMove)
  onMoveRef.current = onMove
  const onSquareClickRef = useRef(onSquareClick)
  onSquareClickRef.current = onSquareClick

  // Mount Chessground — it's a vanilla-TS UI, not a React component — and
  // remount whenever `orientation` flips. Chessground only attaches its
  // mousedown/touchstart listeners once, at construction, and skips that
  // entirely if viewOnly is true then — it does NOT re-bind on a later
  // .set(). Since the engine hasn't finished loading on first mount,
  // boardLocked (and thus viewOnly) starts true here, which would
  // permanently disable the board. Always construct interactive; the sync
  // effect below applies the real viewOnly value afterward, which
  // chessground *does* honor dynamically (checked at drag-start time, not
  // just at bind time).
  //
  // Orientation is different: flipping it via a later .set() repaints piece
  // positions correctly but leaves chessground's pointer/drag handling
  // silently broken (verified — dests/movable.color/viewOnly all stay
  // correct, and the programmatic .move() API still works, but no drag
  // registers at all). A puzzle set that starts with white to move and
  // later hits a black-to-move puzzle hits this exact transition. Rebuilding
  // the instance on orientation change sidesteps it entirely.
  useEffect(() => {
    if (!elRef.current) return

    const api = Chessground(elRef.current, {
      fen,
      orientation,
      turnColor,
      lastMove,
      viewOnly: false,
      animation: { enabled: true, duration: 200 },
      movable: {
        free: false,
        color: turnColor,
        dests,
        showDests: true,
      },
      selectable: {
        enabled: !!onSquareClickRef.current,
      },
      events: {
        move: (orig, dest) => onMoveRef.current(orig, dest),
        select: (key) => onSquareClickRef.current?.(key),
      },
    })
    apiRef.current = api

    return () => {
      api.destroy()
      apiRef.current = null
    }
    // Position/turn/dests updates beyond orientation flow through .set() below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orientation])

  // Sync position/state into the existing instance rather than remounting.
  useEffect(() => {
    apiRef.current?.set({
      fen,
      orientation,
      turnColor,
      viewOnly,
      check,
      lastMove,
      animation: { enabled: true, duration: 200 },
      movable: {
        free: false,
        color: turnColor,
        dests,
        showDests: true,
      },
      selectable: {
        enabled: !!onSquareClick,
      },
    })
    apiRef.current?.setShapes([
      ...(highlightSquares ?? []).map((orig) => ({ orig, brush: highlightColor })),
      ...(hintArrow ? [{ orig: hintArrow[0], dest: hintArrow[1], brush: 'yellow' as const }] : []),
      ...(extraArrows ?? []).map((a) => ({ orig: a.from, dest: a.to, brush: a.brush ?? 'yellow' })),
      ...(lineHighlights ?? []).flatMap((l) => l.squares.map((orig) => ({ orig, brush: l.brush ?? 'yellow' }))),
    ])
  }, [
    fen,
    turnColor,
    dests,
    orientation,
    viewOnly,
    check,
    lastMove,
    highlightSquares,
    highlightColor,
    hintArrow,
    extraArrows,
    lineHighlights,
    onSquareClick,
  ])

  return (
    // The modifier classes live on this wrapper, never on the ref'd div
    // below — chessground adds its own classes (cg-wrap, orientation-*,
    // manipulable) to that div imperatively via classList, outside React's
    // knowledge. Any change to that div's className prop makes React
    // overwrite the whole attribute on the next render, silently wiping
    // chessground's classes (including cg-wrap itself, which chessground's
    // own CSS needs for position: relative) — which then sends the
    // absolutely-positioned board container jumping to the next positioned
    // ancestor up the tree. Keeping this div's className permanently static
    // avoids that; the CSS below still matches since these are descendant
    // selectors, not direct-child ones.
    <div
      className={`${styles.wrap} ${emphasizeCoordinates ? styles.board_coordsEmphasized : ''} ${
        pulseHighlights ? styles.board_pulsing : ''
      }`}
    >
      <div ref={elRef} className={styles.board} />
    </div>
  )
}
