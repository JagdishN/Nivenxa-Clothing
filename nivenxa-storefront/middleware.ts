import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Scoped to /living only (see `matcher` below) — every other route in this
// project (shop, chess, admin) has no session to refresh and is untouched.
// Supabase's access token is short-lived; without this, a Living session
// would silently expire mid-visit instead of refreshing transparently.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (url && key) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value)
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options)
        },
      },
    })

    // Touching getUser() (not getSession()) is what actually triggers a
    // refresh against Supabase when the access token is stale.
    await supabase.auth.getUser()
  }

  // One-time flash message (lib/living/flash.ts) — this request's own
  // Server Component render still sees it via cookies() (that reads the
  // INCOMING request, unaffected by what we do to the outgoing response
  // below), but stripping it here means the browser drops it right after,
  // so it can never resurface on a later navigation or a refresh. A Server
  // Component can't do this bit itself — cookies can't be written during render.
  if (request.cookies.get('living_flash')) {
    response.cookies.delete({ name: 'living_flash', path: '/living' })
  }

  return response
}

export const config = {
  matcher: ['/living/:path*'],
}
