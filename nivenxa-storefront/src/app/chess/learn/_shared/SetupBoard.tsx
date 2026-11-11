'use client'
import { createElement, useRef, useState } from 'react'
import 'chessground/assets/chessground.base.css'
import 'chessground/assets/chessground.brown.css'
import 'chessground/assets/chessground.cburnett.css'
import { BOARD_THEMES, type BoardTheme } from './useBoardTheme'
import { PIECE_NAME, pieceLabel, type Placement } from './lessonPlacement'
import styles from './SetupBoard.module.scss'

export { PIECE_NAME, START_PLACEMENT, fenFromPlacement, compareToTarget, pieceLabel, type Placement } from './lessonPlacement'

/** A glyph element drawn with the same piece art as the chessground board (the CSS keys off the `cg-wrap` ancestor). */
export function PieceGlyph({ letter, className }: { letter: string; className?: string }) {
  const white = letter === letter.toUpperCase()
  return createElement('piece', { className: `${white ? 'white' : 'black'} ${PIECE_NAME[letter.toLowerCase()]} ${styles.pc} ${className ?? ''}`, 'aria-hidden': 'true' })
}

/**
 * An 8×8 board of real buttons: usable by mouse, touch AND keyboard (one tab stop, arrow keys move, Enter/Space
 * chooses), so building or reading a position never depends on dragging. Used for the independent "set up the board"
 * task (interactive) and for the complete-board picture in the lesson's recap (read-only).
 */
export default function SetupBoard({
  placed,
  theme,
  onSquare,
  onRemove,
  onEscape,
  wrong = [],
  hint = [],
  focus = [],
  selected,
  sideLabels = false,
  readOnly = false,
  label = 'Chessboard',
  small = false,
  testId = 'setup-board',
}: {
  placed: Placement
  theme: BoardTheme
  onSquare?: (square: string) => void
  /** Delete / Backspace on a square (keyboard way to take a piece off). */
  onRemove?: (square: string) => void
  /** Escape (cancel the piece being placed or moved). */
  onEscape?: () => void
  wrong?: string[]
  hint?: string[]
  /** The pieces belonging to the pattern being explained right now (purple, dashed, "!"). */
  focus?: string[]
  /** The placed piece the learner has chosen to move or take off (blue ring, "◉"). */
  selected?: string
  /** Persistent "Black's side" / "White's side" captions above and below the board. */
  sideLabels?: boolean
  readOnly?: boolean
  label?: string
  small?: boolean
  testId?: string
}) {
  const t = BOARD_THEMES.find((x) => x.value === theme) ?? BOARD_THEMES[0]
  const [current, setCurrent] = useState('d4')
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})
  const move = (sq: string, df: number, dr: number) => {
    const f = Math.min(7, Math.max(0, 'abcdefgh'.indexOf(sq[0]) + df))
    const r = Math.min(8, Math.max(1, Number(sq[1]) + dr))
    const next = `${'abcdefgh'[f]}${r}`
    setCurrent(next)
    refs.current[next]?.focus()
  }
  const cells: React.ReactNode[] = []
  for (let rank = 8; rank >= 1; rank--) {
    for (let fi = 0; fi < 8; fi++) {
      const sq = `${'abcdefgh'[fi]}${rank}`
      const light = (fi + rank) % 2 === 0
      const piece = placed[sq]
      const state = sq === selected ? 'selected' : wrong.includes(sq) ? 'wrong' : focus.includes(sq) ? 'focus' : hint.includes(sq) ? 'hint' : ''
      cells.push(
        <button
          key={sq}
          ref={(el) => {
            refs.current[sq] = el
          }}
          type="button"
          className={`${styles.cell} ${state ? styles[state] : ''}`}
          style={{ background: light ? t.light : t.dark }}
          tabIndex={readOnly ? -1 : sq === current ? 0 : -1}
          disabled={readOnly}
          aria-label={`${sq}, ${piece ? pieceLabel(piece) : 'empty'}${state === 'wrong' ? ', needs another look' : state === 'focus' ? ', part of the pattern to fix' : state === 'selected' ? ', chosen' : ''}`}
          data-square={sq}
          data-piece={piece ?? ''}
          data-state={state}
          onFocus={() => setCurrent(sq)}
          onClick={() => onSquare?.(sq)}
          onKeyDown={(e) => {
            if (!readOnly && (e.key === 'Delete' || e.key === 'Backspace')) {
              e.preventDefault()
              onRemove?.(sq)
              return
            }
            if (!readOnly && e.key === 'Escape') {
              onEscape?.()
              return
            }
            const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key]
            if (dir) {
              e.preventDefault()
              move(sq, dir[0], dir[1])
            }
          }}
        >
          {fi === 0 && <span className={styles.rankLabel}>{rank}</span>}
          {rank === 1 && <span className={styles.fileLabel}>{'abcdefgh'[fi]}</span>}
          {piece && <PieceGlyph letter={piece} />}
          {state === 'wrong' && <span className={styles.mark} aria-hidden="true">✕</span>}
          {state === 'hint' && <span className={`${styles.mark} ${styles.markHint}`} aria-hidden="true">●</span>}
          {state === 'focus' && <span className={`${styles.mark} ${styles.markFocus}`} aria-hidden="true">!</span>}
          {state === 'selected' && <span className={`${styles.mark} ${styles.markSelected}`} aria-hidden="true">◉</span>}
        </button>
      )
    }
  }
  const grid = (
    <div className={`cg-wrap ${styles.board} ${small ? styles.small : ''}`} role="group" aria-label={label} data-testid={testId}>
      {cells}
    </div>
  )
  if (!sideLabels) return grid
  return (
    <div className={styles.framed} data-testid="setup-frame">
      <p className={styles.sideLabel} data-testid="side-label-black">
        Black’s side (top)
      </p>
      {grid}
      <p className={styles.sideLabel} data-testid="side-label-white">
        White’s side (bottom) — White starts nearest you
      </p>
    </div>
  )
}
