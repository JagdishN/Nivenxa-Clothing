// Calls the REAL configured explanation endpoint (the server's own ANTHROPIC_API_KEY; nothing is printed about the key) with
// fixed positions and shows what the server returned and what the page would finally display after the client-side checks.
//   BASE_URL=http://localhost:3100 npx tsx scripts/real-commentary-check.mts
import { writeFileSync } from 'node:fs'
import { Chess } from 'chess.js'
import { buildEvidence, buildMoveFacts, resolveExplanation, type Grade } from '../src/lib/chess/moveFacts'

const BASE = process.env.BASE_URL ?? 'http://localhost:3100'
interface Case { name: string; fenBefore: string; san: string; grade: Grade; replyUci?: string; best?: string; depth: 'rich' | 'brief' | 'plain' | 'minimal'; history?: string[]; cp: [number, number] }
const cases: Case[] = [
  { name: '1.d4 (good opening move)', fenBefore: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', san: 'd4', grade: 'good', depth: 'rich', cp: [30, 20] },
  { name: '3.Qxg6+ (blunder: ...hxg6 wins the queen)', fenBefore: 'rnbqkbnr/ppppp2p/5pp1/7Q/4P3/8/PPPP1PPP/RNB1KBNR w KQkq - 0 3', san: 'Qxg6+', grade: 'blunder', replyUci: 'h7g6', depth: 'rich', cp: [40, -700] },
  { name: '21.Qd7+ (blunder: protected from the king, but ...Qxd7)', fenBefore: '3qk3/8/4P3/3Q4/8/8/8/4K3 w - - 0 21', san: 'Qd7+', grade: 'blunder', replyUci: 'd8d7', depth: 'rich', cp: [900, -900] },
  { name: '6.b3-style quiet move graded a mistake (no concrete refutation)', fenBefore: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', san: 'b3', grade: 'mistake', depth: 'rich', cp: [30, -150] },
  { name: '13.hxg4-style capture graded a mistake (…Bxg4 retakes)', fenBefore: 'r2qkb1r/pppb1ppp/2n5/4p3/6n1/7P/PPPPPPP1/RNBQKBNR w KQkq - 0 5', san: 'hxg4', grade: 'mistake', replyUci: 'd7g4', depth: 'rich', cp: [20, -250] },
]

const out: unknown[] = []
for (const c of cases) {
  const g = new Chess(c.fenBefore)
  g.move(c.san)
  const fenAfter = g.fen()
  const facts = buildMoveFacts({ fenBefore: c.fenBefore, fenAfter, san: c.san, ply: 20, historySan: c.history ?? [] })
  if (!facts) { console.log('SKIP (not legal)', c.name); continue }
  const ev = buildEvidence(facts, { grade: c.grade, replyUci: c.replyUci })
  const body = { fen: c.fenBefore, move: c.san, classification: c.grade, evalBefore: c.cp[0], evalAfter: c.cp[1], tone: 'simple', depth: c.depth, recentMovesSan: [], fenAfter, ply: 20, historySan: [], replyUci: c.replyUci }
  const t0 = Date.now()
  let status = 0, data: Record<string, unknown> = {}
  try {
    const res = await fetch(`${BASE}/api/chess/explain-move`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    status = res.status
    data = (await res.json()) as Record<string, unknown>
  } catch (e) { data = { fetchError: String(e) } }
  const ms = Date.now() - t0
  const fields = status === 200 && data.source !== 'rejected' ? [data.headline as string, data.explanation as string, ...((data.bullets as string[]) ?? []), data.suggestion as string, data.notice as string] : null
  const shown = resolveExplanation(fields, facts, ev)
  const row = { case: c.name, grade: c.grade, status, ms, serverSource: data.source ?? null, serverText: data.explanation ?? data.error ?? null, serverReason: data.reason ?? null, finallyShown: shown }
  out.push(row)
  console.log(JSON.stringify(row))
}
writeFileSync('docs/chess-real-commentary-check.json', JSON.stringify({ checkedAt: new Date().toISOString(), base: BASE, note: 'Real configured endpoint (server key). 5 fixed positions, one call each: a spot check, not a statistical accuracy measurement.', rows: out }, null, 2))
