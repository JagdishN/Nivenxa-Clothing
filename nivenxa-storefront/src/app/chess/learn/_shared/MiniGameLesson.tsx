'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { Key } from 'chessground/types'
import Board from '@/components/chess/Board'
import { useChessGame } from '@/lib/chess/useChessGame'
import { useStockfish } from '@/lib/chess/useStockfish'
import { markLessonCompleted } from '@/lib/chess/basicsProgress'
import styles from './MiniGameLesson.module.scss'

const GENTLE_SKILL = 0
const GENTLE_MOVETIME = 400
const COACH_MESSAGE_DURATION = 2200

export interface MiniGameExample {
  fen: string
  completionSummary?: string[]
}

function parseUci(uci: string): { from: string; to: string; promotion?: string } {
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci.slice(4, 5) : undefined }
}

export default function MiniGameLesson({ example, slug }: { example: MiniGameExample; slug: string }) {
  const { fen, isCheck, isCheckmate, isDraw, isStalemate, turn, dests, makeMove, reset } = useChessGame(example.fen)
  const { ready, setSkillLevel, getBestMove } = useStockfish()
  const [skillSet, setSkillSet] = useState(false)
  const [lastMove, setLastMove] = useState<Key[] | undefined>(undefined)
  const [engineThinking, setEngineThinking] = useState(false)
  const [coachMessage, setCoachMessage] = useState<string | null>(null)
  const [gameOver, setGameOver] = useState(false)
  const coachTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestedRef = useRef<string | null>(null)

  useEffect(() => {
    if (ready && !skillSet) {
      setSkillLevel(GENTLE_SKILL)
      setSkillSet(true)
    }
  }, [ready, skillSet, setSkillLevel])

  useEffect(
    () => () => {
      if (coachTimer.current) clearTimeout(coachTimer.current)
    },
    []
  )

  function say(message: string) {
    setCoachMessage(message)
    if (coachTimer.current) clearTimeout(coachTimer.current)
    coachTimer.current = setTimeout(() => setCoachMessage(null), COACH_MESSAGE_DURATION)
  }

  // Engine's reply, whenever it becomes Black's move mid-game.
  useEffect(() => {
    if (!ready || !skillSet || turn !== 'b' || isCheckmate || isDraw || isStalemate) return
    if (requestedRef.current === fen) return
    requestedRef.current = fen
    setEngineThinking(true)
    getBestMove(fen, { movetime: GENTLE_MOVETIME })
      .then((uci) => {
        const { from, to, promotion } = parseUci(uci)
        const result = makeMove(from, to, promotion)
        if (result) {
          setLastMove([from as Key, to as Key])
          if (result.san.includes('x')) say('Nivenxa captured a piece.')
        }
      })
      .catch(() => {
        // Engine failed to produce a move — leave the position as-is.
      })
      .finally(() => setEngineThinking(false))
  }, [ready, skillSet, turn, fen, isCheckmate, isDraw, isStalemate, getBestMove, makeMove])

  useEffect(() => {
    if (isCheckmate || isDraw || isStalemate) {
      const t = setTimeout(() => {
        setGameOver(true)
        markLessonCompleted(slug)
      }, 900)
      return () => clearTimeout(t)
    }
  }, [isCheckmate, isDraw, isStalemate, slug])

  function handleMove(from: Key, to: Key) {
    if (turn !== 'w' || engineThinking) return
    const result = makeMove(from, to)
    if (!result) return
    setLastMove([from, to])
    if (result.san.includes('#')) say('Checkmate! Great game.')
    else if (result.san.includes('x')) say('Great capture!')
    else if (result.san.includes('+')) say('Check!')
  }

  function handlePlayAgain() {
    reset()
    requestedRef.current = null
    setLastMove(undefined)
    setCoachMessage(null)
    setGameOver(false)
  }

  const learnerWon = isCheckmate && turn === 'b'
  const learnerLost = isCheckmate && turn === 'w'

  let statusText: string
  if (gameOver) statusText = learnerWon ? 'Checkmate — you won!' : learnerLost ? 'Nivenxa found checkmate.' : 'The game ended in a draw.'
  else if (engineThinking || turn === 'b') statusText = 'Nivenxa is thinking…'
  else if (isCheck) statusText = 'Your king is in check!'
  else statusText = 'Your move'

  return (
    <>
      <div className={styles.boardCol}>
        <div className={styles.boardWrap}>
          <Board
            fen={fen}
            turnColor={turn === 'w' ? 'white' : 'black'}
            dests={turn === 'w' && !gameOver ? dests : new Map<Key, Key[]>()}
            viewOnly={turn !== 'w' || gameOver}
            check={isCheck ? (turn === 'w' ? 'white' : 'black') : false}
            lastMove={lastMove}
            onMove={handleMove}
          />
        </div>
      </div>

      <div className={styles.panelCol}>
        <p className={styles.stageIndicator}>Your First Mini Game</p>

        <div className={styles.promptCard}>
          <p className={styles.promptText}>{statusText}</p>
          {coachMessage && <p className={styles.coachText}>{coachMessage}</p>}
          {!coachMessage && !gameOver && (
            <p className={styles.hintTextLine}>Try to capture Black's pieces and keep your king safe.</p>
          )}
        </div>

        {!gameOver && (
          <div className={styles.actions}>
            <button type="button" className={styles.actionBtnGhost} onClick={handlePlayAgain}>
              Start over
            </button>
          </div>
        )}
      </div>

      {gameOver && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalCard}>
            {learnerWon ? (
              <>
                <p className={styles.modalTag}>✓ Chess Basics completed</p>
                <p className={styles.modalHeading}>🎉 You finished Chess Basics!</p>
                {(example.completionSummary ?? []).map((line, i) => (
                  <p key={i} className={styles.modalBody}>
                    {line}
                  </p>
                ))}
                <p className={styles.modalBody}>Ready to learn your first opening?</p>
                <div className={styles.modalActions}>
                  <Link href="/chess/learn/openings/italian-game" className={styles.modalPrimary}>
                    Learn Italian Game →
                  </Link>
                  <Link href="/chess/learn/basics" className={styles.modalSecondary}>
                    Back to Chess Basics
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className={styles.modalTag}>{learnerLost ? 'Nivenxa won this one' : 'Draw'}</p>
                <p className={styles.modalHeading}>
                  {learnerLost ? 'So close — want to try again?' : "It's a draw — want to try again?"}
                </p>
                <p className={styles.modalBody}>Nivenxa plays gently here. Give it another go.</p>
                <div className={styles.modalActions}>
                  <button type="button" className={styles.modalPrimary} onClick={handlePlayAgain}>
                    Play again
                  </button>
                  <Link href="/chess/learn/basics" className={styles.modalSecondary}>
                    Back to Chess Basics
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
