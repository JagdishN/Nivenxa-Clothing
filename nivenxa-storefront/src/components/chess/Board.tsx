'use client'
import { useEffect, useRef } from 'react'
import { Chessground } from 'chessground'
import type { Api } from 'chessground/api'
import type { Color, Key } from 'chessground/types'
import type { DrawShape } from 'chessground/draw'
import 'chessground/assets/chessground.base.css'
import 'chessground/assets/chessground.brown.css'
import 'chessground/assets/chessground.cburnett.css'
import styles from './Board.module.scss'

function noop() {}

// Hex colors for the `band: true` highlight — matches chessground's own
// brush colors (chessground/dist/state.js's default brushes) so a banded
// square reads as "the same color" as the ring-circle brush of the same
// name used everywhere else, just a different shape. No 'purple' here —
// purple is reserved for app chrome (buttons, progress, nav); painted onto
// the board itself it fought the natural cream/brown squares and hid
// whether a square was actually light or dark. Board highlights stay gold
// (teaching/hint), green (correct), red (wrong) only.
const BAND_COLOR: Record<string, string> = {
  yellow: '#e68f00',
  green: '#15781b',
  red: '#882020',
  blue: '#003088',
}

const BAND_STROKE = 6
const BAND_INSET = 6

// A custom-drawn ring for "correct/found" squares, replacing chessground's
// own native circle brush there. Chessground's ring size is NOT actually
// configurable via any brush property — its radius/stroke-width in
// `chessground/dist/svg.js`'s `renderCircle`/`circleWidth` are hardcoded
// constants (`circleWidth()` always returns `[3/64, 4/64]` regardless of
// `brush.lineWidth`, which only affects ARROW thickness, never circles) —
// so the only way to actually resize it is to stop using the native brush
// for this one case and draw the ring ourselves. Chessground's own native
// radius works out to ~46.9 in this 0-100 system (radius = 0.5 - (4/64)/2
// of a square); r=37 here is a second, further reduction from an earlier
// r=41 pass, each on direct "make the green circle smaller" feedback.
function smallRingSvg(color: string): string {
  return `<circle cx="50" cy="50" r="37" fill="none" stroke="${color}" stroke-width="5.5"/>`
}

// A single square's outline (fallback for a highlight that isn't one
// straight line — e.g. scattered squares) — an inset rounded rect, stroke
// only, so the square's own color/theme is never touched.
function soloOutlineSvg(color: string): string {
  return `<rect x="7" y="7" width="86" height="86" rx="10" fill="none" stroke="${color}" stroke-width="7" stroke-opacity="0.75"/>`
}

// One square's slice of a CONTINUOUS band running the length of a whole
// file or rank — see buildBandShapes. Built from plain axis-aligned rects
// (no path arcs): two long edges spanning the square's full local
// 0-100 box (so they connect seamlessly with the same square in every
// neighbor), plus a short end-cap only on the square that's the actual
// start or end of the line. The result reads as one rectangle framing the
// whole rank/file, not eight separate boxes.
function bandSliceSvg(color: string, vertical: boolean, isFirst: boolean, isLast: boolean): string {
  const m = BAND_INSET
  const sw = BAND_STROKE
  const rects: string[] = []
  if (vertical) {
    rects.push(`<rect x="${m}" y="0" width="${sw}" height="100" fill="${color}"/>`)
    rects.push(`<rect x="${100 - m - sw}" y="0" width="${sw}" height="100" fill="${color}"/>`)
    if (isFirst) rects.push(`<rect x="${m}" y="${m}" width="${100 - 2 * m}" height="${sw}" fill="${color}"/>`)
    if (isLast) rects.push(`<rect x="${m}" y="${100 - m - sw}" width="${100 - 2 * m}" height="${sw}" fill="${color}"/>`)
  } else {
    rects.push(`<rect x="0" y="${m}" width="100" height="${sw}" fill="${color}"/>`)
    rects.push(`<rect x="0" y="${100 - m - sw}" width="100" height="${sw}" fill="${color}"/>`)
    if (isFirst) rects.push(`<rect x="${m}" y="${m}" width="${sw}" height="${100 - 2 * m}" fill="${color}"/>`)
    if (isLast) rects.push(`<rect x="${100 - m - sw}" y="${m}" width="${sw}" height="${100 - 2 * m}" fill="${color}"/>`)
  }
  return `<g opacity="0.85">${rects.join('')}</g>`
}

