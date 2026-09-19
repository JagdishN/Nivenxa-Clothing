import { createChessServerClient } from './chessSupabaseServer'

export interface ChessSession {
  userId: string
  email: string | null
}

/**
 * Read-only session check — chess has no "membership" concept like Living
 * (no apartment/role gate), just "does a Nivenxa account exist for this
 * browser." Used by the landing page's "My Nivenxa Games" card and the
 * login/signup pages themselves; nothing in chess redirects on a missing
 * session — Import a Game and Self Analysis stay fully usable as a guest.
 */
export async function getChessSession(): Promise<ChessSession | null> {
  const supabase = await createChessServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  return { userId: user.id, email: user.email ?? null }
}

const DEFAULT_REDIRECT = '/chess/analysis'

/** Only ever follow a same-site chess path — an unvalidated `?redirect=` query param is an open-redirect vector. */
export function safeChessRedirect(path: string | undefined): string {
  if (!path || !path.startsWith('/chess') || path.startsWith('//')) return DEFAULT_REDIRECT
  return path
}
