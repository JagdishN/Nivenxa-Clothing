'use client'
import { useId, useState } from 'react'
import ExplanationBody from '@/components/chess/ExplanationBody'
import { classificationTone, formatClassification } from '@/lib/chess/moveClassification'
import { earlierInsights, feedSections, insightForEntry, localizeEntry, moveHeading, observationFor, sectionPlies } from '@/lib/chess/insightFeed'
import type { CurrentInsight } from '@/lib/chess/insightFeed'
import type { ReplyOption } from '@/lib/chess/checkInfo'
import type { SkillTier } from '@/lib/chess/skillTiers'
import type { MoveAnalysisEntry } from '@/lib/chess/types'
import { positionKey } from '@/lib/chess/moveFacts'
import styles from './InsightPanel.module.scss'

interface Props {
  tier: SkillTier
  /**
   * Verified facts about a check in the CURRENT position (from the position itself, not from commentary). `options` are the legal
   * answers (only when the human has to move); the help built from them is offered, never forced.
   */
  check: { key: string; text: string; options: ReplyOption[] | null; checkmate: boolean } | null
  entries: readonly MoveAnalysisEntry[]
  /** SAN list of the game so far: the sections are always about its LAST moves, never an older one. */
  history: readonly string[]
  humanColor: 'w' | 'b'
  opponentName: string
  welcome: { headline: string; body: string }
  /** A move the player picked in the Moves list (a board overlay): shown instead of the live sections. */
  reviewEntry?: MoveAnalysisEntry
  onBackToMoves: () => void
  /** Shows that move's position on the board (the existing review overlay). */
  onShowPosition: (entry: MoveAnalysisEntry) => void
  /** The position on the live board, so an explanation about an earlier position is never presented as about this one. */
  liveFen: string
  /** The move whose engine reply is currently drawn on the board (only ever on the position it belongs to), else null. */
  marked: number | null
  onMark: (entry: MoveAnalysisEntry) => void
}

type Shown = Exclude<CurrentInsight, { kind: 'none' }>

const notation = (ply: number, san: string) => `${Math.floor(ply / 2) + 1}${ply % 2 === 0 ? '.' : '...'}${san}`

/**
 * The Insight tab. Two compact sections: "Your last move" (kept on screen when the opponent replies) and "<opponent>'s reply", each
 * with its own state, so one arriving late or failing never erases or delays the other. Earlier moves live in a collapsed,
 * newest-first history. A grade is only shown once it is confirmed; while pending the section is neutral.
 */
