import { NextRequest, NextResponse } from 'next/server'
import { getChessSession } from '@/lib/chess/chessAuth'
import { getSupabaseAdmin } from '@/lib/chess/supabase'
import { cleanIds } from '@/lib/chess/coachIntro'

// Coach-introduction progress for the SIGNED-IN player. The account always comes from the server session: a user id in the
// request is never read. POST only ever ADDS completed game ids (unique per account), so merging guest progress after sign-in
// can neither double count nor lower what the account already has.

const unavailable = (code?: string) => code === '42P01' || code === 'PGRST205' || code === '42703'

async function listIds(userId: string): Promise<{ ids: string[] } | { error: number }> {
  const { data, error } = await getSupabaseAdmin().from('chess_coach_intro_games').select('local_id').eq('user_id', userId).order('completed_at', { ascending: true }).limit(50)
  if (error) return { error: unavailable(error.code) ? 503 : 500 }
  return { ids: (data ?? []).map((r: { local_id: string }) => r.local_id) }
}

export async function GET() {
  const session = await getChessSession()
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const r = await listIds(session.userId)
  return 'error' in r ? NextResponse.json({ error: 'Progress is unavailable right now' }, { status: r.error }) : NextResponse.json({ ids: r.ids })
}

export async function POST(request: NextRequest) {
  const session = await getChessSession()
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  let body: { ids?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const ids = cleanIds(body.ids)
  if (ids.length > 0) {
    const { error } = await getSupabaseAdmin()
      .from('chess_coach_intro_games')
      .upsert(
        ids.map((local_id) => ({ user_id: session.userId, local_id })),
        { onConflict: 'user_id,local_id', ignoreDuplicates: true }
      )
    if (error) return NextResponse.json({ error: 'Progress could not be saved' }, { status: unavailable(error.code) ? 503 : 500 })
  }
  const r = await listIds(session.userId)
  return 'error' in r ? NextResponse.json({ error: 'Progress is unavailable right now' }, { status: r.error }) : NextResponse.json({ ids: r.ids })
}
