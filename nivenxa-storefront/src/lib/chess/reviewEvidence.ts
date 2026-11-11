import { Chess } from 'chess.js'

/**
 * Development/test review evidence. Keeps, IN THIS BROWSER TAB ONLY, a bounded record of what the analysis and the commentary did for
 * each move, so a bad explanation can be turned into a regression fixture without reconstructing the game from a video.
 *
 *  - Enabled only in a non-production build or a build made with NEXT_PUBLIC_CHESS_TEST_HOOKS=1. A normal production build records
 *    nothing and exposes no export.
 *  - Nothing is sent anywhere: the export is a file the tester downloads (or reads from window.__nivenxaEvidence).
 *  - It contains positions, moves, engine settings, grades, the commentary request facts, the returned text, the validation outcome and
 *    the finally displayed text. It never contains credentials, session tokens, emails or profile-picture data (none of those are
 *    ever passed in).
 *  - Bounded: at most MAX_RECORDS moves are kept (oldest dropped).
 */

export const MAX_RECORDS = 300
export const EVIDENCE_SCHEMA = 'nivenxa.review-evidence.v1'

export const ENGINE_INFO = {
  name: 'Stockfish 18 lite (single-thread WebAssembly, /stockfish/stockfish-18-lite-single.js)',
  grading: { bestMoveSearch: 'go movetime 500, MultiPV 1', afterMoveSearch: 'go depth 14, MultiPV 1 (the same search supplies the principal variation used as evidence)' },
} as const

export interface EvidenceRecord {
  session: number
  ply: number
  color: 'w' | 'b'
  san: string
  fenBefore: string
  fenAfter: string
  tier?: string
  assistance?: string
  grade?: { classification: string; evalBeforeCp: number; evalAfterCp: number; cpLoss: number; bestMoveUci: string; bestMoveSan: string; pvUci?: string[] }
  analysisUnavailable?: boolean
  timing?: { queueMs?: number; analysisMs?: number; commentaryQueueMs?: number; commentaryMs?: number }
  commentary?: {
    requestedAt: string
    respondedAt?: string
    revealBestMove: boolean
    facts?: unknown
    evidence?: unknown
    responseStatus?: string
    returned?: { headline?: string; explanation?: string; bullets?: string[]; suggestion?: string; source?: string; reason?: string; rawText?: string }
    validation?: { kind: string; reason?: string }
    displayed?: { source?: string; summary?: string; explanation?: string | null; moveFact?: string }
  }
}

export const evidenceEnabled = (): boolean =>
  typeof window !== 'undefined' && (process.env.NEXT_PUBLIC_CHESS_TEST_HOOKS === '1' || process.env.NODE_ENV !== 'production')

const store = new Map<string, EvidenceRecord>()

export function recordEvidence(session: number, ply: number, patch: Partial<EvidenceRecord> & Pick<EvidenceRecord, 'san' | 'fenBefore' | 'fenAfter' | 'color'>) {
  if (!evidenceEnabled()) return
  const key = `${session}:${ply}`
  const prev = store.get(key)
  const next = { ...(prev ?? { session, ply }), ...patch, commentary: patch.commentary ? { ...(prev?.commentary ?? {}), ...patch.commentary } : prev?.commentary } as EvidenceRecord
  store.delete(key)
  store.set(key, next)
  while (store.size > MAX_RECORDS) store.delete(store.keys().next().value as string)
}

export function dropEvidenceFrom(session: number, ply: number) {
  for (const [k, r] of store) if (r.session === session && r.ply >= ply) store.delete(k)
}

export const clearEvidence = () => store.clear()

/** The export: games grouped by session, each with a canonical PGN rebuilt from the recorded moves. No secrets are ever stored. */
export function exportEvidence() {
  const bySession = new Map<number, EvidenceRecord[]>()
  for (const r of store.values()) bySession.set(r.session, [...(bySession.get(r.session) ?? []), r])
  const games = [...bySession.entries()].map(([session, recs]) => {
    recs.sort((a, b) => a.ply - b.ply)
    let pgn = ''
    let contiguous = true
    try {
      const g = new Chess()
      recs.forEach((r, i) => {
        if (r.ply !== i) contiguous = false
        if (contiguous) g.move(r.san)
      })
      pgn = contiguous ? g.pgn() : ''
    } catch {
      pgn = ''
    }
    return { session, startingFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', pgn, pgnComplete: contiguous, moves: recs }
  })
  return {
    schema: EVIDENCE_SCHEMA,
    exportedAt: new Date().toISOString(),
    build: { appVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? null, testHooks: process.env.NEXT_PUBLIC_CHESS_TEST_HOOKS === '1', nodeEnv: process.env.NODE_ENV },
    engine: ENGINE_INFO,
    note: 'Development/test evidence only. Kept in this tab, never uploaded. Contains no credentials, tokens, emails or profile images.',
    games,
  }
}

/** Installs window.__nivenxaEvidence (export / clear) when evidence is enabled. Safe to call many times. */
export function installEvidenceApi() {
  if (!evidenceEnabled()) return
  ;(window as unknown as { __nivenxaEvidence?: unknown }).__nivenxaEvidence = { export: exportEvidence, clear: clearEvidence }
}

export function downloadEvidence() {
  const blob = new Blob([JSON.stringify(exportEvidence(), null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `nivenxa-review-evidence-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}