// Splits an arbitrary square set into continuous-band groups (a full file —
// all 8 ranks of one letter present — or a full rank — all 8 files of one
// number present) plus whatever's left over. Handles a single pure
// file/rank (the common case) and a combined file+rank crossing (e.g.
// teaching "e4" by outlining the whole e-file AND rank 4 at once, which
// then read as two crossing bands rather than 16 separate outlined
// squares) by greedily removing whichever full line is largest first.
function buildBandShapes(squares: Key[], color: string): DrawShape[] {
  let pool = [...new Set(squares)]
  const groups: { line: Key[]; vertical: boolean }[] = []

  while (pool.length > 0) {
    const byFile = new Map<string, Key[]>()
    const byRank = new Map<string, Key[]>()
    for (const sq of pool) {
      const file = sq[0]
      const rank = sq[1]
      ;(byFile.get(file) ?? byFile.set(file, []).get(file)!).push(sq as Key)
      ;(byRank.get(rank) ?? byRank.set(rank, []).get(rank)!).push(sq as Key)
    }
    const fullFile = [...byFile.entries()].find(([, sqs]) => sqs.length === 8)
    const fullRank = [...byRank.entries()].find(([, sqs]) => sqs.length === 8)
    if (fullFile) {
      groups.push({ line: fullFile[1], vertical: true })
      pool = pool.filter((sq) => !fullFile[1].includes(sq as Key))
    } else if (fullRank) {
      groups.push({ line: fullRank[1], vertical: false })
      pool = pool.filter((sq) => !fullRank[1].includes(sq as Key))
    } else {
      break
    }
  }

  const shapes: DrawShape[] = []
  for (const { line, vertical } of groups) {
    const sorted = [...line].sort((a, b) => (vertical ? a.charCodeAt(1) - b.charCodeAt(1) : a.charCodeAt(0) - b.charCodeAt(0)))
    sorted.forEach((orig, i) => {
      shapes.push({ orig, customSvg: { html: bandSliceSvg(color, vertical, i === 0, i === sorted.length - 1) } })
    })
  }
  for (const orig of pool) {
    shapes.push({ orig, customSvg: { html: soloOutlineSvg(color) } })
  }
  // Where a file band and a rank band cross (e.g. teaching e4: the e-file
  // meets rank 4 right there), add a solid dot on top of both lines' own
  // shapes — the crossing point is the actual point of the lesson, not
  // just an incidental overlap of two outlines, so it gets its own mark
  // rather than being left to read as "two lines happen to meet here."
  if (groups.length >= 2) {
    const crossingCount = new Map<string, number>()
    for (const { line } of groups) {
      for (const sq of line) crossingCount.set(sq, (crossingCount.get(sq) ?? 0) + 1)
    }
    for (const [sq, count] of crossingCount) {
      if (count >= 2) {
        shapes.push({ orig: sq as Key, customSvg: { html: `<circle cx="50" cy="50" r="16" fill="${color}" opacity="0.9"/>` } })
      }
    }
  }
  return shapes
}

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
  /** Circle color for `highlightSquares` — yellow for a hint/callout/concept, green for "these are legal squares," red for an incorrect attempt. Deliberately no purple: that's reserved for app chrome (buttons, progress), not the board itself. */
  highlightColor?: 'yellow' | 'green' | 'red'
  /** [from, to] to draw as an arrow (chessground's shape overlay) — e.g. a "this piece to this square" hint. */
  hintArrow?: Key[]
  /**
   * Multiple simultaneous arrows with their own colors — e.g. Analysis
   * drawing both an attack path (red) and a suggested better move (green) at
   * once. `hintArrow` stays the single-arrow yellow shorthand for callers
   * that only ever need one; this is additive, not a replacement.
   */
  extraArrows?: { from: Key; to: Key; brush?: 'yellow' | 'green' | 'red' | 'blue' }[]
  /**
   * Square groups to circle together as one idea (e.g. an open file or a
   * dangerous diagonal), each with its own brush. `band: true` draws a
   * genuine continuous outline down the whole file/rank (see
   * `buildBandShapes`) instead of the usual per-square ring-circle — a
   * full file or rank reads as ONE highlighted lane, not eight separate
   * outlined boxes. A combined file+rank set (teaching e.g. "e4" by
   * outlining the whole e-file and rank 4 together) is automatically split
   * into two crossing bands; any squares that don't form a full straight
   * line fall back to an individual outline per square. Deliberately an
   * outline, never a filled wash — a solid fill blends differently
   * depending on the board's own theme (a gold wash read as a muddy olive
   * stripe over the green theme specifically) and hides whether the square
   * underneath was actually light or dark; an outline never recolors the
   * square itself, so it reads the same way on every board theme.
   */
  lineHighlights?: { squares: Key[]; brush?: 'yellow' | 'green' | 'red' | 'blue'; band?: boolean }[]
  /** Boosts the rank/file coordinate labels' size and weight — for the specific steps of a lesson that are actively teaching coordinates, off (the normal subtle read) everywhere else. */
  emphasizeCoordinates?: boolean
  /** Hides the rank/file coordinate labels entirely — default true (shown) everywhere. The Chessboard lesson passes `false` for every step before it actually introduces files/ranks, so a beginner isn't looking at coordinate letters/numbers before that concept exists yet. */
  showCoordinates?: boolean
  /** The board's own square colors — 'cream' (the default, matches chessground's own brown theme), 'green', or 'purple'. See BoardLesson's colorPicker step, the only place this is currently learner-chosen. */
  boardTheme?: 'cream' | 'green' | 'purple'
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
  showCoordinates = true,
  boardTheme = 'cream',
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
      ...(lineHighlights ?? []).flatMap((l) =>
        l.band
          ? buildBandShapes(l.squares, BAND_COLOR[l.brush ?? 'yellow'])
          : l.brush === 'green'
            ? // A found/correct square — drawn smaller than chessground's
              // native ring (see smallRingSvg's own comment for why the
              // native brush can't just be resized via config).
              l.squares.map((orig) => ({ orig, customSvg: { html: smallRingSvg(BAND_COLOR.green) } }))
            : l.squares.map((orig) => ({ orig, brush: l.brush ?? 'yellow' }))
      ),
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
      } ${showCoordinates ? '' : styles.board_coordsHidden} ${
        boardTheme === 'green' ? styles.board_themeGreen : boardTheme === 'purple' ? styles.board_themePurple : styles.board_themeCream
      }`}
    >
      <div ref={elRef} className={styles.board} />
    </div>
  )
}
