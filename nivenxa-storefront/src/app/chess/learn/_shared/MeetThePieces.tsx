'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Chess } from 'chess.js'
import type { Key } from 'chessground/types'
import Board from '@/components/chess/Board'
import styles from './MeetThePieces.module.scss'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const EMPTY_DESTS = new Map<Key, Key[]>()
function noop() {}

type PieceType = 'k' | 'q' | 'r' | 'b' | 'n' | 'p'

const PIECE_INFO: Record<PieceType, { glyph: string; name: string; text: string }> = {
  k: { glyph: '♔', name: 'King', text: 'You have one king. Keep your king safe!' },
  q: { glyph: '♕', name: 'Queen', text: 'You have one queen.' },
  r: { glyph: '♖', name: 'Rook', text: 'You have two rooks.' },
  b: { glyph: '♗', name: 'Bishop', text: 'You have two bishops.' },
  n: { glyph: '♘', name: 'Knight', text: 'You have two knights.' },
  p: { glyph: '♙', name: 'Pawn', text: 'You have eight pawns.' },
}

const PIECE_ORDER: PieceType[] = ['k', 'q', 'r', 'b', 'n', 'p']

export default function MeetThePieces({ nextCta }: { nextCta?: { href: string; label: string } }) {
  const [metTypes, setMetTypes] = useState<Set<PieceType>>(new Set())
  const [activeType, setActiveType] = useState<PieceType | null>(null)
  const allDone = metTypes.size === PIECE_ORDER.length

  const board = useMemo(() => new Chess(START_FEN).board(), [])

  function squaresFor(type: PieceType): Key[] {
    const out: Key[] = []
    for (const row of board) {
      for (const cell of row) {
        if (cell && cell.color === 'w' && cell.type === type) out.push(cell.square as Key)
      }
    }
    return out
  }

  function handleTap(type: PieceType) {
    setActiveType(type)
    setMetTypes((prev) => (prev.has(type) ? prev : new Set(prev).add(type)))
  }

  const highlightSquares = activeType ? squaresFor(activeType) : undefined

  return (
    <>
      <div className={styles.boardCol}>
        <div className={styles.boardWrap}>
          <Board
            fen={START_FEN}
            turnColor="white"
            dests={EMPTY_DESTS}
            viewOnly
            highlightSquares={highlightSquares}
            highlightColor="green"
            onMove={noop}
          />
        </div>
      </div>

      <div className={styles.panelCol}>
        <div className={styles.explanation}>
          <p className={styles.explanationText}>These are your chess pieces.</p>
          <p className={styles.explanationText}>Each piece has a different way to move.</p>
          <p className={styles.explanationText}>Tap a piece to meet it.</p>
        </div>

        <div className={styles.pieceGrid}>
          {PIECE_ORDER.map((type) => (
            <button
              key={type}
              type="button"
              className={`${styles.pieceBtn} ${activeType === type ? styles.pieceBtnActive : ''} ${
                metTypes.has(type) ? styles.pieceBtnMet : ''
              }`}
              onClick={() => handleTap(type)}
            >
              <span className={styles.pieceGlyph} aria-hidden="true">
                {PIECE_INFO[type].glyph}
              </span>
              <span className={styles.pieceLabel}>{PIECE_INFO[type].name}</span>
            </button>
          ))}
        </div>

        {!allDone && activeType && (
          <div className={styles.promptCard}>
            <p className={styles.promptText}>
              {PIECE_INFO[activeType].glyph} {PIECE_INFO[activeType].name}
            </p>
            <p className={styles.promptText}>{PIECE_INFO[activeType].text}</p>
          </div>
        )}

        {allDone && (
          <div className={`${styles.promptCard} ${styles.promptCardDone}`}>
            <p className={styles.promptText}>🎉 You met all the pieces!</p>
          </div>
        )}

        {allDone && nextCta && (
          <div className={styles.actions}>
            <Link href={nextCta.href} className={styles.actionBtn}>
              {nextCta.label}
            </Link>
          </div>
        )}
      </div>
    </>
  )
}
