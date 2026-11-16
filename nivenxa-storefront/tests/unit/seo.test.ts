import { test } from 'node:test'
import assert from 'node:assert/strict'
import { LOGO_URL, SITE_URL, absoluteUrl, isProductionDeploy, parentStructuredData } from '../../src/lib/seo'
import robots from '../../src/app/robots'
import sitemap from '../../src/app/sitemap'

test('only a real production deploy is indexable; local builds count as production', () => {
  assert.equal(isProductionDeploy({}), true)
  assert.equal(isProductionDeploy({ CONTEXT: 'production' }), true)
  assert.equal(isProductionDeploy({ CONTEXT: 'deploy-preview' }), false)
  assert.equal(isProductionDeploy({ CONTEXT: 'branch-deploy' }), false)
  assert.equal(isProductionDeploy({ VERCEL_ENV: 'preview' }), false)
  assert.equal(isProductionDeploy({ VERCEL_ENV: 'production' }), true)
})

test('absolute URLs use the one production origin; the home page is the bare origin', () => {
  assert.equal(absoluteUrl('/'), 'https://nivenxa.com')
  assert.equal(absoluteUrl('/chess'), 'https://nivenxa.com/chess')
  assert.equal(SITE_URL, 'https://nivenxa.com')
})

test('root structured data has exactly one Organization and one WebSite, with production URLs and a crawlable logo', () => {
  const data = parentStructuredData()
  const types = data['@graph'].map((n) => n['@type'])
  assert.deepEqual(types, ['Organization', 'WebSite'])
  const [org, site] = data['@graph'] as Array<Record<string, unknown>>
  assert.equal(org['@id'], 'https://nivenxa.com/#organization')
  assert.equal(site['@id'], 'https://nivenxa.com/#website')
  assert.equal(org.url, SITE_URL)
  assert.equal(site.url, SITE_URL)
  assert.deepEqual(site.publisher, { '@id': org['@id'] })
  assert.equal((org.logo as { url: string }).url, LOGO_URL)
  assert.match(LOGO_URL, /^https:\/\/nivenxa\.com\/.+\.png$/)
  const json = JSON.stringify(data)
  assert.doesNotMatch(json, /localhost|127\.0\.0\.1|netlify\.app|vercel\.app/)
  assert.ok(!('sameAs' in org), 'sameAs stays out until the owner confirms official profile URLs')
  // brands only; apps are not claimed as brands
  assert.deepEqual((org.brand as Array<{ name: string }>).map((b) => b.name), ['NIVENXA Studio', 'NIVENXA Technologies'])
})

test('robots.txt points at the production sitemap and stays open on production', () => {
  const r = robots()
  assert.equal(r.sitemap, 'https://nivenxa.com/sitemap.xml')
  assert.deepEqual(r.rules, { userAgent: '*', allow: '/' })
})

test('sitemap lists only intended canonical public URLs', async () => {
  const entries = await sitemap()
  const urls = entries.map((e) => e.url)
  assert.equal(new Set(urls).size, urls.length, 'no duplicates')
  for (const u of urls) {
    assert.ok(u.startsWith('https://nivenxa.com'), u)
    assert.ok(!u.includes('?') && !u.includes('#'), `no query or fragment: ${u}`)
    assert.ok(!u.endsWith('/') || u === 'https://nivenxa.com/', `no trailing slash: ${u}`)
  }
  // present
  for (const must of ['https://nivenxa.com/', 'https://nivenxa.com/technologies', 'https://nivenxa.com/living', 'https://nivenxa.com/chess', 'https://nivenxa.com/studio/en', 'https://nivenxa.com/chess/learn/basics/pawns', 'https://nivenxa.com/chess/tournaments/gallery', 'https://nivenxa.com/privacy']) {
    assert.ok(urls.includes(must), `missing ${must}`)
  }
  // absent: placeholders, duplicate locale copies, private, API, admin, test and per-tournament pages
  assert.ok(!urls.includes('https://nivenxa.com/ventures'))
  assert.equal(urls.filter((u) => u.includes('/studio/')).length, 1, 'only /studio/en')
  assert.ok(!urls.some((u) => /\/(admin|api|dev-preview|login|signup|activity|my-games|my-puzzles|consent)(\/|$)/.test(u)), 'no private/test/auth routes')
  assert.ok(!urls.some((u) => /\/living\/(app|dashboard|admin)/.test(u)), 'no signed-in Living pages')
  assert.ok(!urls.some((u) => /\/chess\/tournaments\/[0-9a-f-]{20,}/.test(u)), 'tournament result pages are noindex')
  assert.ok(entries.every((e) => !('lastModified' in e)), 'no invented last-modified dates')
})
