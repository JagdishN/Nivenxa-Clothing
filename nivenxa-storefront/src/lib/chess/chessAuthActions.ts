'use server'
import { redirect } from 'next/navigation'
import { createChessServerClient } from './chessSupabaseServer'

export async function signOutChess(): Promise<void> {
  const supabase = await createChessServerClient()
  await supabase.auth.signOut()
  redirect('/chess/analysis')
}
