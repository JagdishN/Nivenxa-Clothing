import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'
import { getThemeSummaries } from '@/lib/chess/puzzles'
import { BASICS } from '@/lib/chess/basics/data'
import { TACTICS } from '@/lib/chess/tactics/data'
import { ENDGAMES } from '@/lib/chess/endgames/data'
import { OPENINGS } from '@/lib/chess/openings/data'
import { RULES } from '@/lib/chess/rules/data'
import { routing, getPathname } from '@/i18n/routing'

function url(path: string): string {
  return `${SITE_URL}${path}`
}

// Every real, publicly indexable, non-gated route in the app — see the
// robots.ts comment and this task's own report for what's deliberately left
// out (tournament result pages, /admin, auth pages, session-only tool
// sub-pages under /chess/analysis, and every /living dashboard route, which
// are all behind a login redirect and have nothing to index anyway).
const STATIC_ROUTES = [
  '/',
  '/technologies',
  '/living',
  '/ventures',
  '/chess',
  '/chess/play',
  '/chess/learn',
  '/chess/learn/basics',
  '/chess/learn/tactics',
  '/chess/learn/endgames',
  '/chess/learn/openings',
  '/chess/learn/rules',
  // Real standalone content (a chess-history timeline), just not linked from
  // anywhere else in the app right now — exactly what a sitemap is for.
  '/chess/learn-more',
  '/chess/analysis',
  '/chess/puzzles',
  '/chess/tournaments',
  '/chess/tournaments/archive',
  '/chess/tournaments/gallery',
] as const

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Only themes that actually have at least one puzzle right now — pulled
  // from the live data, not the full 18-entry curated PUZZLE_THEMES list,
  // so a theme that's ever emptied out drops out of the sitemap on its own.
  const themeSummaries = await getThemeSummaries()

  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: url(path),
    // The one genuinely evidenced distinction in this set: /chess/tournaments
    // is explicitly force-dynamic to "reflect the latest admin-set
    // Nivenxa-organized tournament" (see its page.tsx) — a live listing that
    // changes on an admin's schedule, unlike every other route here, which
    // is either fully static content or an aggregating archive. No other
    // route gets a changeFrequency/priority value — there's no real signal
    // backing one, and filling them in uniformly just to have a number
    // would be exactly the "filler" the brief asked not to add.
    ...(path === '/chess/tournaments' ? { changeFrequency: 'weekly' as const } : {}),
  }))

  // Studio home, one entry per locale. localePrefix mode is 'always' (see
  // src/i18n/routing.ts), so there is no locale-neutral /studio path to list
  // instead — each locale's home is cross-linked to the others as language
  // alternates on every entry, which is the correct shape for a sitemap
  // covering genuinely separate per-locale URLs of the same page.
  const studioLanguages = Object.fromEntries(routing.locales.map((l) => [l, url(getPathname({ locale: l, href: '/' }))]))
  for (const locale of routing.locales) {
    entries.push({
      url: url(getPathname({ locale, href: '/' })),
      alternates: { languages: studioLanguages },
    })
  }

  for (const summary of themeSummaries) entries.push({ url: url(`/chess/puzzles/${summary.theme}`) })
  for (const lesson of BASICS) entries.push({ url: url(`/chess/learn/basics/${lesson.slug}`) })
  for (const tactic of TACTICS) entries.push({ url: url(`/chess/learn/tactics/${tactic.slug}`) })
  for (const endgame of ENDGAMES) entries.push({ url: url(`/chess/learn/endgames/${endgame.slug}`) })
  for (const opening of OPENINGS) entries.push({ url: url(`/chess/learn/openings/${opening.slug}`) })
  for (const rule of RULES) entries.push({ url: url(`/chess/learn/rules/${rule.slug}`) })

  return entries
}
