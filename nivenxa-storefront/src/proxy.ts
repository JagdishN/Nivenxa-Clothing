import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'
import type { NextRequest } from 'next/server'

const intlMiddleware = createMiddleware(routing)

// Next.js 16 requires the named export `proxy` (middleware.ts is deprecated).
export function proxy(request: NextRequest) {
  return intlMiddleware(request)
}

export const config = {
  matcher: [
    // Run on every path except Next.js internals, static files,
    // and non-locale app segments: /chess, /ventures (and sub-paths).
    '/((?!_next|_vercel|chess|ventures|.*\..*).*)',
  ],
}
