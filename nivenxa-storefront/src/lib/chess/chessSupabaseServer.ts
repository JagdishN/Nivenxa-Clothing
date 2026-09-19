import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// ─────────────────────────────────────────────────────────────────────────
// Distinct from lib/chess/supabase.ts (the secret-key admin client used for
// analysis_games/analysis_practice_positions reads/writes, which run as a
// privileged service call, not as a specific user). This file is for real
// user sessions — Nivenxa Chess accounts — needed only for "My Nivenxa
// Games" (an account has to exist before a list of "games I've played" can
// mean anything). It reuses the SAME Supabase project as Living
// (NEXT_PUBLIC_SUPABASE_URL/PUBLISHABLE_KEY) — same auth.users table, so the
// same email resolves to the same underlying account on either surface —
// but `cookieOptions.name` below gives Chess its own session cookie,
// distinct from Living's default one. Logging into Living does NOT log you
// into Chess, and vice versa: two independent sessions sharing one account
// system, not single sign-on. (Before this, both clients used @supabase/ssr's
// default cookie name — same name, same domain — which made them
// indistinguishable to the browser and produced accidental SSO.)
//
// Split from chessSupabaseBrowser.ts for the same reason living/supabaseServer.ts
// is split from living/supabaseBrowser.ts: this imports next/headers, which
// must never end up in a client bundle.
// ─────────────────────────────────────────────────────────────────────────

const CHESS_COOKIE_NAME = 'sb-chess-auth'

function assertConfigured(url: string | undefined, key: string | undefined): asserts url is string {
  if (!url || !key) {
    throw new Error(
      'Nivenxa accounts are not configured — missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
    )
  }
}

/** Server Components, Route Handlers, Server Actions — reads/sets the session cookie. */
export async function createChessServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  assertConfigured(url, key)
  const cookieStore = await cookies()

  return createServerClient(url, key!, {
    cookieOptions: { name: CHESS_COOKIE_NAME },
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Parameters<typeof cookieStore.set>[2] }[]) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options ?? {})
        } catch {
          // Called from a Server Component during render, where cookies can't be written.
        }
      },
    },
  })
}
