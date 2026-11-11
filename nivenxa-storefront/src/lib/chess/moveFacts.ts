import { Chess } from 'chess.js'
import type { Color, PieceSymbol, Square } from 'chess.js'

/**
 * Verified facts about ONE move, read from the positions with chess.js (never from a model), plus the checks that keep a generated
 * explanation honest. Used by the explanation API routes (to build the prompt and to vet the reply) and by the client (to vet again
 * before anything is shown). Pure and dependency-light so it can be unit tested.
 *
 * What goes wrong without it: the model was handed only the position BEFORE the move and a short, possibly gappy list of earlier
 * moves, with no side to move or move number. It then described the previous move (16.dxe5 -> "Black's earlier ...e5"), reported its
 * own confusion ("the move list looks a bit jumbled") or invented positional claims ("rook to the open file" with a pawn on it).
 */

const NAME: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' }
const SIDE: Record<Color, string> = { w: 'White', b: 'Black' }

export const positionKey = (fen: string) => fen.split(' ').slice(0, 4).join(' ')

export interface MoveFacts {
  ply: number
  color: Color
  san: string
  moveNumber: number
  /** "16.dxe5" (White) or "17...Rfe8" (Black). */
  notation: string
  piece: PieceSymbol
  from: Square
  to: Square
  captured?: PieceSymbol
  promotion?: PieceSymbol
  castle?: 'kingside' | 'queenside'
  check: boolean
  mate: boolean
  fenBefore: string
  fenAfter: string
  /** The canonical move list leading up to this move, numbered ("14.Nf3 Nc6 15.Bg5"), at most 8 plies, oldest first. */
  recent: string
}

export interface MoveFactsInput {
  fenBefore: string
  fenAfter: string
  san: string
  /** Index of this move in the game (0 = White's first). Used only for numbering when the FEN's counter is unavailable. */
  ply?: number
  /** The moves played before this one, oldest first, as the game itself recorded them. */
  historySan?: readonly string[]
}

/** The canonical earlier moves as numbered text, numbering walked back from the move being explained. */
function numbered(history: readonly string[], color: Color, moveNumber: number): string {
  const items: { san: string; color: Color; num: number }[] = []
  let col = color
  let num = moveNumber
  for (let i = history.length - 1; i >= 0; i--) {
    if (col === 'w') {
      col = 'b'
      num--
    } else col = 'w'
    items.unshift({ san: history[i], color: col, num })
  }
  return items.map((it, idx) => (it.color === 'w' ? `${it.num}.${it.san}` : idx === 0 ? `${it.num}...${it.san}` : it.san)).join(' ')
}

/** Replays `san` from `fenBefore` and requires it to be legal AND to land exactly on `fenAfter`. Returns null otherwise (never guesses). */
export function buildMoveFacts(input: MoveFactsInput): MoveFacts | null {
  try {
    const game = new Chess(input.fenBefore)
    const color = game.turn()
    const move = game.move(input.san)
    if (!move) return null
    if (positionKey(game.fen()) !== positionKey(input.fenAfter)) return null
    const counter = Number(input.fenBefore.split(' ')[5])
    const moveNumber = Number.isFinite(counter) && counter > 0 ? counter : Math.floor((input.ply ?? 0) / 2) + 1
    const history = (input.historySan ?? []).slice(-8)
    return {
      ply: input.ply ?? (moveNumber - 1) * 2 + (color === 'b' ? 1 : 0),
      color,
      san: input.san,
      moveNumber,
      notation: color === 'w' ? `${moveNumber}.${move.san}` : `${moveNumber}...${move.san}`,
      piece: move.piece,
      from: move.from,
      to: move.to,
      captured: move.captured,
      promotion: move.promotion,
      castle: move.flags.includes('k') ? 'kingside' : move.flags.includes('q') ? 'queenside' : undefined,
      check: game.inCheck(),
      mate: game.isCheckmate(),
      fenBefore: input.fenBefore,
      fenAfter: input.fenAfter,
      recent: numbered(history, color, moveNumber),
    }
  } catch {
    return null
  }
}