export default function InsightPanel({ tier, check, entries, history, humanColor, opponentName, welcome, reviewEntry, onBackToMoves, onShowPosition, liveFen, marked, onMark }: Props) {
  const baseId = useId()
  const historyId = useId()
  // Keyed by move identity ("<section>:<ply>:<san>:<fen>"), so a new or replayed move always starts collapsed.
  const [openWhy, setOpenWhy] = useState<Set<string>>(new Set())
  const [helpFor, setHelpFor] = useState<string | null>(null) // the position the check help was opened in; any other position closes it
  const [historyOpen, setHistoryOpen] = useState(false)
  const [openEarlier, setOpenEarlier] = useState<Set<string>>(new Set())
  const key = (e: Pick<MoveAnalysisEntry, 'ply' | 'san' | 'fenAfter'>) => `${e.ply}:${e.san}:${e.fenAfter}`
  const toggle = (set: Set<string>, k: string) => {
    const next = new Set(set)
    if (next.has(k)) next.delete(k)
    else next.add(k)
    return next
  }

  const plyCount = history.length
  const sections = feedSections(entries, plyCount, humanColor, tier)
  const earlier = earlierInsights(entries, plyCount, sectionPlies(sections))

  const movedBy = (ply: number) => (ply % 2 === 0 ? 'w' : 'b') === humanColor
  const helpOpen = !!check?.options && helpFor === check.key

  const sectionCard = (id: string, title: string, shown: Shown | null, opts: { review?: boolean; placeholder?: string } = {}) => {
    if (!shown) {
      return (
        <section className={styles.card} aria-label={title} data-testid={`insight-${id}`} data-state="empty">
          <p className={styles.heading}>{title}</p>
          <p className={styles.quiet}>{opts.placeholder}</p>
        </section>
      )
    }
    const pending = shown.kind === 'pending'
    const entry = pending ? undefined : shown.entry
    const ply = pending ? shown.ply : shown.entry.ply
    const san = pending ? history[ply] ?? '' : shown.entry.san
    // A grade is shown only once it is confirmed (the graded entry exists). While pending the card is neutral.
    const graded = entry?.kind === 'quality' ? entry : null
    const tone = graded ? classificationTone(graded.classification) : null
    const cardKey = `${id}:${entry ? key(entry) : `pending:${ply}`}`
    const readyEntry = shown.kind === 'ready' ? localizeEntry(shown.entry, opponentName) : null
    const { observation, hasMore } = readyEntry ? observationFor(readyEntry) : { observation: '', hasMore: false }
    const canWhy = shown.kind === 'ready' && hasMore
    const whyOpen = canWhy && (opts.review || openWhy.has(cardKey))
    const mine = movedBy(ply)
    const heading = opts.review ? moveHeading({ ply, color: ply % 2 === 0 ? 'w' : 'b', san }, humanColor, opponentName) : `${title} · ${notation(ply, san)}`
    const unavailable = shown.kind === 'error' && entry?.analysisUnavailable
    return (
      <section
        className={`${styles.card} ${tone ? styles[`tone_${tone}`] : ''}`}
        aria-label={`${title}: ${notation(ply, san)}`}
        data-testid={`insight-${id}`}
        data-state={shown.kind}
        data-ply={ply}
        data-move={san}
        data-fen={entry?.fenAfter}
        data-grade={graded?.classification}
        data-analysis-ms={entry?.timing?.analysisMs}
        data-queue-ms={entry?.timing?.queueMs}
        data-commentary-ms={entry?.timing?.commentaryMs}
      >
        <p className={styles.heading} data-testid={`insight-${id}-heading`}>
          <span>{heading}</span>
          {graded && (
            <span className={`${styles.grade} ${tone ? styles[`grade_${tone}`] : ''}`} data-testid={`insight-${id}-grade`}>
              {formatClassification(graded.classification)}
            </span>
          )}
        </p>
        {/* "Reviewing…" while the move is still being graded / reviewed; once a grade is confirmed only the explanation is outstanding. */}
        {(shown.kind === 'pending' || shown.kind === 'loading') && (
          <p className={styles.loading} data-testid="insight-loading">
            {graded ? 'Writing the explanation…' : mine ? 'Reviewing your move…' : `Reviewing ${opponentName}'s move…`}
          </p>
        )}
        {shown.kind === 'quiet' && <p className={styles.quiet}>Nothing to flag on this move.</p>}
        {shown.kind === 'error' && (
          <p className={styles.error} data-testid="insight-unavailable">
            {unavailable ? "A review isn't available for this move." : "Commentary isn't available for this move."}{' '}
            The game isn&apos;t affected.
          </p>
        )}
        {shown.kind === 'ready' && (
          <p className={styles.observation} role="status" data-testid={`insight-${id}-observation`}>
            {observation}
          </p>
        )}
        {shown.kind === 'ready' && entry?.explanationSource === 'unavailable' && entry.moveFact && (
          <p className={styles.quiet} data-testid={`insight-${id}-move-fact`}>
            The move: {entry.moveFact}
          </p>
        )}
        {shown.kind === 'ready' && graded && (entry?.highlights?.length ?? 0) >= 2 && (
          <div className={styles.markRow}>
            {!opts.review && positionKey(liveFen) !== positionKey(entry!.fenAfter) && (
              <span className={styles.quiet} data-testid={`insight-${id}-historical`}>
                About the position after {notation(ply, san)}, not the one on the board.
              </span>
            )}
            <button type="button" className={styles.why} aria-pressed={marked === ply} onClick={() => onMark(entry!)} data-testid={`insight-${id}-mark`}>
              {marked === ply ? 'Hide reply on board' : opts.review || positionKey(liveFen) === positionKey(entry!.fenAfter) ? 'Show reply on board' : 'Show that position and reply'}
            </button>
          </div>
        )}
        {canWhy && !opts.review && (
          <button type="button" className={styles.why} aria-expanded={whyOpen} aria-controls={`${baseId}-${id}`} onClick={() => setOpenWhy((s) => toggle(s, cardKey))}>
            {whyOpen ? 'Hide why' : 'Why?'}
          </button>
        )}
        {whyOpen && readyEntry && (
          <div id={`${baseId}-${id}`} className={styles.whyBody} data-testid={`insight-${id}-why`}>
            <ExplanationBody entry={readyEntry} />
          </div>
        )}
      </section>
    )
  }

  const checkBlock = check && (
    <div className={styles.checkNote} data-testid="insight-check">
      <p>
        <strong>Check.</strong> {check.text}
      </p>
      {check.options && !check.checkmate && (
        <button type="button" className={styles.why} aria-expanded={helpOpen} aria-controls={`${baseId}-help`} onClick={() => setHelpFor(helpOpen ? null : check.key)} data-testid="check-help-toggle">
          {helpOpen ? 'Hide help' : 'How can I respond?'}
        </button>
      )}
      {helpOpen && check.options && (
        <ul id={`${baseId}-help`} className={styles.helpList} data-testid="check-help">
          {check.options.map((o) => (
            <li key={o.kind} data-kind={o.kind}>
              <strong>{o.label}:</strong> {o.moves.join(', ')}
            </li>
          ))}
        </ul>
      )}
      {check.checkmate && <p className={styles.checkReplies}>There is no legal way out of this check.</p>}
    </div>
  )

  const body = () => {
    if (reviewEntry) return sectionCard('review', 'Move review', insightForEntry(reviewEntry, tier), { review: true })
    if (plyCount === 0) {
      return (
        <div className={styles.welcome}>
          <p className={styles.welcomeHeadline}>{welcome.headline}</p>
          <p className={styles.welcomeText}>{welcome.body}</p>
        </div>
      )
    }
    return (
      <>
        {checkBlock}
        {sectionCard('you', 'Your last move', sections.yours, { placeholder: "You haven't moved yet." })}
        {sectionCard('reply', `${opponentName}'s reply`, sections.reply, { placeholder: `Waiting for ${opponentName}'s move.` })}
      </>
    )
  }

  return (
    <div className={styles.panel} data-testid="insight-panel">
      {reviewEntry && (
        <button type="button" className={styles.back} onClick={onBackToMoves}>
          ← Back to moves
        </button>
      )}
      {body()}
      {!reviewEntry && earlier.length > 0 && (
        <div className={styles.history}>
          <button type="button" className={styles.historyToggle} aria-expanded={historyOpen} aria-controls={historyId} onClick={() => setHistoryOpen((o) => !o)} data-testid="insight-history-toggle">
            <span aria-hidden="true">{historyOpen ? '▼' : '›'}</span> Earlier insights ({earlier.length})
          </button>
          {historyOpen && (
            <ol id={historyId} className={styles.list} data-testid="insight-history">
              {earlier.map((e) => {
                const k = key(e)
                const open = openEarlier.has(k)
                const local = localizeEntry(e, opponentName)
                const { observation } = observationFor(local)
                return (
                  <li key={k} className={styles.item} data-ply={e.ply}>
                    <button type="button" className={styles.itemHead} aria-expanded={open} onClick={() => setOpenEarlier((prev) => toggle(prev, k))}>
                      <span aria-hidden="true">{open ? '▼' : '›'}</span> {moveHeading(e, humanColor, opponentName)}
                      {e.kind === 'quality' && <span className={`${styles.grade} ${styles[`grade_${classificationTone(e.classification)}`]}`}>{formatClassification(e.classification)}</span>}
                    </button>
                    <p className={styles.itemObservation}>{observation}</p>
                    {open && <ExplanationBody entry={local} />}
                    <button type="button" className={styles.show} onClick={() => onShowPosition(e)}>
                      Show position
                    </button>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      )}
    </div>
  )
}
