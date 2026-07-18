import createMiddleware from 'next-intl/middleware'
import { type NextRequest, NextResponse } from 'next/server'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing)

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 301: /en/* (and any other bare locale) → /studio/{locale}/*
  for (const locale of routing.locales) {
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      const url = request.nextUrl.clone()
      url.pathname = `/studio${pathname}`
      return NextResponse.redirect(url, 301)
    }
  }

  // /studio/ (no locale) → /studio/en/
  if (pathname === '/studio' || pathname === '/studio/') {
    const url = request.nextUrl.clone()
    url.pathname = '/studio/en'
    return NextResponse.redirect(url, 301)
  }

  // Only run intlMiddleware for /studio/* paths.
  // Let /, /technologies, /chess, /ventures pass straight through to Next.js routing.
  if (pathname.startsWith('/studio/')) {
    return intlMiddleware(request)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match all paths except Next.js internals, static files, and API routes
    '/((?!api|_next/static|_next/image|favicon\\.ico|.*\\..*).*)',
  ],
}