/** One short, strictly factual sentence about the move. No judgement, no plan, no reason is ever added. */
export function describeFacts(f: MoveFacts): string {
  const me = SIDE[f.color]
  const them = SIDE[f.color === 'w' ? 'b' : 'w']
  let s: string
  if (f.castle) s = `${me} castled ${f.castle}.`
  else if (f.captured) s = `${me}'s ${NAME[f.piece]} on ${f.from} captured ${them}'s ${NAME[f.captured]} on ${f.to}.`
  else s = `${me}'s ${NAME[f.piece]} moved from ${f.from} to ${f.to}.`
  if (f.promotion) s = s.replace(/\.$/, ` and became a ${NAME[f.promotion]}.`)
  if (f.mate) s += ' It is checkmate.'
  else if (f.check) s += ' It gives check.'
  return s
}

/** The facts as prompt lines, so the model is told exactly which move, by whom, in which game position. */
export function factsForPrompt(f: MoveFacts): string {
  return [
    `Move to explain: ${f.notation} — played by ${SIDE[f.color]} (${NAME[f.piece]} from ${f.from} to ${f.to}${f.captured ? `, capturing a ${NAME[f.captured]}` : ''}${f.castle ? `, castling ${f.castle}` : ''}${f.promotion ? `, promoting to a ${NAME[f.promotion]}` : ''}${f.mate ? ', checkmate' : f.check ? ', giving check' : ''}).`,
    `Moves before it (canonical, numbered): ${f.recent || '(none — this is the first move)'}`,
    `Position before the move (FEN): ${f.fenBefore}`,
    `Position after the move (FEN): ${f.fenAfter}`,
    `Explain ONLY this move by ${SIDE[f.color]}. Do not describe the earlier moves. State only what is true in the position after the move; never mention the move list or any inconsistency; if unsure, say less.`,
  ].join('\n')
}

// ─── Vetting a generated explanation ──────────────────────────────────────────

const CONFUSION =
  /jumbled|inconsistent|doesn'?t (?:match|seem|line up|add up)|does not (?:match|seem|line up|add up)|\binvalid\b|\b(?:can'?t|cannot|unable to) (?:tell|see|determine|verify)\b|\bunclear\b|something (?:looks|seems|is) (?:off|wrong)|\bmismatch|appears to be (?:an? )?(?:error|mistake)|move list|move history|as an ai\b/i

const SAN = String.raw`(?:O-O(?:-O)?|[KQRBN][a-h]?[1-8]?x?[a-h][1-8]|[a-h](?:x[a-h])?[1-8](?:=[QRBN])?)[+#]?`
const BLACK_NOTATION = new RegExp(String.raw`(?:\d+)?(?:\.\.\.|…)\s*(${SAN})`, 'g')
const WHITE_NOTATION = new RegExp(String.raw`(?<![.…])\b\d+\.\s*(${SAN})`, 'g')

export interface Vetting {
  ok: boolean
  reason?: string
}

