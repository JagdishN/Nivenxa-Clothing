import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createHash, timingSafeEqual } from 'node:crypto'

// ─────────────────────────────────────────────────────────────────────────
// A SHARED-PASSWORD GATE, NOT REAL AUTH — see the longer note in page.tsx.
// Factored out here so every route under /admin/tournaments (the list page,
// the per-tournament edit page) checks the same cookie the same way.
// ─────────────────────────────────────────────────────────────────────────

export const ADMIN_TOURNAMENTS_COOKIE = 'nivenxa_admin_tournaments'

export function hashAdminPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

export function isAdminAuthenticated(cookieValue: string | undefined): boolean {
  const expected = process.env.ADMIN_TOURNAMENTS_PASSWORD
  if (!expected || !cookieValue) return false
  const expectedHash = Buffer.from(hashAdminPassword(expected))
  const actual = Buffer.from(cookieValue)
  if (actual.length !== expectedHash.length) return false
  return timingSafeEqual(actual, expectedHash)
}

/** Call at the top of any admin server action — redirects away if the cookie doesn't check out. */
export async function requireAdminAuth() {
  const cookieStore = await cookies()
  if (!isAdminAuthenticated(cookieStore.get(ADMIN_TOURNAMENTS_COOKIE)?.value)) redirect('/admin/tournaments')
}
