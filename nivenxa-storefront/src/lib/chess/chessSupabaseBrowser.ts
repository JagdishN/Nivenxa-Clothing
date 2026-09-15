import { createBrowserClient } from '@supabase/ssr'

// See chessSupabaseServer.ts for why this is a separate file, why it points
// at the same project as Living, and why CHESS_COOKIE_NAME must match the
// name used there exactly — otherwise the server and browser clients would
// read/write two different cookies and no session would ever be seen by both.
const CHESS_COOKIE_NAME = 'sb-chess-auth'

function assertConfigured(url: string | undefined, key: string | undefined): asserts url is string {
  if (!url || !key) {
    throw new Error(
      'Nivenxa accounts are not configured — missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
    )
  }
}

/** Client components (the Log In / Sign Up OTP forms, and sign-out). */
export function createChessBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  assertConfigured(url, key)
  return createBrowserClient(url, key!, { cookieOptions: { name: CHESS_COOKIE_NAME } })
}
