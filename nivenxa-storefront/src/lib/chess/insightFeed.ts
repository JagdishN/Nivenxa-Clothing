import { shouldAutoExplainLive } from './skillTiers'
import type { SkillTier } from './skillTiers'
import type { MoveAnalysisEntry } from './types'

/**
 * Pure rules for the Play "Insight" panel: which move the panel is about, what it may show for it, and how the text is cleaned.
 * Kept out of the component so the stale-result rules can be unit tested.
 */

/** Removes Markdown markers the model sometimes leaks (**bold**, _italics_, `code`, # headings, "- " bullets, [links](url)). Plain text in, plain text out. */
export function cleanInsightText(raw: string | null | undefined): string {
  if (!raw) return ''
  return raw
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__)([\s\S]+?)\1/g, '$2')
    .replace(/(^|[\s(])[*_]([^*_\n]+)[*_](?=$|[\s).,;:!?])/g, '$1$2')
    .replace(/`+/g, '')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/\*\*|__/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

/** First sentence of a text (for the short observation). */
export function firstSentence(text: string): { first: string; rest: string } {
  const m = text.match(/^([\s\S]+?[.!?])(\s+|$)/)
  if (!m) return { first: text, rest: '' }
  return { first: m[1].trim(), rest: text.slice(m[0].length).trim() }
}

/**
 * One short observation for a loaded entry. Prefers the verdict half of the headline ("e4 — Good opening move" -> "Good opening move"),
 * else the first sentence of the explanation. `hasMore` says whether a "Why?" expansion has anything the observation does not already say.
 */
export function observationFor(entry: MoveAnalysisEntry): { observation: string; hasMore: boolean } {
  // No trustworthy explanation exists for this graded move: say so. The factual description is shown separately by the panel.
  if (entry.explanationSource === 'unavailable') return { observation: 'Explanation unavailable.', hasMore: false }
  // A weak grade's collapsed summary IS the verified downside (never a positive remark, never hidden behind Why?).
  if (entry.kind === 'quality' && entry.downside && (entry.classification === 'inaccuracy' || entry.classification === 'mistake' || entry.classification === 'blunder')) {
    const more = entry.explanationSource === 'model' && !!cleanInsightText(entry.explanation)
    return { observation: entry.downside, hasMore: more }
  }
  const headline = cleanInsightText(entry.headline)
  const body = cleanInsightText(entry.explanation)
  const extras = (entry.bullets?.length ?? 0) > 0 || !!entry.suggestion || !!entry.notice || !!entry.remember
  if (headline) {
    const dash = headline.indexOf(' — ')
    const verdict = dash >= 0 ? headline.slice(dash + 3) : headline
    return { observation: verdict, hasMore: !!body || extras }
  }
  const { first, rest } = firstSentence(body)
  return { observation: first, hasMore: !!rest || extras }
}

/** "You · White · 5.Nf3" / "TIVVI · Black · 5...Nc6": who played it, the side, and the move number in standard notation. */
export function moveHeading(entry: { ply: number; color: 'w' | 'b'; san: string }, humanColor: 'w' | 'b', opponentName: string): string {
  const number = Math.floor(entry.ply / 2) + 1
  const side = entry.color === 'w' ? 'White' : 'Black'
  const who = entry.color === humanColor ? 'You' : opponentName
  return `${who} · ${side} · ${number}${entry.color === 'w' ? '.' : '...'}${entry.san}`
}

export type CurrentInsight =
  | { kind: 'none' }
  | { kind: 'pending'; ply: number } // the move was played but its grade has not arrived: never show an older insight as current
  | { kind: 'loading'; entry: MoveAnalysisEntry }
  | { kind: 'quiet'; entry: MoveAnalysisEntry } // coaching chose not to comment on this move
  | { kind: 'error'; entry: MoveAnalysisEntry }
  | { kind: 'ready'; entry: MoveAnalysisEntry }

/**
 * The insight is ALWAYS about the latest move played (`plyCount - 1`). If that move has no entry yet it is "pending";
 * an older entry is never promoted to "current".
 */
export function currentInsight(entries: readonly MoveAnalysisEntry[], plyCount: number, tier: SkillTier): CurrentInsight {
  if (plyCount <= 0) return { kind: 'none' }
  const ply = plyCount - 1
  const entry = entries.find((e) => e.ply === ply)
  if (!entry) return { kind: 'pending', ply }
  return insightForEntry(entry, tier)
}

/** What an existing entry can show right now (also used for a move the player picked in the Moves list). */
export function insightForEntry(entry: MoveAnalysisEntry, tier: SkillTier): Exclude<CurrentInsight, { kind: 'none' } | { kind: 'pending' }> {
  switch (entry.explanationStatus) {
    case 'loaded':
      return { kind: 'ready', entry }
    case 'error':
      return { kind: 'error', entry }
    case 'loading':
      return { kind: 'loading', entry }
    default:
      // idle: either an explanation is about to start (loading) or coaching skipped this move on purpose.
      return shouldAutoExplainLive(tier, entry) ? { kind: 'loading', entry } : { kind: 'quiet', entry }
  }
}

/**
 * The Insight panel's two sections. "Your last move" is the human's most recent move and stays on screen when the opponent replies;
 * "<opponent>'s reply" is the opponent's move made AFTER it (none while the opponent has not replied yet). Each is resolved on its own,
 * so a slow or failed result for one never touches the other, and neither is ever replaced by an older move's insight.
 */
export interface FeedSections {
  yours: Exclude<CurrentInsight, { kind: 'none' }> | null
  reply: Exclude<CurrentInsight, { kind: 'none' }> | null
}

const colorOfPly = (ply: number): 'w' | 'b' => (ply % 2 === 0 ? 'w' : 'b')

export function feedSections(entries: readonly MoveAnalysisEntry[], plyCount: number, humanColor: 'w' | 'b', tier: SkillTier): FeedSections {
  let yourPly = -1
  let replyPly = -1
  for (let p = plyCount - 1; p >= 0 && (yourPly < 0 || replyPly < 0); p--) {
    if (colorOfPly(p) === humanColor) {
      if (yourPly < 0) yourPly = p
    } else if (replyPly < 0) replyPly = p
  }
  if (replyPly >= 0 && replyPly < yourPly) replyPly = -1 // an older opponent move belongs to the history, not to the current exchange
  const section = (ply: number): FeedSections['yours'] => {
    if (ply < 0) return null
    const entry = entries.find((e) => e.ply === ply)
    return entry ? insightForEntry(entry, tier) : { kind: 'pending', ply }
  }
  return { yours: section(yourPly), reply: section(replyPly) }
}

/** The plies a FeedSections value shows (so the history can leave them out). */
export function sectionPlies(sections: FeedSections): number[] {
  return [sections.yours, sections.reply].flatMap((s) => (s ? [s.kind === 'pending' ? s.ply : s.entry.ply] : []))
}

/** Earlier insights for the collapsible history: newest first, only moves that have something to say, never one shown in a section. */
export function earlierInsights(entries: readonly MoveAnalysisEntry[], plyCount: number, shown: readonly number[] = [plyCount - 1]): MoveAnalysisEntry[] {
  return entries
    .filter((e) => e.ply < plyCount && !shown.includes(e.ply) && e.explanationStatus === 'loaded')
    .sort((a, b) => b.ply - a.ply)
}

/**
 * A late response may only be written into an entry that is still the SAME move (same ply, san and positions).
 * After undo + a different move at the same ply, the old request must not overwrite the new move's entry.
 */
export function sameMove(a: Pick<MoveAnalysisEntry, 'ply' | 'san' | 'fenBefore' | 'fenAfter'>, b: Pick<MoveAnalysisEntry, 'ply' | 'san' | 'fenBefore' | 'fenAfter'> | undefined): boolean {
  return !!b && a.ply === b.ply && a.san === b.san && a.fenBefore === b.fenBefore && a.fenAfter === b.fenAfter
}

/**
 * The explanation endpoints write about "Nivenxa" / "Nivenxa Engine" as the opponent. When the opponent has its own name
 * (TIVVI) that name is used in the text shown to the player. The app name ("Nivenxa Chess") is never touched.
 */
export function withOpponentName(text: string | null | undefined, name: string): string {
  if (!text) return text ?? ''
  if (name === 'Nivenxa') return text
  return text.replace(/\bNivenxa(?: Engine)?\b(?! Chess)/g, name)
}

export function localizeEntry(entry: MoveAnalysisEntry, name: string): MoveAnalysisEntry {
  if (name === 'Nivenxa') return entry
  const t = (v: string | null | undefined) => (v ? withOpponentName(v, name) : v)
  return {
    ...entry,
    headline: t(entry.headline) ?? undefined,
    explanation: t(entry.explanation) ?? null,
    suggestion: t(entry.suggestion) ?? undefined,
    notice: t(entry.notice) ?? undefined,
    remember: t(entry.remember) ?? undefined,
    bullets: entry.bullets?.map((b) => withOpponentName(b, name)),
  } as MoveAnalysisEntry
}
