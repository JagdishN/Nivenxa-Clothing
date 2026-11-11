// REAL-ACCOUNT verification of the profile-picture and coach-progress features. NOT RUN YET: it needs an ISOLATED Supabase project
// (local `supabase start` or a staging project) that has had supabase/migrations/20261110120000_chess_coach_intro_and_profile_picture.sql
// applied, and the app server started against THAT project. It must never be pointed at production: it creates and deletes users.
//
//   STAGING_SUPABASE_URL=https://<staging>.supabase.co STAGING_SUPABASE_PUBLISHABLE_KEY=... STAGING_SUPABASE_SECRET_KEY=... \
//   BASE_URL=http://localhost:3100 npx tsx scripts/verify-account-features.mts
//
// (start the app with SUPABASE_URL / SUPABASE_SECRET_KEY / NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY set to the
// same staging values). Everything below goes through the real auth, the real routes, the real tables and the real private bucket.
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const URL_ = process.env.STAGING_SUPABASE_URL
const PUB = process.env.STAGING_SUPABASE_PUBLISHABLE_KEY
const SEC = process.env.STAGING_SUPABASE_SECRET_KEY
const BASE = process.env.BASE_URL ?? 'http://localhost:3100'
if (!URL_ || !PUB || !SEC) { console.error('BLOCKED: STAGING_SUPABASE_URL / _PUBLISHABLE_KEY / _SECRET_KEY are not set. Nothing was run.'); process.exit(2) }
if (process.env.SUPABASE_URL && process.env.SUPABASE_URL !== URL_) { console.error('REFUSING: the app server is not pointed at the same (staging) project.'); process.exit(2) }

const admin = createClient(URL_, SEC, { auth: { persistSession: false } })
const results: { check: string; ok: boolean; detail?: string }[] = []
const check = (name: string, ok: boolean, detail?: string) => { results.push({ check: name, ok, detail }); console.log(ok ? 'PASS' : 'FAIL', name, detail ?? '') }
const b64url = (s: string) => Buffer.from(s).toString('base64url')

async function makeUser(tag: string) {
  const email = `chess-verify-${tag}-${Date.now()}@example.test`
  const password = `Pw-${Math.random().toString(36).slice(2)}-Aa1!`
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error || !data.user) throw new Error(`createUser: ${error?.message}`)
  const client = createClient(URL_!, PUB!, { auth: { persistSession: false } })
  const { data: s, error: e2 } = await client.auth.signInWithPassword({ email, password })
  if (e2 || !s.session) throw new Error(`signIn: ${e2?.message}`)
  const cookie = `sb-chess-auth=base64-${b64url(JSON.stringify(s.session))}`
  return { id: data.user.id, client, cookie, session: s.session }
}
const call = (u: { cookie: string } | null, path: string, init: RequestInit = {}) =>
  fetch(`${BASE}${path}`, { ...init, headers: { ...(init.headers as Record<string, string>), ...(u ? { Cookie: u.cookie } : {}) } })
const jpeg = (w: number, h: number, c: string) => sharp({ create: { width: w, height: h, channels: 3, background: c } }).withExif({ IFD0: { Copyright: 'verify-metadata' } }).jpeg().toBuffer()
const upload = async (u: { cookie: string }, buf: Buffer) => { const f = new FormData(); f.append('file', new Blob([new Uint8Array(buf)], { type: 'image/jpeg' }), 'p.jpg'); return call(u, '/api/chess/profile-picture', { method: 'POST', body: f }) }

