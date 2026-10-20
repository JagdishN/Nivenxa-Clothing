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
