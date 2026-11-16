// SEO audit of a running NIVENXA site (live, or a local `next start`).
//   node scripts/seo-audit.mjs https://nivenxa.com
//   node scripts/seo-audit.mjs http://localhost:3300      (sitemap URLs are fetched from that host, canonicals are still checked against https://nivenxa.com)
// Read-only: only GET requests. Exits non-zero when a check fails, so it can sit in a release checklist.

const BASE = (process.argv[2] ?? 'https://nivenxa.com').replace(/\/$/, '')
const PROD = 'https://nivenxa.com'
const failures = []
const fail = (msg) => failures.push(msg)

const get = (url) => fetch(url, { redirect: 'manual' })
const pick = (html, re) => [...html.matchAll(re)].map((m) => m[1])

// robots.txt
const robotsRes = await get(`${BASE}/robots.txt`)
const robotsTxt = await robotsRes.text()
if (robotsRes.status !== 200) fail(`robots.txt -> ${robotsRes.status}`)
if (!robotsTxt.includes(`Sitemap: ${PROD}/sitemap.xml`)) fail('robots.txt does not reference https://nivenxa.com/sitemap.xml')
if (/^\s*Disallow:\s*\/\s*$/m.test(robotsTxt)) fail('robots.txt disallows everything (is this a preview build?)')

// sitemap
const smRes = await get(`${BASE}/sitemap.xml`)
const smXml = await smRes.text()
if (smRes.status !== 200) fail(`sitemap.xml -> ${smRes.status}`)
const locs = pick(smXml, /<loc>([^<]+)<\/loc>/g)
if (locs.length === 0) fail('sitemap.xml has no <loc> entries')
if (new Set(locs).size !== locs.length) fail('sitemap.xml has duplicate URLs')

const rows = []
let next = 0
async function worker() {
  while (next < locs.length) {
    const loc = locs[next++]
    const path = loc.replace(PROD, '') || '/'
    if (!loc.startsWith(PROD)) fail(`sitemap URL is not on ${PROD}: ${loc}`)
    const res = await get(`${BASE}${path}`)
    const html = res.status === 200 ? await res.text() : ''
    const canonicals = pick(html, /<link[^>]+rel="canonical"[^>]*href="([^"]+)"/g)
    const robots = pick(html, /<meta[^>]+name="robots"[^>]*content="([^"]+)"/g)
    const title = pick(html, /<title>([^<]*)<\/title>/g)[0] ?? ''
    const description = pick(html, /<meta[^>]+name="description"[^>]*content="([^"]*)"/g)[0] ?? ''
    rows.push({ loc, path, status: res.status, canonicals, robots, title, description, xrobots: res.headers.get('x-robots-tag') ?? '', h1: (html.match(/<h1[\s>]/g) ?? []).length })
  }
}
await Promise.all(Array.from({ length: 6 }, worker))

// A canonical is correct when it is the page's own production URL (the home page may omit the trailing slash).
const same = (a, b) => a.replace(/\/$/, '') === b.replace(/\/$/, '')
for (const r of rows) {
  if (r.status !== 200) fail(`${r.path}: status ${r.status} (sitemap URLs must return 200)`)
  if (r.status !== 200) continue
  if (r.canonicals.length !== 1) fail(`${r.path}: ${r.canonicals.length} canonical tags (expected exactly 1)`)
  else if (!same(r.canonicals[0], r.loc)) fail(`${r.path}: canonical is ${r.canonicals[0]}, expected ${r.loc}`)
  if (r.robots.some((v) => /noindex/i.test(v)) || /noindex/i.test(r.xrobots)) fail(`${r.path}: carries noindex but is in the sitemap`)
  if (!r.title) fail(`${r.path}: no <title>`)
  if (!r.description) fail(`${r.path}: no meta description`)
  if (/localhost|127\.0\.0\.1|netlify\.app|vercel\.app/.test(r.canonicals.join(' '))) fail(`${r.path}: canonical points at a dev/preview host`)
}
const byTitle = new Map()
const byDesc = new Map()
for (const r of rows.filter((x) => x.status === 200)) {
  byTitle.set(r.title, [...(byTitle.get(r.title) ?? []), r.path])
  byDesc.set(r.description, [...(byDesc.get(r.description) ?? []), r.path])
}
for (const [t, paths] of byTitle) if (paths.length > 1) fail(`duplicate title "${t}" on ${paths.length} pages, e.g. ${paths.slice(0, 3).join(', ')}`)
for (const [d, paths] of byDesc) if (paths.length > 1) fail(`duplicate description on ${paths.length} pages, e.g. ${paths.slice(0, 3).join(', ')} ("${d.slice(0, 60)}…")`)

// home page structured data: one Organization, one WebSite, nothing else duplicated
const home = await (await get(`${BASE}/`)).text()
const blocks = pick(home, /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)
const types = []
for (const b of blocks) {
  try {
    const j = JSON.parse(b)
    for (const node of j['@graph'] ?? [j]) types.push(node['@type'])
  } catch {
    fail('home page has JSON-LD that does not parse')
  }
}
if (types.filter((t) => t === 'Organization').length !== 1) fail(`home page has ${types.filter((t) => t === 'Organization').length} Organization nodes (expected 1)`)
if (types.filter((t) => t === 'WebSite').length !== 1) fail(`home page has ${types.filter((t) => t === 'WebSite').length} WebSite nodes (expected 1)`)

// pages that must stay OUT of the index
for (const [path, why] of [['/ventures', 'placeholder']]) {
  const res = await get(`${BASE}${path}`)
  const html = res.status === 200 ? await res.text() : ''
  if (res.status === 200 && !/noindex/i.test(pick(html, /<meta[^>]+name="robots"[^>]*content="([^"]+)"/g).join(' '))) fail(`${path} (${why}) should be noindex`)
}
// redirects that must be single, permanent hops
for (const [from, to] of [['/studio', '/studio/en'], ['/chess/', '/chess']]) {
  const res = await get(`${BASE}${from}`)
  const loc = res.headers.get('location') ?? ''
  if (![301, 308].includes(res.status) || !loc.endsWith(to)) fail(`${from} should permanently redirect to ${to}; got ${res.status} ${loc}`)
}

console.log(`Audited ${rows.length} sitemap URLs on ${BASE}`)
console.log(`  200 responses: ${rows.filter((r) => r.status === 200).length} | with exactly one canonical: ${rows.filter((r) => r.canonicals.length === 1).length} | unique titles: ${byTitle.size}`)
if (failures.length === 0) console.log('PASS: no SEO defects found by these checks.')
else {
  console.log(`FAIL: ${failures.length} problem(s)`)
  for (const f of failures.slice(0, 60)) console.log(`  - ${f}`)
  if (failures.length > 60) console.log(`  … and ${failures.length - 60} more`)
  process.exitCode = 1
}