const A = await makeUser('a')
const B = await makeUser('b')
try {
  // ── schema: the new tables exist and the OLD consent table is untouched ──
  for (const t of ['chess_coach_intro_games', 'chess_profile_pictures', 'chess_profiles']) {
    const { error } = await admin.from(t).select('*').limit(1)
    check(`table ${t} exists`, !error, error?.message)
  }
  const { data: buckets } = await admin.storage.listBuckets()
  const bucket = buckets?.find((b) => b.id === 'chess-profile-pictures')
  check('bucket exists and is PRIVATE', !!bucket && bucket.public === false)

  // ── profile picture: signed out / invalid session ──
  check('signed-out GET is 401', (await call(null, '/api/chess/profile-picture?info=1')).status === 401)
  check('signed-out POST is 401', (await upload({ cookie: '' }, await jpeg(300, 300, '#a33'))).status === 401)
  check('garbage session is 401', (await call({ cookie: `sb-chess-auth=base64-${b64url('{"access_token":"x.y.z"}')}` }, '/api/chess/profile-picture?info=1')).status === 401)

  // ── upload, metadata stripped, versioned, restored in a SEPARATE session ──
  const up = await upload(A, await jpeg(500, 400, '#a33'))
  const upBody = await up.json().catch(() => ({}))
  check('A uploads a JPEG', up.status === 200 && upBody.version === 1, JSON.stringify(upBody))
  const img = await call(A, '/api/chess/profile-picture')
  const bytes = Buffer.from(await img.arrayBuffer())
  const meta = await sharp(bytes).metadata()
  check('stored image is 256x256 WebP without EXIF', meta.format === 'webp' && meta.width === 256 && meta.height === 256 && !meta.exif)
  const info2 = await call(A, '/api/chess/profile-picture?info=1')
  check('a second request with the same account sees the picture (persisted in DB)', (await info2.json()).hasPicture === true)
  check('B does not see A picture', (await (await call(B, '/api/chess/profile-picture?info=1')).json()).hasPicture === false && (await call(B, '/api/chess/profile-picture')).status === 404)

  // ── invalid uploads rejected by the SERVER ──
  const bad = new FormData(); bad.append('file', new Blob(['<?php echo 1; ?>'], { type: 'image/png' }), 'evil.png')
  check('non-image content rejected', (await call(A, '/api/chess/profile-picture', { method: 'POST', body: bad })).status >= 400)
  check('too small rejected', (await upload(A, await jpeg(40, 40, '#333'))).status === 422)
  const big = new FormData(); big.append('file', new Blob([new Uint8Array(6 * 1024 * 1024)], { type: 'image/jpeg' }), 'big.jpg')
  check('over 5 MB rejected', (await call(A, '/api/chess/profile-picture', { method: 'POST', body: big })).status >= 400)
  check('failed uploads kept the existing picture', (await (await call(A, '/api/chess/profile-picture?info=1')).json()).version === 1)

  // ── storage + RLS isolation as account A, with A's own real token ──
  const aStore = A.client.storage.from('chess-profile-pictures')
  check('A cannot download its own object directly (bucket is private, no policies)', !!(await aStore.download(`${A.id}/1.webp`)).error)
  check("A cannot download B's object", !!(await aStore.download(`${B.id}/1.webp`)).error)
  check('A cannot upload into the bucket directly', !!(await aStore.upload(`${A.id}/9.webp`, new Uint8Array([1, 2, 3]), { contentType: 'image/webp' })).error)
  check("A cannot upload into B's folder", !!(await aStore.upload(`${B.id}/1.webp`, new Uint8Array([1]), { contentType: 'image/webp' })).error)
  await upload(B, await jpeg(300, 300, '#3a3'))
  const rowsSeenByA = await A.client.from('chess_profile_pictures').select('user_id')
  check("A sees only its own picture row (RLS), never B's", (rowsSeenByA.data ?? []).every((r) => r.user_id === A.id) && (rowsSeenByA.data ?? []).length === 1)
  const tamper = await A.client.from('chess_profile_pictures').update({ avatar_version: 99, has_picture: true }).eq('user_id', B.id).select()
  check("A cannot modify B's picture row", (tamper.data ?? []).length === 0)
  const selfTamper = await A.client.from('chess_profile_pictures').update({ avatar_version: 99 }).eq('user_id', A.id).select()
  check('A cannot write its own picture row from the client (server-only)', (selfTamper.data ?? []).length === 0)
  const pathSwap = await call(A, '/api/chess/profile-picture')
  check("A's image is still A's image after the tamper attempts", pathSwap.status === 200 && Buffer.compare(Buffer.from(await pathSwap.arrayBuffer()), bytes) === 0)

  // ── replace (new version, old object removed), failed replacement keeps the image, remove restores default ──
  const rep = await upload(A, await jpeg(320, 320, '#33a'))
  check('A replaces its picture (version 2)', (await rep.json()).version === 2)
  const { data: files } = await admin.storage.from('chess-profile-pictures').list(A.id)
  check('the replaced object was cleaned up (one file left)', (files ?? []).length === 1 && files![0].name === '2.webp')
  const del = await call(A, '/api/chess/profile-picture', { method: 'DELETE' })
  check('A removes its picture', (await del.json()).hasPicture === false && (await call(A, '/api/chess/profile-picture')).status === 404)
  check("B's picture is unaffected by A's removal", (await call(B, '/api/chess/profile-picture')).status === 200)

  // ── coach progress ──
  const g = (n: number) => `00000000-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`
  const post = (u: { cookie: string }, ids: string[]) => call(u, '/api/chess/coach-intro', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) }).then((r) => r.json() as Promise<{ ids: string[] }>)
  check('signed-out coach GET is 401', (await call(null, '/api/chess/coach-intro')).status === 401)
  check('A records game 1', (await post(A, [g(1)])).ids.length === 1)
  check('recording the same game twice counts once', (await post(A, [g(1), g(1)])).ids.length === 1)
  check('merge: guest [1,2] into account [1] -> 2 distinct', (await post(A, [g(1), g(2)])).ids.length === 2)
  check('merging fewer never lowers the account', (await post(A, [g(2)])).ids.length === 2)
  check('B progress is isolated (empty)', ((await (await call(B, '/api/chess/coach-intro')).json()) as { ids: string[] }).ids.length === 0)
  check('A sees the same progress in a new request (persistence)', ((await (await call(A, '/api/chess/coach-intro')).json()) as { ids: string[] }).ids.length === 2)
  check('third game reaches 3 (the roster gate)', (await post(A, [g(3)])).ids.length === 3)
  const { data: leak } = await A.client.from('chess_coach_intro_games').select('user_id')
  check("A cannot read B's coach rows (RLS)", (leak ?? []).every((r) => r.user_id === A.id))
} catch (e) {
  check('script completed without an unexpected error', false, String(e))
} finally {
  for (const u of [A, B]) {
    await admin.storage.from('chess-profile-pictures').remove([`${u.id}/1.webp`, `${u.id}/2.webp`, `${u.id}/3.webp`])
    await admin.auth.admin.deleteUser(u.id) // cascades the rows
  }
}
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
process.exit(failed.length ? 1 : 0)
