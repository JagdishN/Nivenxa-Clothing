import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getChessSession, safeChessRedirect } from '@/lib/chess/chessAuth'

// Kept so existing links and bookmarks still work: signed-in visitors go straight on to their destination, everyone
// else lands on the Chess home page with the login drawer open. The destination is validated (same-site /chess paths only).
export const metadata: Metadata = { robots: { index: false, follow: true } }

export default async function ChessAuthRoute({ searchParams }: { searchParams: Promise<{ redirect?: string }> }) {
  const { redirect: redirectParam } = await searchParams
  const redirectTo = safeChessRedirect(redirectParam)
  const session = await getChessSession()
  if (session) redirect(redirectTo)
  redirect(`/chess?auth=login&redirect=${encodeURIComponent(redirectTo)}`)
}
