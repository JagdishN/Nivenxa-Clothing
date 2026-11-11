'use server'
// My Activity data access. Every function here:
//  - takes its identity from the server session (getChessSession) — a user id sent by the client is never read;
//  - filters every query by that user id, so one player can never list, open, export or link another player's records;
//  - returns only summary columns for lists (no moves, no PGN, no analysis payloads) in bounded pages (keyset paging);
//  - reports "not signed in", "storage not ready" and "failed" as different results, never as an empty list.
import { getSupabaseAdmin } from './supabase'
import { getChessSession } from './chessAuth'
import { PAGE_SIZE, encodeCursor, parseCursor, type Cursor } from './activityFormat'
import { buildPgn, textFromSans, type StoredGame } from './gamePgn'
import type { GameSource } from './analysisTypes'

export type Failure = { ok: false; reason: 'auth' | 'unavailable' | 'error' }
export type Page<T> = { ok: true; rows: T[]; next: string | null } | Failure

function failure(error: { code?: string; message?: string } | null): Failure {
  const code = error?.code ?? ''
  // 42P01 = undefined table (Postgres), PGRST205 = table not in the schema cache (PostgREST), 42703 = undefined column
  if (code === '42P01' || code === 'PGRST205' || code === '42703') return { ok: false, reason: 'unavailable' }
  return { ok: false, reason: 'error' }
}

/** Keyset predicate: rows strictly older than the cursor in (column desc, id desc) order. */
function olderThan(c: Cursor | null, column: string): string | null {
  return c ? `${column}.lt.${c.at},and(${column}.eq.${c.at},id.lt.${c.id})` : null
}

function pageOf<T extends { id: string }>(rows: T[], atOf: (r: T) => string): { rows: T[]; next: string | null } {
  if (rows.length <= PAGE_SIZE) return { rows, next: null }
  const shown = rows.slice(0, PAGE_SIZE)
  const last = shown[shown.length - 1]
  return { rows: shown, next: encodeCursor({ at: atOf(last), id: last.id }) }
}

// ─── Played games ─────────────────────────────────────────────────────────

export interface PlayedGameSummary {
  id: string
  status: 'in_progress' | 'completed' | 'resigned' | 'abandoned'
  playerColor: 'w' | 'b'
  opponent: string
  tier: string | null
  timeControl: string | null
  result: '1-0' | '0-1' | '1/2-1/2' | '*' | null
  moveCount: number
  analysisGameId: string | null
  startedAt: string
}

export type GameFilter = 'all' | 'won' | 'lost' | 'draw' | 'analysed'

interface GameRow {
  id: string
  status: PlayedGameSummary['status']
  player_color: 'w' | 'b'
  opponent: string
  tier: string | null
  time_control: string | null
  result: PlayedGameSummary['result']
  move_count: number
  analysis_game_id: string | null
  started_at: string
}

const GAME_COLUMNS = 'id, status, player_color, opponent, tier, time_control, result, move_count, analysis_game_id, started_at'

export async function listPlayedGames(input: { cursor?: string; filter?: GameFilter }): Promise<Page<PlayedGameSummary>> {
  const session = await getChessSession()
  if (!session) return { ok: false, reason: 'auth' }
  const supabase = getSupabaseAdmin()
  let q = supabase.from('chess_games').select(GAME_COLUMNS).eq('user_id', session.userId).order('started_at', { ascending: false }).order('id', { ascending: false })
  const older = olderThan(parseCursor(input.cursor), 'started_at')
  if (older) q = q.or(older)
  switch (input.filter) {
    case 'won':
      q = q.or('and(player_color.eq.w,result.eq.1-0),and(player_color.eq.b,result.eq.0-1)')
      break
    case 'lost':
      q = q.or('and(player_color.eq.w,result.eq.0-1),and(player_color.eq.b,result.eq.1-0)')
      break
    case 'draw':
      q = q.eq('result', '1/2-1/2')
      break
    case 'analysed':
      q = q.not('analysis_game_id', 'is', null)
      break
  }
  const { data, error } = await q.limit(PAGE_SIZE + 1)
  if (error) {
    console.error('listPlayedGames failed —', error.code, error.message)
    return failure(error)
  }
  const rows = (data as GameRow[]).map<PlayedGameSummary>((r) => ({
    id: r.id,
    status: r.status,
    playerColor: r.player_color,
    opponent: r.opponent,
    tier: r.tier,
    timeControl: r.time_control,
    result: r.result,
    moveCount: r.move_count,
    analysisGameId: r.analysis_game_id,
    startedAt: r.started_at,
  }))
  return { ok: true, ...pageOf(rows, (r) => r.startedAt) }
}

