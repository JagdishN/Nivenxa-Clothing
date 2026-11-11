/**
 * Post-login destinations come from a query string, so they are untrusted. A destination is accepted only if it is a
 * path inside the app's own prefix — "/chess", "/chess/…", "/chess?…", "/chess#…" — and nothing that a browser could
 * read as another site or a different path: no scheme, no "//", no backslash, no control characters, no dot-segments.
 * Anything else falls back to the app's default.
 */
export function safeAppRedirect(path: string | null | undefined, prefix: string, fallback: string, deny: string[] = []): string {
  if (!path || typeof path !== 'string' || path.length > 2000) return fallback
  if (!path.startsWith('/') || path.startsWith('//')) return fallback
  if (/[\\\u0000-\u001f\u007f]/.test(path)) return fallback
  if (path.includes('://') || /(^|\/)\.\.?(\/|$|\?|#)/.test(path)) return fallback
  const ok = path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`) || path.startsWith(`${prefix}#`)
  if (!ok) return fallback
  const pathOnly = path.split(/[?#]/)[0]
  if (deny.some((d) => pathOnly === d || pathOnly.startsWith(`${d}/`))) return fallback
  return path
}

export const CHESS_DEFAULT_REDIRECT = '/chess/analysis'
export const LIVING_DEFAULT_REDIRECT = '/living/home'

/** Chess: any /chess page except the sign-in/sign-up routes themselves (they would bounce straight back to the drawer). */
export const safeChessRedirectPath = (p: string | null | undefined) =>
  safeAppRedirect(p, '/chess', CHESS_DEFAULT_REDIRECT, ['/chess/login', '/chess/signup'])

/** Living: only the signed-in app (/living/home, /living/billing, …), never the public/auth routes. */
export const safeLivingRedirectPath = (p: string | null | undefined) =>
  safeAppRedirect(p, '/living', LIVING_DEFAULT_REDIRECT, ['/living/login', '/living/signup', '/living/consent'])
