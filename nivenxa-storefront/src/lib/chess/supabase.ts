import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────────────────────────────────
// This project's Supabase env vars use Supabase's current key-naming scheme
// (publishable/secret, not the older anon/service_role split): SUPABASE_URL,
// SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY, SUPABASE_JWKS_URL. None of
// these are NEXT_PUBLIC_-prefixed — every current caller (the tournaments
// query layer, the admin page, the puzzle import script) runs server-side or
// as a standalone Node script, so nothing here needs to reach the browser
// bundle. If a client component ever needs direct Supabase access, add
// NEXT_PUBLIC_-prefixed copies of the URL + publishable key rather than
// exposing these.
// ─────────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY

function assertConfigured(url: string | undefined, key: string | undefined, varName: string): asserts url is string {
  if (!url || !key) {
    throw new Error(
      `Supabase is not configured — missing SUPABASE_URL or ${varName}. Copy .env.local.example to .env.local and fill in your project's credentials.`
    )
  }
}

let _supabase: SupabaseClient | null = null
let _supabaseAdmin: SupabaseClient | null = null

/**
 * Standard client, using the publishable key — safe for any server-side read
 * that's meant to be publicly readable once RLS is turned on. RLS is
 * currently OFF on every table (see supabase/schema.sql), so in practice
 * this key can read everything right now regardless of a `verified` filter
 * applied in application code — that's expected until auth + RLS land.
 */
export function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase
  assertConfigured(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, 'SUPABASE_PUBLISHABLE_KEY')
  _supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY!)
  return _supabase
}

/**
 * Privileged client, using the secret key — for server-only writes (the
 * puzzle import script, the admin tournaments page's mutations). NEVER
 * import this from a client component or anything that ships to the
 * browser; there is no build-time guard preventing that, so it's on every
 * caller to only use this from a Server Component, Route Handler, Server
 * Action, or standalone script.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (_supabaseAdmin) return _supabaseAdmin
  assertConfigured(SUPABASE_URL, SUPABASE_SECRET_KEY, 'SUPABASE_SECRET_KEY')
  _supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY!)
  return _supabaseAdmin
}
