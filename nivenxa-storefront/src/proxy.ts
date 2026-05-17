import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'
import { NextRequest, NextResponse } from 'next/server'

const intlMiddleware = createMiddleware(routing)

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Determine if the path is a locale root (e.g. /en, /hi, /)
  const localeRootPattern = new RegExp(
    `^/(${routing.locales.join('|')})?/?$`
  )

  if (!localeRootPattern.test(pathname)) {
    // Extract locale from the path if present, fallback to default
    const localeMatch = pathname.match(
      new RegExp(`^/(${routing.locales.join('|')})(/|$)`)
    )
    const locale = localeMatch ? localeMatch[1] : routing.defaultLocale
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}`
    return NextResponse.redirect(url)
  }

  return intlMiddleware(request)
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
