import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createHash, timingSafeEqual } from 'node:crypto'

// ─────────────────────────────────────────────────────────────────────────
// A SHARED-PASSWORD GATE, NOT REAL AUTH — same pattern and same limits as
// /admin/tournaments/_auth.ts (no per-admin identity; anyone with the
// password has full access). Kept separate from that gate/cookie/env var
// rather than reused, since the two dashboards are unrelated and a leaked
// tournaments password shouldn't also open the feedback inbox.
// ─────────────────────────────────────────────────────────────────────────

export const ADMIN_FEEDBACK_COOKIE = 'nivenxa_admin_feedback'

export function hashAdminPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

export function isAdminAuthenticated(cookieValue: string | undefined): boolean {
  const expected = process.env.ADMIN_FEEDBACK_PASSWORD
  if (!expected || !cookieValue) return false
  const expectedHash = Buffer.from(hashAdminPassword(expected))
  const actual = Buffer.from(cookieValue)
  if (actual.length !== expectedHash.length) return false
  return timingSafeEqual(actual, expectedHash)
}

/** Call at the top of any admin server action — redirects away if the cookie doesn't check out. */
export async function requireAdminAuth() {
  const cookieStore = await cookies()
  if (!isAdminAuthenticated(cookieStore.get(ADMIN_FEEDBACK_COOKIE)?.value)) redirect('/admin/feedback')
}
