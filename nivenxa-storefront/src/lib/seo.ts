import type { Metadata } from 'next'

/**
 * The one place the production origin is written down. `metadataBase` is
 * set from this in the root layout, which is what lets every other route
 * below pass a relative `path` ('/chess', not 'https://nivenxa.com/chess')
 * and still get fully-qualified `og:url`/canonical links — Next's metadata
 * API resolves relative URLs against `metadataBase` automatically. Nothing
 * else in the app should hardcode nivenxa.com a second time.
 */
export const SITE_URL = 'https://nivenxa.com'
export const SITE_NAME = 'NIVENXA'

/**
 * The one description of how NIVENXA's pieces relate, reused by the home page, the site-wide fallback and the
 * structured data so they cannot drift apart: NIVENXA is the parent identity; NIVENXA Studio and NIVENXA
 * Technologies are brands; NIVENXA Chess and NIVENXA Living are apps.
 */
export const PARENT_META_TITLE = 'NIVENXA — Independent ventures. Built with intention.'
export const PARENT_META_DESCRIPTION =
  'NIVENXA builds independent ventures from Hyderabad, India: the brands NIVENXA Studio and NIVENXA Technologies, and the apps NIVENXA Chess and NIVENXA Living.'

/** A crawlable, absolute logo URL (public/images/Shared/nivenxa-logo.png, 1536x1024). */
export const LOGO_URL = `${SITE_URL}/images/Shared/nivenxa-logo.png`

/**
 * True only for the real production deploy. Netlify sets CONTEXT ('production' | 'deploy-preview' | 'branch-deploy'),
 * Vercel sets VERCEL_ENV. When neither is set (local `next build`/`next start`) this counts as production, so a local
 * production build behaves exactly like the live site. Previews and branch deploys are told not to be indexed
 * (robots.txt and a robots meta tag), so they can never compete with nivenxa.com.
 */
export function isProductionDeploy(env: Record<string, string | undefined> = process.env): boolean {
  if (env.CONTEXT && env.CONTEXT !== 'production') return false
  if (env.VERCEL_ENV && env.VERCEL_ENV !== 'production') return false
  return true
}

/** Absolute production URL for a site path ('/chess' → 'https://nivenxa.com/chess'; '/' → 'https://nivenxa.com'). */
export function absoluteUrl(path: string): string {
  return path === '/' ? SITE_URL : `${SITE_URL}${path}`
}

/** Root-level structured data: ONE Organization and ONE WebSite, cross-referenced by @id. Rendered only on the home page. */
export function parentStructuredData() {
  const orgId = `${SITE_URL}/#organization`
  const siteId = `${SITE_URL}/#website`
  const brand = (name: string, path: string, description: string) => ({ '@type': 'Brand', name, url: absoluteUrl(path), description })
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': orgId,
        name: SITE_NAME,
        url: SITE_URL,
        logo: { '@type': 'ImageObject', url: LOGO_URL, width: 1536, height: 1024 },
        description: PARENT_META_DESCRIPTION,
        address: { '@type': 'PostalAddress', addressLocality: 'Hyderabad', addressRegion: 'Telangana', addressCountry: 'IN' },
        brand: [
          brand('NIVENXA Studio', '/studio/en', 'Premium Indian comfortwear.'),
          brand('NIVENXA Technologies', '/technologies', 'Business software, AI-enabled systems and digital products.'),
        ],
        // sameAs (official profiles) is intentionally omitted until the owner confirms the exact profile URLs.
      },
      { '@type': 'WebSite', '@id': siteId, name: SITE_NAME, alternateName: ['Nivenxa', 'nivenxa.com'], url: SITE_URL, publisher: { '@id': orgId }, inLanguage: 'en' },
    ],
  }
}

export interface SeoMetadataInput {
  title: string
  description: string
  /**
   * This route's own path (e.g. '/chess'), used for both the canonical
   * link and `og:url`. Omit this when the metadata is a LAYOUT-level
   * fallback covering more than one real URL (e.g. every page under
   * /chess) — a canonical or og:url shared across several different pages
   * is actively wrong, not just imprecise, so the exact route's own
   * page.tsx should set `path` itself instead of inheriting one.
   */
  path?: string
  /** 1200x630 only — see TASK 3 in the metadata brief for why this stays optional until real images exist. */
  image?: { path: string; alt: string }
}

export function seoMetadata({ title, description, path, image }: SeoMetadataInput): Metadata {
  const ogImages = image ? [{ url: image.path, width: 1200, height: 630, alt: image.alt }] : undefined
  return {
    title,
    description,
    ...(path ? { alternates: { canonical: path } } : {}),
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title,
      description,
      locale: 'en_IN',
      ...(path ? { url: path } : {}),
      ...(ogImages ? { images: ogImages } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(ogImages ? { images: ogImages } : {}),
    },
  }
}
