import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ADMIN_TOURNAMENTS_COOKIE, isAdminAuthenticated } from '../_auth'

// The one place every /admin/tournaments/* content route is gated — a page
// dropped into this (protected) group inherits the check automatically, no
// per-page auth branch to remember. /admin/tournaments/login sits OUTSIDE
// this group on purpose: it's the redirect target below, so it can't itself
// require being already authenticated without creating a redirect loop.
export default async function AdminTournamentsProtectedLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  if (!isAdminAuthenticated(cookieStore.get(ADMIN_TOURNAMENTS_COOKIE)?.value)) redirect('/admin/tournaments/login')
  return <>{children}</>
}