const sanBare = (s: string) => s.replace(/[+#]/g, '')

function pawnsOnFile(fen: string, file: string): { w: number; b: number } {
  const g = new Chess(fen)
  let w = 0
  let b = 0
  for (let r = 1; r <= 8; r++) {
    const p = g.get(`${file}${r}` as Square)
    if (p && p.type === 'p') {
      if (p.color === 'w') w++
      else b++
    }
  }
  return { w, b }
}

/**
 * Checks the claims a piece of generated text makes against the verified facts of the move. It cannot prove an explanation is good,
 * only reject ones that describe another move, expose confusion, or contradict the board. A rejected text is replaced by
 * describeFacts(); nothing is ever invented to fill the gap.
 */
export function vetExplanation(text: string, f: MoveFacts, allow: readonly string[] = []): Vetting {
  const t = text.trim()
  if (!t) return { ok: false, reason: 'empty' }
  if (CONFUSION.test(t)) return { ok: false, reason: 'confusion' }

  // Another move's notation: a Black-style "...e5" while explaining White's move, or "16.dxe5" style for the other side.
  const own = sanBare(f.san)
  if (f.color === 'w') {
    for (const m of t.matchAll(BLACK_NOTATION)) if (!allow.map(sanBare).includes(sanBare(m[1]))) return { ok: false, reason: `describes-black-move:${m[1]}` }
  } else {
    for (const m of t.matchAll(WHITE_NOTATION)) if (sanBare(m[1]) !== own && !allow.map(sanBare).includes(sanBare(m[1]))) return { ok: false, reason: `describes-white-move:${m[1]}` }
  }

  // A capture has to be about the capture.
  if (f.captured && !/captur|\btak(?:e|es|ing)\b|\btook\b|\bwin(?:s|ning)?\b|\bwon\b|trade|exchang|remov|grab|\bgobbl/i.test(t) && !new RegExp(`\\b${NAME[f.captured]}`, 'i').test(t)) {
    return { ok: false, reason: 'omits-capture' }
  }

  // "<colour> <piece> on <square>" must be true in the position before or after the move.
  const before = new Chess(f.fenBefore)
  const after = new Chess(f.fenAfter)
  for (const m of t.matchAll(/\b(?:(white|black)(?:'s)?\s+)?(pawn|knight|bishop|rook|queen|king)s?\s+(?:on|at)\s+([a-h][1-8])\b/gi)) {
    const type = (Object.keys(NAME) as PieceSymbol[]).find((k) => NAME[k] === m[2].toLowerCase())!
    const sq = m[3].toLowerCase() as Square
    const hit = [before.get(sq), after.get(sq)].some((p) => p && p.type === type && (!m[1] || p.color === (m[1].toLowerCase() === 'white' ? 'w' : 'b')))
    if (!hit) return { ok: false, reason: `no-${m[2].toLowerCase()}-on-${sq}` }
  }

  // Open / half-open file claims, checked against the pawns that are really on the file after the move.
  for (const m of t.matchAll(/\b(half[- ]open|semi[- ]open|open)\s+(?:([a-h])[- ]?)?file\b/gi)) {
    const file = (m[2] ?? (f.piece === 'r' || f.piece === 'q' ? f.to[0] : '')).toLowerCase()
    if (!file) continue
    const p = pawnsOnFile(f.fenAfter, file)
    const half = /half|semi/i.test(m[1])
    const own = f.color === 'w' ? p.w : p.b
    if (half ? own > 0 : p.w + p.b > 0) return { ok: false, reason: `${half ? 'half-open' : 'open'}-${file}-file-has-pawns` }
  }

  if (/\b(?:gives?|giving|delivers?|puts?)\s+(?:\w+\s+)?check\b/i.test(t) && !f.check) return { ok: false, reason: 'claims-check' }
  if (/\bcheckmate\b/i.test(t) && !f.mate && !/threat|avoid|prevent|stop|danger|risk|could|can |would|might|may |back[- ]rank|before/i.test(t)) return { ok: false, reason: 'claims-checkmate' }
  return { ok: true }
}

/** Vets every text field of a structured explanation as one body of text (any single field may make the capture/side claims). */
export function vetFields(fields: (string | null | undefined)[], f: MoveFacts, allow: readonly string[] = []): Vetting {
  const parts = fields.filter((x): x is string => !!x && x.trim().length > 0)
  if (parts.length === 0) return { ok: false, reason: 'empty' }
  for (const p of parts) {
    const v = vetExplanation(p, { ...f, captured: undefined }, allow)
    if (!v.ok) return v
  }
  // The capture rule is about the explanation as a whole, not each bullet.
  return vetExplanation(parts.join(' '), f, allow)
}

// ─── Grade evidence: what the engine's own search proved about the move ─────────

export type Grade = 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder'
export const isWeakGrade = (g?: string): boolean => g === 'inaccuracy' || g === 'mistake' || g === 'blunder'

const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }
const materialDiff = (fen: string, side: Color): number => {
  let d = 0
  for (const row of new Chess(fen).board()) for (const c of row) if (c) d += (c.color === side ? 1 : -1) * VALUE[c.type]
  return d
}

/** The most the engine line is allowed to show: it is the principal variation of the search that ALREADY produced the grade. */
const MAX_LINE_PLIES = 8

/**
 * What the engine's own search proved about the position AFTER a graded move. The evidence is the engine's principal variation
 * (the opponent's best line, from the analysis search that produced the grade), replayed legally with chess.js and settled
 * (it ends on a quiet move, so recaptures inside the line are already counted). Material is counted over that settled line, so a
 * capture that is simply recaptured is NOT a loss, and a line that only checks or attacks proves nothing by itself.
 */
export interface Evidence {
  grade?: Grade
  /** The opponent's first move in the engine line (SAN). */
  replySan?: string
  /** The settled engine line, SAN, up to 8 plies; empty when the line cannot be trusted. */
  line: string[]
  lineSettled: boolean
  /** The mover's material change from BEFORE the move to the settled end of the line (negative = behind), in points. */
  netMaterial?: number
  /** The mover's pieces the opponent captures in the line. */
  lostPieces: PieceSymbol[]
  /** The line ends in checkmate against the mover. */
  mateAgainst?: boolean
  /** The opponent's first move captures one of the mover's pieces. */
  firstCapture?: { by: PieceSymbol; from: Square; piece: PieceSymbol; square: Square }
  /** Legal captures of the moved piece by ANY opposing piece (protection never prevents a legal capture). */
  capturableBy: string[]
  /** The engine's stronger move, only present when it may be shown. */
  bestSan?: string
  /** Squares worth showing on the board for this explanation (never shown on any other position). */
  highlights: Square[]
}

export function buildEvidence(f: MoveFacts, o: { grade?: Grade; pvUci?: readonly string[]; replyUci?: string; bestSan?: string }): Evidence {
  const ev: Evidence = { grade: o.grade, line: [], lineSettled: false, lostPieces: [], capturableBy: [], bestSan: o.bestSan, highlights: [] }
  try {
    const g = new Chess(f.fenAfter)
    ev.capturableBy = g
      .moves({ verbose: true })
      .filter((m) => m.to === f.to && !!m.captured)
      .map((m) => m.san)
      .slice(0, 4)
    const pv = (o.pvUci && o.pvUci.length > 0 ? o.pvUci : o.replyUci ? [o.replyUci] : []).slice(0, MAX_LINE_PLIES)
    const before = materialDiff(f.fenBefore, f.color)
    const mover = f.color
    const san: string[] = []
    let settledAt = -1
    let settledDiff = 0
    let settledLost: PieceSymbol[] = []
    const lost: PieceSymbol[] = []
    for (let i = 0; i < pv.length; i++) {
      const u = pv[i]
      if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(u)) break
      const side = g.turn()
      const m = g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] })
      if (!m) break
      san.push(m.san)
      if (i === 0) {
        ev.replySan = m.san
        if (m.captured && m.color !== mover) ev.firstCapture = { by: m.piece, from: m.from, piece: m.captured, square: m.to }
        ev.highlights = [m.from, m.to]
      }
      if (m.captured && side !== mover) lost.push(m.captured)
      if (g.isCheckmate()) {
        if (g.turn() === mover) {
          ev.mateAgainst = true
          settledAt = i
          settledDiff = materialDiff(g.fen(), mover)
          settledLost = [...lost]
        }
        break
      }
      if (!m.captured && !m.promotion) {
        settledAt = i
        settledDiff = materialDiff(g.fen(), mover)
        settledLost = [...lost]
      }
    }
    if (settledAt >= 0) {
      ev.line = san.slice(0, settledAt + 1)
      ev.lineSettled = true
      ev.netMaterial = settledDiff - before
      ev.lostPieces = settledLost
    }
  } catch {
    // no evidence is better than wrong evidence
  }
  return ev
}

