import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getLivingSession } from '@/lib/living/auth'
import { safeLivingRedirectPath } from '@/lib/auth/safeRedirect'

// Kept so existing links and bookmarks still work: a signed-in visitor goes straight on, everyone else lands on the
// Living home page with the login drawer open. The destination is validated (same-app, signed-in pages only).
export const metadata: Metadata = { robots: { index: false, follow: true } }

export default async function LivingLoginRoute({ searchParams }: { searchParams: Promise<{ redirect?: string }> }) {
  const { redirect: redirectParam } = await searchParams
  const redirectTo = safeLivingRedirectPath(redirectParam)
  const session = await getLivingSession()
  if (session) redirect(redirectTo)
  redirect(`/living?auth=login&redirect=${encodeURIComponent(redirectTo)}`)
}
