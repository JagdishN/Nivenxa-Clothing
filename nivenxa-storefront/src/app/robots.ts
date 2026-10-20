import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

/**
 * Single Next.js App Router app (confirmed: no turbo.json, no root
 * package.json — netlify.toml/vercel.json both point `base`/`rootDirectory`
 * at this directory) serving the whole nivenxa.com domain, so one robots.txt
 * at the root covers every section (/, /technologies, /living, /chess,
 * /studio, /ventures) — no per-app files to reference.
 *
 * /chess/tournaments/<id> result pages publish participants' full names,
 * including a U7 (under-7) category, and used to be disallowed here. Moved
 * to a `robots: { index: false }` tag on that route alone instead
 * (chess/tournaments/[id]/page.tsx) — Disallow only blocks crawling, it
 * doesn't stop an externally-linked URL from being indexed with no content,
 * and a Disallowed URL is never fetched, so a noindex tag on it would never
 * even be read. The two are mutually exclusive, not layered.
 *
 * /admin/ is DELIBERATELY NOT disallowed here, even though it's an internal
 * dashboard — robots.txt is a public file, and a Disallow line on it
 * publishes the panel's existence to anyone reading nivenxa.com/robots.txt.
 * It no longer needs one anyway: every /admin/* route now redirects an
 * unauthenticated request to a dedicated /admin/feedback/login or
 * /admin/tournaments/login page (enforced once per section by a
 * (protected)/layout.tsx, not per page — see those directories), and both
 * login pages carry their own `robots: { index: false }`. No content is
 * ever served without a session, so there's nothing left for a crawler to
 * find under /admin at all.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