const pointsText = (n: number) => (n === 1 ? 'a pawn (1 point)' : `${n} points`)
const lineText = (line: readonly string[]) => line.slice(0, 6).join(' ')

/** The opponent's first move in plain language, e.g. "Black's rook on d8 can capture your bishop on d3 (Rxd3)." */
export function plainReply(f: MoveFacts, ev: Evidence): string | null {
  if (!ev.replySan) return null
  const opp = SIDE[f.color === 'w' ? 'b' : 'w']
  if (ev.firstCapture) return `${opp}'s ${NAME[ev.firstCapture.by]} on ${ev.firstCapture.from} can capture your ${NAME[ev.firstCapture.piece]} on ${ev.firstCapture.square} (${ev.replySan}).`
  return `${opp}'s best reply is ${ev.replySan}.`
}

/**
 * The verified downside as plain sentences, or null when the engine line proved no concrete loss (then nothing is invented). Only a
 * LOSS counts: material behind at the end of the settled engine line (recaptures included) or a forced checkmate. A capture, check
 * or attack on its own is not a downside.
 */
export function describeDownside(f: MoveFacts, ev: Evidence): string | null {
  if (!isWeakGrade(ev.grade) || !ev.replySan || !ev.lineSettled || ev.line.length === 0) return null
  const better = ev.bestSan ? ` The engine preferred ${ev.bestSan}.` : ''
  const plain = plainReply(f, ev)
  if (ev.mateAgainst) return `${plain ?? ''} The engine's best line ends in checkmate: ${lineText(ev.line)}.${better}`.trim()
  if (ev.netMaterial !== undefined && ev.netMaterial <= -1) {
    return `${plain ?? ''} In the engine's best line (${lineText(ev.line)}) you end up ${pointsText(-ev.netMaterial)} of material behind.${better}`.trim()
  }
  return null
}

