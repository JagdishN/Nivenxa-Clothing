import { createBrowserClient } from '@supabase/ssr'

// See supabaseServer.ts for why this is a separate file, not a second
// export from the same module — this one must never import next/headers.

function assertConfigured(url: string | undefined, key: string | undefined): asserts url is string {
  if (!url || !key) {
    throw new Error(
      'Nivenxa Living is not configured — missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copy .env.local.example to .env.local and fill in your project credentials.'
    )
  }
}

/** Client components (the OTP request/verify forms). */
export function createLivingBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  assertConfigured(url, key)
  return createBrowserClient(url, key!)
}