export interface SaveGameInput {
  localId: string
  status: 'completed' | 'resigned'
  playerColor: 'w' | 'b'
  opponent: string
  tier: string | null
  timeControl: string | null
  result: '1-0' | '0-1' | '1/2-1/2'
  movesSan: string[]
  startingFen?: string | null
  startedAt: string
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Saves a FINISHED game once. Idempotent on (user, local_id): a retry or double click updates the same row. Only called
 * when a game ends — never per move and never for clock ticks. Guests are not saved (returns reason 'auth').
 */
export async function saveFinishedGame(input: SaveGameInput): Promise<{ ok: true; id: string } | Failure> {
  const session = await getChessSession()
  if (!session) return { ok: false, reason: 'auth' }
  if (!UUID.test(input.localId) || input.movesSan.length === 0 || input.movesSan.length > 1000) return { ok: false, reason: 'error' }
  if (!['w', 'b'].includes(input.playerColor) || !['1-0', '0-1', '1/2-1/2'].includes(input.result)) return { ok: false, reason: 'error' }
  const text = textFromSans(input.movesSan.map((s) => String(s).slice(0, 12)))
  if (text.length > 8000 || Number.isNaN(Date.parse(input.startedAt))) return { ok: false, reason: 'error' }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('chess_games')
    .upsert(
      {
        user_id: session.userId,
        local_id: input.localId,
        status: input.status,
        player_color: input.playerColor,
        opponent: input.opponent.slice(0, 80),
        tier: input.tier?.slice(0, 40) ?? null,
        time_control: input.timeControl?.slice(0, 60) ?? null,
        result: input.result,
        starting_fen: input.startingFen ?? null,
        moves_san: text,
        move_count: input.movesSan.length,
        started_at: input.startedAt,
        ended_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,local_id' }
    )
    .select('id')
    .single()
  if (error) {
    console.error('saveFinishedGame failed —', error.code, error.message)
    return failure(error)
  }
  return { ok: true, id: data.id as string }
}

/** One owned game with its moves, for Replay / Analyse / PGN. Detail is loaded only when a game is opened. */
export async function getPlayedGame(id: string): Promise<({ ok: true; game: StoredGame & { id: string; analysisGameId: string | null; moveCount: number } }) | Failure | { ok: false; reason: 'notfound' }> {
  const session = await getChessSession()
  if (!session) return { ok: false, reason: 'auth' }
  if (!UUID.test(id)) return { ok: false, reason: 'notfound' }
  const { data, error } = await getSupabaseAdmin()
    .from('chess_games')
    .select('id, player_color, opponent, result, moves_san, starting_fen, started_at, time_control, analysis_game_id, move_count')
    .eq('id', id)
    .eq('user_id', session.userId)
    .maybeSingle()
  if (error) return failure(error)
  if (!data) return { ok: false, reason: 'notfound' }
  return {
    ok: true,
    game: {
      id: data.id,
      movesSan: data.moves_san,
      startingFen: data.starting_fen,
      playerColor: data.player_color,
      opponent: data.opponent,
      result: data.result,
      startedAt: data.started_at,
      timeControl: data.time_control,
      analysisGameId: data.analysis_game_id,
      moveCount: data.move_count,
    },
  }
}

export async function getPlayedGamePgn(id: string): Promise<{ ok: true; pgn: string; filename: string } | { ok: false; reason: string }> {
  const res = await getPlayedGame(id)
  if (!res.ok) return { ok: false, reason: res.reason }
  const pgn = buildPgn(res.game)
  if (!pgn) return { ok: false, reason: 'error' }
  return { ok: true, pgn, filename: `nivenxa-game-${(res.game.startedAt ?? '').slice(0, 10) || res.game.id.slice(0, 8)}.pgn` }
}

/**
 * Links a saved analysis to the game it analyses. Both rows must belong to the signed-in user; an analysis is never
 * attached to someone else's game, and the game's moves are not copied.
 */
export async function linkAnalysisToPlayedGame(playedGameId: string, analysisGameId: string): Promise<{ ok: boolean }> {
  const session = await getChessSession()
  if (!session || !UUID.test(playedGameId) || !UUID.test(analysisGameId)) return { ok: false }
  const supabase = getSupabaseAdmin()
  const { data: analysis } = await supabase.from('analysis_games').select('id').eq('id', analysisGameId).eq('user_id', session.userId).maybeSingle()
  if (!analysis) return { ok: false }
  const { error } = await supabase.from('chess_games').update({ analysis_game_id: analysisGameId }).eq('id', playedGameId).eq('user_id', session.userId)
  return { ok: !error }
}

// ─── Saved analyses ───────────────────────────────────────────────────────

export interface SavedAnalysisSummary {
  id: string
  source: GameSource
  white: string | null
  black: string | null
  event: string | null
  playedOn: string | null
  result: string | null
  moveCount: number
  accuracyWhite: number | null
  accuracyBlack: number | null
  /** True once the engine pass has been saved with it. (Analysis runs in the player's browser; there is no server queue.) */
  analysed: boolean
  createdAt: string
}

export type AnalysisFilter = 'all' | 'analysed' | 'not-analysed'

interface AnalysisRow {
  id: string
  source: GameSource
  white: string | null
  black: string | null
  event: string | null
  played_on: string | null
  result: string | null
  move_count: number
  accuracy_white: number | null
  accuracy_black: number | null
  created_at: string
}

export async function listSavedAnalyses(input: { cursor?: string; filter?: AnalysisFilter }): Promise<Page<SavedAnalysisSummary>> {
  const session = await getChessSession()
  if (!session) return { ok: false, reason: 'auth' }
  let q = getSupabaseAdmin()
    // Summary columns only: `moves` and `analysis` (the large JSON) are never fetched for a list.
    .from('analysis_games')
    .select('id, source, white, black, event, played_on, result, move_count, accuracy_white, accuracy_black, created_at')
    .eq('user_id', session.userId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
  const older = olderThan(parseCursor(input.cursor), 'created_at')
  if (older) q = q.or(older)
  // Accuracy is written in the same save as the engine pass, so it marks "analysed" without touching the payload.
  if (input.filter === 'analysed') q = q.not('accuracy_white', 'is', null)
  if (input.filter === 'not-analysed') q = q.is('accuracy_white', null).is('accuracy_black', null)
  const { data, error } = await q.limit(PAGE_SIZE + 1)
  if (error) {
    console.error('listSavedAnalyses failed —', error.code, error.message)
    return failure(error)
  }
  const rows = (data as AnalysisRow[]).map<SavedAnalysisSummary>((r) => ({
    id: r.id,
    source: r.source,
    white: r.white,
    black: r.black,
    event: r.event,
    playedOn: r.played_on,
    result: r.result,
    moveCount: r.move_count,
    accuracyWhite: r.accuracy_white,
    accuracyBlack: r.accuracy_black,
    analysed: r.accuracy_white !== null || r.accuracy_black !== null,
    createdAt: r.created_at,
  }))
  return { ok: true, ...pageOf(rows, (r) => r.createdAt) }
}

// ─── Puzzle history ───────────────────────────────────────────────────────

export interface PuzzleAttemptSummary {
  id: string
  puzzleId: string
  lichessId: string | null
  rating: number | null
  themes: string[]
  solved: boolean
  outcome: string | null
  hintsUsed: number | null
  wrongAttempts: number | null
  attemptedAt: string
}

interface AttemptRow {
  id: string
  puzzle_id: string
  solved: boolean
  outcome?: string | null
  hints_used?: number | null
  wrong_attempts?: number | null
  attempted_at: string
  puzzles: { lichess_puzzle_id: string | null; rating: number | null; themes: string[] | null } | { lichess_puzzle_id: string | null; rating: number | null; themes: string[] | null }[] | null
}

export type PuzzleFilter = 'all' | 'solved' | 'assisted' | 'skipped'

export async function listPuzzleHistory(input: { cursor?: string; filter?: PuzzleFilter }): Promise<Page<PuzzleAttemptSummary>> {
  const session = await getChessSession()
  if (!session) return { ok: false, reason: 'auth' }
  const supabase = getSupabaseAdmin()
  const run = (withOutcome: boolean) => {
    let q = supabase
      .from('puzzle_attempts')
      .select(`id, puzzle_id, solved, ${withOutcome ? 'outcome, hints_used, wrong_attempts, ' : ''}attempted_at, puzzles(lichess_puzzle_id, rating, themes)`)
      .eq('user_id', session.userId)
      .order('attempted_at', { ascending: false })
      .order('id', { ascending: false })
    const older = olderThan(parseCursor(input.cursor), 'attempted_at')
    if (older) q = q.or(older)
    if (withOutcome) {
      if (input.filter === 'solved') q = q.in('outcome', ['solved', 'solved_with_hint'])
      if (input.filter === 'assisted') q = q.in('outcome', ['solved_with_hint', 'solution_viewed'])
      if (input.filter === 'skipped') q = q.eq('outcome', 'skipped')
    } else if (input.filter === 'solved') q = q.eq('solved', true)
    return q.limit(PAGE_SIZE + 1)
  }
  let { data, error } = await run(true)
  // The outcome columns come from a migration that may not be applied yet: fall back to solved/not-solved.
  if (error?.code === '42703') ({ data, error } = await run(false))
  if (error) {
    console.error('listPuzzleHistory failed —', error.code, error.message)
    return failure(error)
  }
  const rows = (data as unknown as AttemptRow[]).map<PuzzleAttemptSummary>((r) => {
    const p = Array.isArray(r.puzzles) ? r.puzzles[0] : r.puzzles
    return {
      id: r.id,
      puzzleId: r.puzzle_id,
      lichessId: p?.lichess_puzzle_id ?? null,
      rating: p?.rating ?? null,
      themes: p?.themes ?? [],
      solved: r.solved,
      outcome: r.outcome ?? null,
      hintsUsed: r.hints_used ?? null,
      wrongAttempts: r.wrong_attempts ?? null,
      attemptedAt: r.attempted_at,
    }
  })
  return { ok: true, ...pageOf(rows, (r) => r.attemptedAt) }
}