/** Prompt lines telling the model exactly what is verified about this grade (and nothing else it may assert). */
export function evidenceForPrompt(ev: Evidence, f?: MoveFacts): string {
  const lines = [`Engine grade for this move: ${ev.grade ?? 'unknown'} (completed engine analysis, not your opinion).`]
  if (isWeakGrade(ev.grade)) {
    const down = f ? describeDownside(f, ev) : null
    lines.push(
      down
        ? `Verified by the engine's line (recaptures already counted): ${down} Pieces lost in that line: ${ev.lostPieces.length ? ev.lostPieces.map((p) => NAME[p]).join(', ') : 'none (it is checkmate)'}.`
        : 'The engine line did NOT prove a loss of material or a forced mate, so there is nothing verified to say about the downside: reply with the single word UNAVAILABLE.'
    )
    lines.push(`The explanation MUST state the verified loss in plain words (what is lost and why), naming the reply ${ev.replySan ?? ''}. A good idea may be mentioned, but only AFTER the loss, never instead of it.`)
  } else lines.push('Do not describe this move as a mistake or inaccuracy.')
  if (ev.bestSan) lines.push(`Engine's stronger move: ${ev.bestSan}.`)
  if (ev.capturableBy.length) lines.push(`Opposing pieces CAN legally capture the moved piece (${ev.capturableBy.join(', ')}); never say it is safe, protected or defended.`)
  lines.push(`Moves you may name: ${ev.line.length ? lineText(ev.line) : '(none)'}. Never name any other move, and never invent a tactic, threat or consequence.`)
  return lines.join('\n')
}

