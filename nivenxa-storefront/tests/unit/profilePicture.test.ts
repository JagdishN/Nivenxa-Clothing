import { test } from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { pictureInfo, processProfileImage, readOwnPicture, removePicture, savePicture, type Profile, type ProfileStore } from '../../src/lib/chess/profilePicture'

// The rules run against real image decoding (sharp) and an in-memory store, so no account or database is touched.

class MemStore implements ProfileStore {
  profiles = new Map<string, Profile>()
  files = new Map<string, Buffer>()
  failPut = false
  failSet = false
  async getProfile(u: string) { return this.profiles.get(u) ?? { avatarPath: null, version: 0 } }
  async put(p: string, b: Buffer) { if (this.failPut) throw new Error('put'); if (this.files.has(p)) throw new Error('exists'); this.files.set(p, b) }
  async read(p: string) { return this.files.get(p) ?? null }
  async remove(p: string) { this.files.delete(p) }
  async setProfile(u: string, p: Profile) { if (this.failSet) throw new Error('set'); this.profiles.set(u, p) }
}

const img = (w: number, h: number, fmt: 'jpeg' | 'png' | 'webp' = 'png') =>
  sharp({ create: { width: w, height: h, channels: 3, background: { r: 120, g: 40, b: 160 } } })[fmt]().toBuffer()

test('JPEG, PNG and WebP are accepted and re-encoded to a small square WebP', async () => {
  for (const f of ['jpeg', 'png', 'webp'] as const) {
    const r = await processProfileImage(await img(400, 300, f))
    assert.ok(r.ok, f)
    if (r.ok) {
      const m = await sharp(r.webp).metadata()
      assert.equal(m.format, 'webp')
      assert.deepEqual([m.width, m.height], [256, 256]) // resized and cropped square
      assert.ok(r.webp.length < 512 * 1024)
    }
  }
})

test('metadata (EXIF, GPS) is stripped', async () => {
  const withExif = await sharp({ create: { width: 200, height: 200, channels: 3, background: '#808080' } })
    .withExif({ IFD0: { Copyright: 'someone', Artist: 'a real name' } })
    .jpeg()
    .toBuffer()
  assert.ok((await sharp(withExif).metadata()).exif, 'the input has EXIF')
  const r = await processProfileImage(withExif)
  assert.ok(r.ok)
  if (r.ok) assert.equal((await sharp(r.webp).metadata()).exif, undefined)
})

test('the real content decides: a text file, a renamed file and a GIF are refused', async () => {
  const text = await processProfileImage(Buffer.from('<?php echo 1; ?> not an image'))
  assert.equal(text.ok, false)
  const gif = await sharp({ create: { width: 100, height: 100, channels: 3, background: '#fff' } }).gif().toBuffer()
  const g = await processProfileImage(gif)
  assert.equal(g.ok, false)
  if (!g.ok) assert.equal(g.status, 415)
  const svg = await processProfileImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><script>1</script></svg>'))
  assert.equal(svg.ok, false)
})

test('size and dimension limits: empty, over 5 MB, too small, too large', async () => {
  assert.equal((await processProfileImage(Buffer.alloc(0))).ok, false)
  const big = await processProfileImage(Buffer.alloc(5 * 1024 * 1024 + 1))
  assert.equal(big.ok === false && big.status, 413)
  const small = await processProfileImage(await img(40, 40))
  assert.equal(small.ok === false && small.status, 422)
  const wide = await processProfileImage(await img(9000, 70))
  assert.equal(wide.ok === false && wide.status, 422)
})

test('a corrupt image that starts like a PNG is refused, not stored', async () => {
  const png = await img(200, 200)
  const broken = Buffer.concat([png.subarray(0, 60), Buffer.alloc(200, 7)])
  assert.equal((await processProfileImage(broken)).ok, false)
})

test('save, replace (new version, old file removed), remove (default restored)', async () => {
  const s = new MemStore()
  const a = await savePicture(s, 'user-a', await img(300, 300))
  assert.deepEqual(a.body, { version: 1, hasPicture: true })
  assert.deepEqual([...s.files.keys()], ['user-a/1.webp'])
  const b = await savePicture(s, 'user-a', await img(300, 300, 'jpeg'))
  assert.deepEqual(b.body, { version: 2, hasPicture: true })
  assert.deepEqual([...s.files.keys()], ['user-a/2.webp']) // the replaced image was cleaned up
  const info = await pictureInfo(s, 'user-a')
  assert.deepEqual(info.body, { version: 2, hasPicture: true })
  const gone = await removePicture(s, 'user-a')
  assert.deepEqual(gone.body, { version: 3, hasPicture: false })
  assert.equal(s.files.size, 0)
  assert.equal(await readOwnPicture(s, 'user-a'), null)
})

test('a failed replacement keeps the previous picture; nothing is left behind', async () => {
  const s = new MemStore()
  await savePicture(s, 'user-a', await img(300, 300))
  const before = [...s.files.entries()]
  s.failPut = true
  assert.equal((await savePicture(s, 'user-a', await img(300, 300))).status, 500)
  s.failPut = false
  s.failSet = true
  assert.equal((await savePicture(s, 'user-a', await img(300, 300))).status, 500)
  s.failSet = false
  assert.deepEqual([...s.files.entries()], before) // the old file is intact and the new one was removed
  assert.deepEqual(await pictureInfo(s, 'user-a').then((r) => r.body), { version: 1, hasPicture: true })
})

test('ownership: each account only ever reads, replaces or deletes its own picture', async () => {
  const s = new MemStore()
  await savePicture(s, 'user-a', await img(300, 300))
  await savePicture(s, 'user-b', await img(300, 300, 'jpeg'))
  assert.deepEqual([...s.files.keys()].sort(), ['user-a/1.webp', 'user-b/1.webp'])
  await removePicture(s, 'user-b')
  assert.ok(await readOwnPicture(s, 'user-a')) // A is untouched by B's removal
  assert.equal(await readOwnPicture(s, 'user-b'), null)
  await savePicture(s, 'user-b', await img(300, 300))
  assert.ok(s.files.has('user-a/1.webp'))
  // there is no way to name another account: the functions take only the session's user id and a file
})
