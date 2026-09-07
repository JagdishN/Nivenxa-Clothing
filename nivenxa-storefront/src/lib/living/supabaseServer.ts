import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// ─────────────────────────────────────────────────────────────────────────
// Distinct from lib/chess/supabase.ts on purpose: chess has no real user
// sessions (RLS is off there, everything reads through the publishable key
// as an anonymous caller). Living has real per-user, per-apartment sessions
// — every client here is cookie-aware and every query runs *as the signed-in
// user*, so living_schema.sql's RLS policies are what actually decide what
// a call can see or write. There is deliberately no service-role client in
// this file: every Phase 1 operation that needs to act across users (create
// apartment + first admin membership, approve a flat claim, resolve a
// dispute) goes through one of the security-definer RPCs in the schema
// instead, scoped by that function's own auth.uid() check rather than a
// blanket RLS bypass.
//
// Split from supabaseBrowser.ts on purpose: this file imports next/headers,
// which Next.js refuses to let anywhere near a client bundle — even just
// re-exporting it alongside a browser-safe function from the same module is
// enough to pull it in. Keeping them apart is what makes that impossible.
// ─────────────────────────────────────────────────────────────────────────

function assertConfigured(url: string | undefined, key: string | undefined): asserts url is string {
  if (!url || !key) {
    throw new Error(
      'Nivenxa Living is not configured — missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copy .env.local.example to .env.local and fill in your project credentials.'
    )
  }
}

/** Server Components, Route Handlers, Server Actions — reads/sets the session cookie. */
export async function createLivingServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  assertConfigured(url, key)
  const cookieStore = await cookies()

  return createServerClient(url, key!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Parameters<typeof cookieStore.set>[2] }[]) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options ?? {})
        } catch {
          // Called from a Server Component during render, where cookies can't be
          // written — middleware.ts refreshes the session on the next request instead.
        }
      },
    },
  })
}