// A POSITIVE claim of safety about a piece ("is safe", "protected by", "cannot be captured"). Advice such as "check that your queen is
// safe" or a negated claim is not a claim, and a text that also acknowledges the real capture does not contradict the board.
const SAFETY_CLAIM = /\b(?:is|are|stays?|remains?|looks?|feels?|it's|they're)\s+(?:completely\s+|totally\s+|perfectly\s+|nice and\s+)?(?:safe|protected|defended|guarded)\b|\b(?:protected|defended|guarded|supported)\s+by\b|\bsafe(?:ly)?\s+(?:from|there|on)\b|\bcan(?:'t|not)\s+be\s+(?:captured|taken|attacked)|\bno\s+(?:danger|risk|threat)\b/gi
const NEGATION_BEFORE = /(?:\bnot\b|n't|\bnever\b|\bunless\b|\bbefore\b|\bcheck (?:that|whether|if)\b|\bmake sure\b|\bif\b|\bwhether\b)[^.]{0,30}$/i
const ACKNOWLEDGES_CAPTURE = /\b(?:can|could|will|may|might)\s+(?:still\s+)?(?:simply\s+|just\s+)?(?:be\s+)?(?:captur|tak|win)/i
function claimsSafety(t: string, capturable: readonly string[]): boolean {
  if (capturable.some((c) => t.includes(sanBare(c))) || ACKNOWLEDGES_CAPTURE.test(t)) return false
  for (const m of t.matchAll(SAFETY_CLAIM)) {
    const before = t.slice(Math.max(0, (m.index ?? 0) - 40), m.index ?? 0)
    if (!NEGATION_BEFORE.test(before)) return true
  }
  return false
}
const MOVE_TOKEN = /(?<![A-Za-z0-9.])(?:[KQRBN][a-h]?[1-8]?x?[a-h][1-8]|[a-h]x[a-h][1-8]|O-O(?:-O)?)[+#]?(?![A-Za-z0-9])/g
const LOSS_WORDS = /\b(?:los(?:e|es|ing|t)|loss|behind|down|win(?:s|ning)?\s+(?:your|the|a)|takes?\s+(?:your|the)|captur(?:e|es|ing)\s+(?:your|the)|free|for nothing|mate|checkmate)\b/i
const NEGATIVE = /\b(?:mistake|blunder|error|loses?|lost|weak|bad|careless|inaccura)/i
const OPP_EARLIER = (opp: string) => new RegExp(String.raw`\b${opp}(?:'s)?\s+(?:pawn|knight|bishop|rook|queen|king)\s+(?:arriv|jump|land|came|just|has just|had )`, 'i')

/**
 * Extra checks tied to the move's engine grade and evidence. Returns the first reason to reject, or ok. All conservative: the text
 * must be about this move; it must not describe the opponent's earlier move; it must not call a capturable piece safe; a weak grade
 * needs the verified downside (never enthusiasm alone); a strong grade must not read as an error. This is NOT a full tactical check.
 */
export function vetAgainstGrade(text: string, f: MoveFacts, ev: Evidence): Vetting {
  const t = text.trim()
  const opp = SIDE[f.color === 'w' ? 'b' : 'w']
  const moved = NAME[f.piece]
  const about =
    new RegExp(String.raw`\b${moved}s?\b`, 'i').test(t) || new RegExp(String.raw`\b${f.to}\b`).test(t) || t.includes(sanBare(f.san)) || (!!f.castle && /castl/i.test(t))
  // A weak-grade text is about the CONSEQUENCE of the move: naming the verified reply is what ties it to this move.
  const namesReply = isWeakGrade(ev.grade) && !!ev.replySan && t.includes(sanBare(ev.replySan))
  if (!about && !namesReply) return { ok: false, reason: 'not-about-this-move' }
  if (OPP_EARLIER(opp).test(t)) return { ok: false, reason: 'describes-opponents-earlier-move' }
  if (ev.capturableBy.length > 0 && claimsSafety(t, ev.capturableBy) && (new RegExp(String.raw`\b${moved}\b`, 'i').test(t) || new RegExp(String.raw`\b${f.to}\b`).test(t))) {
    return { ok: false, reason: 'claims-safe-but-capturable' }
  }
  // Any OTHER concrete move named in the text (e.g. "Black can also play Rxe3") is a tactical claim nothing here has verified, so the text
  // is not shown. Only this move, the engine's verified reply, the engine's better move (when it may be shown) and the verified
  // captures of the moved piece may be named. (Bare pawn pushes such as "c6" are not covered by this check.)
  const named = [f.san, ev.replySan, ev.bestSan, ...ev.line, ...ev.capturableBy].filter(Boolean).map((x) => sanBare(x as string))
  for (const m of t.matchAll(MOVE_TOKEN)) if (!named.includes(sanBare(m[0]))) return { ok: false, reason: `mentions-unverified-move:${m[0]}` }
  if (isWeakGrade(ev.grade)) {
    // A weak grade is explained ONLY by a loss the engine line proved. The text must (1) exist alongside such a verified loss,
    // (2) name the engine's reply, (3) say that something is lost, and (4) name what is lost. A text about the move's idea, a
    // check or an attack, or a mention of a square or piece involved, is not an explanation of the grade.
    if (!describeDownside(f, ev) || !ev.replySan) return { ok: false, reason: 'weak-grade-without-verified-downside' }
    if (!t.includes(sanBare(ev.replySan))) return { ok: false, reason: 'weak-grade-text-omits-verified-reply' }
    if (!LOSS_WORDS.test(t)) return { ok: false, reason: 'weak-grade-text-states-no-loss' }
    const lostNames = [...new Set(ev.lostPieces.map((p) => NAME[p]))]
    const whatIsLost = ev.mateAgainst ? /mate/i : new RegExp('\\b(?:' + lostNames.join('|') + ')s?\\b', 'i')
    if (!whatIsLost.test(t)) return { ok: false, reason: 'weak-grade-text-omits-what-is-lost' }
  } else if (NEGATIVE.test(t)) return { ok: false, reason: 'strong-grade-called-an-error' }
  return { ok: true }
}

export type Resolved =
  | { kind: 'model' }
  | { kind: 'evidence'; text: string; reason?: string }
  | { kind: 'unavailable'; fact: string; reason?: string }
  | { kind: 'fact'; text: string; reason?: string }

/**
 * What to show for a move: the model's text if it passes every check; otherwise, for a graded move, the engine-evidence sentence if
 * the search proved a concrete downside, else "Explanation unavailable" with the factual description kept SEPARATE (it does not
 * explain the grade). Ungraded moves (no grade to explain) fall back to the factual description itself.
 * The opponent's verified reply (and the engine's better move) may be named in the text: they are not "another move".
 */
export function resolveExplanation(fields: (string | null | undefined)[] | null, f: MoveFacts, ev: Evidence | null): Resolved {
  let reason: string | undefined = fields ? undefined : 'no-model-text'
  if (fields) {
    const allow = [ev?.replySan, ev?.bestSan].filter(Boolean) as string[]
    // For a weak grade the text explains the loss, so it need not re-describe the capture the move itself made.
    const weakLoss = !!ev && isWeakGrade(ev.grade) && !!ev.replySan
    const base = vetFields(fields, weakLoss ? { ...f, captured: undefined } : f, allow)
    const joined = fields.filter(Boolean).join(' ')
    const graded = base.ok && ev ? vetAgainstGrade(joined, f, ev) : { ok: true as const, reason: undefined }
    if (base.ok && graded.ok) return { kind: 'model' }
    reason = base.reason ?? graded.reason
  }
  if (!ev || !ev.grade) return { kind: 'fact', text: describeFacts(f), reason }
  const down = describeDownside(f, ev)
  if (down) return { kind: 'evidence', text: down, reason }
  return { kind: 'unavailable', fact: describeFacts(f), reason }
}
