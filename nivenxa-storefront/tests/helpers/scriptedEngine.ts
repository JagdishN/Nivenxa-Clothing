import type { Page } from '@playwright/test'
import { Chess } from 'chess.js'

// A scripted UCI engine standing in for the Stockfish WORKER, so engine timing is under test control.
//   - the GAMEPLAY worker (the one given a Skill Level) answers from REPLIES after `gameDelay` ms (computation time);
//   - the ANALYSIS worker answers `go movetime` (best move, eval before) and `go depth` (eval after, side-to-move score)
//     after `analysisDelay` ms, or never when `analysisHang` is set.
// The two explanation endpoints are mocked with per-move delays/failures. Nothing is saved or sent anywhere.

export const REPLIES: Record<string, string> = {
  'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b': 'e7e6', // 1.d4 e6
  'rnbqkbnr/pppp1ppp/4p3/8/3P4/P7/1PP1PPPP/RNBQKBNR b': 'f8b4', // 2.a3 Bb4+
  'rnbqk1nr/pppp1ppp/4p3/8/1b1P4/P1P5/1P2PPPP/RNBQKBNR b': 'b4a5', // 3.c3 Ba5
  'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b': 'f7f6', // 1.e4 f6
  'rnbqkbnr/ppppp1pp/5p2/8/4P3/8/PPPP1PPP/RNBQKBNR w': 'd1h5',
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w': 'e2e4',
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w': 'g1f3',
}
export const BEST: Record<string, string> = {
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w': 'e2e4',
  'rnbqkbnr/pppp1ppp/4p3/8/3P4/8/PPP1PPPP/RNBQKBNR w': 'e2e4',
  'rnbqk1nr/pppp1ppp/4p3/8/1b1P4/P7/1PP1PPPP/RNBQKBNR w': 'c2c3',
  'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w': 'd2d4',
}

/** The engine's position key (board + side to move) after the given SAN moves from the start. */
export function keyAfter(sans: string[]): string {
  const g = new Chess()
  for (const s of sans) g.move(s)
  return g.fen().split(' ').slice(0, 2).join(' ')
}
// Extra scripted lines used by the grade-evidence tests: 1.e4 f6 2.Qh5+ g6, and the opponent's best reply found by the grading search.
REPLIES[keyAfter(['e4', 'f6', 'Qh5+'])] = 'g7g6'
REPLIES[keyAfter(['e4', 'f6', 'Qh5+', 'g6', 'Qxg6+'])] = 'h7g6'
/** What the GRADING search ends on (the opponent's best reply) for a position, e.g. 3.Qxg6+ is answered by ...hxg6. */
export const AFTER_REPLY: Record<string, string> = { [keyAfter(['e4', 'f6', 'Qh5+', 'g6', 'Qxg6+'])]: 'h7g6 d2d4' }

export interface EngineCfg { gameDelay: number; analysisDelay: number; analysisHang: boolean; afterCp: number }

export const engineSource = (c: EngineCfg) => `const R = ${JSON.stringify(REPLIES)}, B = ${JSON.stringify(BEST)}, AR = ${JSON.stringify(AFTER_REPLY)}, C = ${JSON.stringify(c)};
let pos = '', game = false, pend = null;
onmessage = (e) => {
  const m = String(e.data);
  if (m === 'uci') postMessage('uciok');
  else if (m === 'isready') postMessage('readyok');
  else if (m.startsWith('setoption name Skill Level')) game = true;
  else if (m.startsWith('position fen ')) pos = m.slice(13);
  else if (m === 'stop') { if (pend) { clearTimeout(pend.t); const o = pend.out; pend = null; o(); } } // like Stockfish: a stopped search answers at once
  else if (m.startsWith('go')) {
    const f = pos.split(' '), key = f[0] + ' ' + f[1];
    let out;
    if (game) { const mv = R[key] || 'e2e4'; out = () => { postMessage('info depth 10 multipv 1 score cp 20 pv ' + mv); postMessage('bestmove ' + mv); }; if (C.gameDelay) { pend = { out, t: setTimeout(() => { pend = null; out(); }, C.gameDelay) }; } else out(); return; }
    if (C.analysisHang) return;
    if (m.startsWith('go movetime')) { const mv = B[key] || 'e2e4'; out = () => { postMessage('info depth 12 multipv 1 score cp 30 pv ' + mv); postMessage('bestmove ' + mv); }; }
    else { out = () => { const line = AR[key] || 'e2e4'; postMessage('info depth 14 score cp ' + C.afterCp + ' pv ' + line); postMessage('bestmove ' + line.split(' ')[0]); }; }
    if (C.analysisDelay) setTimeout(out, C.analysisDelay); else out();
  }
};`

export interface EngineOpts {
  gameDelay?: number
  analysisDelay?: number
  analysisHang?: boolean
  afterCp?: number
  explainDelay?: Record<string, number | 'never'>
  /** Fixed commentary text for a move (to simulate a model that gets it wrong). */
  explainText?: Record<string, { headline?: string; explanation: string }>
}

export async function installScriptedEngine(page: Page, o: EngineOpts = {}) {
  const cfg: EngineCfg = { gameDelay: o.gameDelay ?? 0, analysisDelay: o.analysisDelay ?? 0, analysisHang: !!o.analysisHang, afterCp: o.afterCp ?? -20 }
  const requests: { move: string; n: number; body: Record<string, unknown> }[] = []
  let n = 0
  await page.route('**/*', async (route) => {
    const r = route.request()
    const url = r.url()
    if (url.includes('/stockfish/stockfish-18-lite-single.js')) return route.fulfill({ contentType: 'application/javascript', body: engineSource(cfg) })
    if (r.method() === 'POST' && /\/api\/chess\/explain-(move|engine-purpose)/.test(url)) {
      const body = JSON.parse(r.postData() ?? '{}')
      const request = ++n
      requests.push({ move: body.move, n: request, body })
      const d = o.explainDelay?.[body.move]
      if (d === 'never') return new Promise(() => undefined)
      if (d) await new Promise((res) => setTimeout(res, d))
      const fixed = o.explainText?.[body.move]
      if (fixed) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ bullets: [], ...fixed }) })
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ headline: `${body.move} — Reply ${request}`, explanation: `Reply ${request} for ${body.move}. It follows a plan.`, bullets: [] }),
      })
    }
    if (r.method() === 'POST' && (r.headers()['next-action'] || url.includes('/api/'))) return route.abort()
    return route.continue()
  })
  return { requests }
}
