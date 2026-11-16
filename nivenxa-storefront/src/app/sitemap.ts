import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'
import { getThemeSummaries } from '@/lib/chess/puzzles'
import { BASICS } from '@/lib/chess/basics/data'
import { TACTICS } from '@/lib/chess/tactics/data'
import { ENDGAMES } from '@/lib/chess/endgames/data'
import { OPENINGS } from '@/lib/chess/openings/data'
import { RULES } from '@/lib/chess/rules/data'

// The home page is the bare origin, matching its canonical link exactly.
function url(path: string): string {
  return path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`
}

// Every real, publicly indexable route that returns 200 and declares ITSELF as its canonical. Deliberately left out:
//  - /ventures: a "Coming Soon" placeholder (noindex), nothing to rank;
//  - /studio/<locale> for every locale but English: the Studio holding page is identical in all 16 languages, so each
//    canonicalises to /studio/en (see studio/[locale]/page.tsx) and only that URL is listed;
//  - tournament result and feedback pages (noindex: they name participants), /admin, auth pages, session-only tool
//    pages under /chess/analysis and /chess/activity, and every /living dashboard route (all behind a login).
// No lastmod / changefreq / priority: none of them has a reliable source, and inventing one is worse than omitting it.
const STATIC_ROUTES = [
  '/',
  '/technologies',
  '/living',
  '/chess',
  '/chess/play',
  '/chess/learn',
  '/chess/learn/basics',
  '/chess/learn/tactics',
  '/chess/learn/endgames',
  '/chess/learn/openings',
  '/chess/learn/rules',
  // Real standalone content (a chess-history timeline).
  '/chess/learn-more',
  '/chess/analysis',
  '/chess/puzzles',
  '/chess/tournaments',
  '/chess/tournaments/archive',
  '/chess/tournaments/gallery',
  '/studio/en',
  // Public notices and contact details.
  '/contact',
  '/privacy',
  '/terms',
  '/chess/privacy',
  '/chess/terms',
  '/living/privacy',
  '/living/terms',
] as const

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Only themes that actually have at least one puzzle right now — pulled
  // from the live data, not the full 18-entry curated PUZZLE_THEMES list,
  // so a theme that's ever emptied out drops out of the sitemap on its own.
  // A failed load drops the puzzle URLs from this sitemap run rather than failing the whole sitemap.
  const themeSummaries = await getThemeSummaries().catch(() => [])

  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({ url: url(path) }))

  for (const summary of themeSummaries) entries.push({ url: url(`/chess/puzzles/${summary.theme}`) })
  for (const lesson of BASICS) entries.push({ url: url(`/chess/learn/basics/${lesson.slug}`) })
  for (const tactic of TACTICS) entries.push({ url: url(`/chess/learn/tactics/${tactic.slug}`) })
  for (const endgame of ENDGAMES) entries.push({ url: url(`/chess/learn/endgames/${endgame.slug}`) })
  for (const opening of OPENINGS) entries.push({ url: url(`/chess/learn/openings/${opening.slug}`) })
  for (const rule of RULES) entries.push({ url: url(`/chess/learn/rules/${rule.slug}`) })

  return entries
}
