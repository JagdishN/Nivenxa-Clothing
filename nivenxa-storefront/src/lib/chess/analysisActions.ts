'use server'
// Split into its own 'use server' file for the same reason as
// puzzleActions.ts: this needs to be safely importable from Client
// Components (My Games list, Verify Game's "Save this game" button), and an
// inline per-function directive doesn't survive once a file is also pulled
// into the client bundle.
import { getSupabaseAdmin } from './supabase'
import { gameNeedsVerification } from './analysisTypes'
import type { GameSource, NormalizedGame, NormalizedMove } from './analysisTypes'
import type { QualityMoveEntry } from './types'

export interface AnalysisGameSummary {
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
  analyzed: boolean
  createdAt: string
}

interface AnalysisGameRow {
  id: string
  owner_id: string
  local_id: string
  source: GameSource
  white: string | null
  black: string | null
  event: string | null
  played_on: string | null
  result: string | null
  starting_fen: string | null
  moves: NormalizedMove[]
  move_count: number
  analysis: QualityMoveEntry[] | null
  accuracy_white: number | null
  accuracy_black: number | null
  created_at: string
  updated_at: string
}

function rowToSummary(row: AnalysisGameRow): AnalysisGameSummary {
  return {
    id: row.id,
    source: row.source,
    white: row.white,
    black: row.black,
    event: row.event,
    playedOn: row.played_on,
    result: row.result,
    moveCount: row.move_count,
    accuracyWhite: row.accuracy_white,
    accuracyBlack: row.accuracy_black,
    analyzed: row.analysis !== null,
    createdAt: row.created_at,
  }
}

function rowToNormalizedGame(row: AnalysisGameRow): NormalizedGame {
  return {
    source: row.source,
    metadata: {
      white: row.white ?? undefined,
      black: row.black ?? undefined,
      event: row.event ?? undefined,
      playedOn: row.played_on ?? undefined,
      result: (row.result as NormalizedGame['metadata']['result']) ?? undefined,
    },
    startingFen: row.starting_fen ?? undefined,
    moves: row.moves,
    needsVerification: gameNeedsVerification(row.moves),
  }
}

export interface SaveAnalysisGameInput {
  ownerId: string
  localId: string
  game: NormalizedGame
  analysis?: QualityMoveEntry[]
  accuracyWhite?: number
  accuracyBlack?: number
}

/** Upserts on (owner_id, local_id) — calling this again for the same reconstruction (Verify, then Game Summary) updates the same row rather than duplicating it. */
export async function saveAnalysisGame(input: SaveAnalysisGameInput): Promise<{ id?: string; error?: string }> {
  if (!input.ownerId) return { error: 'Missing owner id' }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('analysis_games')
    .upsert(
      {
        owner_id: input.ownerId,
        local_id: input.localId,
        source: input.game.source,
        white: input.game.metadata.white ?? null,
        black: input.game.metadata.black ?? null,
        event: input.game.metadata.event ?? null,
        played_on: input.game.metadata.playedOn ?? null,
        result: input.game.metadata.result ?? null,
        starting_fen: input.game.startingFen ?? null,
        moves: input.game.moves,
        move_count: input.game.moves.length,
        analysis: input.analysis ?? null,
        accuracy_white: input.accuracyWhite ?? null,
        accuracy_black: input.accuracyBlack ?? null,
      },
      { onConflict: 'owner_id,local_id' }
    )
    .select('id')
    .single()

  if (error) {
    console.error('saveAnalysisGame: upsert failed —', error.message)
    return { error: 'Failed to save game' }
  }
  return { id: data.id }
}

export async function listMyGames(ownerId: string): Promise<AnalysisGameSummary[]> {
  if (!ownerId) return []

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('analysis_games')
    .select('id, source, white, black, event, played_on, result, move_count, accuracy_white, accuracy_black, analysis, created_at')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('listMyGames: select failed —', error.message)
    return []
  }
  return (data as AnalysisGameRow[]).map(rowToSummary)
}

export async function loadAnalysisGame(
  ownerId: string,
  id: string
): Promise<{ game: NormalizedGame; analysis: QualityMoveEntry[] | null } | null> {
  if (!ownerId || !id) return null

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.from('analysis_games').select('*').eq('owner_id', ownerId).eq('id', id).maybeSingle()

  if (error || !data) {
    if (error) console.error('loadAnalysisGame: select failed —', error.message)
    return null
  }
  const row = data as AnalysisGameRow
  return { game: rowToNormalizedGame(row), analysis: row.analysis }
}

export async function deleteAnalysisGame(ownerId: string, id: string): Promise<{ error?: string }> {
  if (!ownerId || !id) return { error: 'Missing owner id or game id' }

  const supabase = getSupabaseAdmin()
  const { error } = await supabase.from('analysis_games').delete().eq('owner_id', ownerId).eq('id', id)

  if (error) {
    console.error('deleteAnalysisGame: delete failed —', error.message)
    return { error: 'Failed to delete game' }
  }
  return {}
}

export interface PracticePosition {
  id: string
  fen: string
  note: string | null
  createdAt: string
}

export async function savePracticePosition(input: {
  ownerId: string
  fen: string
  note?: string
  sourceGameId?: string
}): Promise<{ id?: string; error?: string }> {
  if (!input.ownerId) return { error: 'Missing owner id' }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('analysis_practice_positions')
    .insert({ owner_id: input.ownerId, fen: input.fen, note: input.note ?? null, source_game_id: input.sourceGameId ?? null })
    .select('id')
    .single()

  if (error) {
    console.error('savePracticePosition: insert failed —', error.message)
    return { error: 'Failed to save position' }
  }
  return { id: data.id }
}

export async function listMyPuzzles(ownerId: string): Promise<PracticePosition[]> {
  if (!ownerId) return []

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('analysis_practice_positions')
    .select('id, fen, note, created_at')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('listMyPuzzles: select failed —', error.message)
    return []
  }
  return (data as { id: string; fen: string; note: string | null; created_at: string }[]).map((row) => ({
    id: row.id,
    fen: row.fen,
    note: row.note,
    createdAt: row.created_at,
  }))
}

export async function deletePracticePosition(ownerId: string, id: string): Promise<{ error?: string }> {
  if (!ownerId || !id) return { error: 'Missing owner id or position id' }

  const supabase = getSupabaseAdmin()
  const { error } = await supabase.from('analysis_practice_positions').delete().eq('owner_id', ownerId).eq('id', id)

  if (error) {
    console.error('deletePracticePosition: delete failed —', error.message)
    return { error: 'Failed to delete position' }
  }
  return {}
}
