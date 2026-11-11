import sharp from 'sharp'

// Custom profile pictures. Server-side only. The server never trusts the browser: the file's real content is decoded, checked,
// re-encoded as a small square WebP and stripped of all metadata (EXIF, GPS, colour profiles, comments) before anything is stored.

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
export const MIN_SIDE_PX = 64
export const MAX_SIDE_PX = 8000
export const OUTPUT_PX = 256
export const MAX_STORED_BYTES = 512 * 1024
export const ALLOWED_FORMATS = ['jpeg', 'png', 'webp'] as const

export type ProcessResult = { ok: true; webp: Buffer } | { ok: false; status: number; error: string }

const fail = (status: number, error: string): ProcessResult => ({ ok: false, status, error })

export async function processProfileImage(input: Buffer): Promise<ProcessResult> {
  if (input.length === 0) return fail(400, 'No image was received.')
  if (input.length > MAX_UPLOAD_BYTES) return fail(413, 'That image is larger than 5 MB.')
  try {
    // The decoder, not the file name or the declared type, decides what the file is. A pixel cap stops decompression bombs.
    const probe = sharp(input, { limitInputPixels: 40_000_000, failOn: 'error' })
    const meta = await probe.metadata()
    if (!meta.format || !(ALLOWED_FORMATS as readonly string[]).includes(meta.format)) return fail(415, 'Please use a JPEG, PNG or WebP image.')
    if (!meta.width || !meta.height) return fail(422, 'That image could not be read.')
    if (meta.pages && meta.pages > 1) return fail(415, 'Animated images are not supported.')
    if (Math.min(meta.width, meta.height) < MIN_SIDE_PX) return fail(422, `That image is too small. Use one at least ${MIN_SIDE_PX} by ${MIN_SIDE_PX} pixels.`)
    if (Math.max(meta.width, meta.height) > MAX_SIDE_PX) return fail(422, 'That image is too large. Use one under 8000 pixels on its longest side.')
    const webp = await sharp(input, { limitInputPixels: 40_000_000, failOn: 'error' })
      .rotate() // apply the EXIF orientation, then the metadata is dropped
      .resize(OUTPUT_PX, OUTPUT_PX, { fit: 'cover', position: 'centre' })
      .webp({ quality: 82, effort: 4 })
      .toBuffer() // sharp writes no metadata unless asked to
    if (webp.length > MAX_STORED_BYTES) return fail(422, 'That image could not be compressed enough.')
    return { ok: true, webp }
  } catch {
    return fail(422, 'That file is not a valid image.')
  }
}

/** Where one account's image is kept. The path is built from the SERVER session's user id and a version, never from client input. */
export const picturePath = (userId: string, version: number) => `${userId}/${version}.webp`

// ─── Storage + request handling (storage is injected so the rules can be tested without a database) ───────────

export interface Profile {
  avatarPath: string | null
  version: number
}

export interface ProfileStore {
  getProfile(userId: string): Promise<Profile>
  /** Writes the object; must fail (throw) rather than overwrite. */
  put(path: string, webp: Buffer): Promise<void>
  read(path: string): Promise<Buffer | null>
  remove(path: string): Promise<void>
  setProfile(userId: string, profile: Profile): Promise<void>
}

export type Json = { status: number; body: Record<string, unknown> }
const unavailable: Json = { status: 503, body: { error: 'Profile pictures are unavailable right now.' } }

/** Replaces the account's picture. On ANY failure the previous picture and record are left exactly as they were. */
export async function savePicture(store: ProfileStore, userId: string, file: Buffer): Promise<Json> {
  const processed = await processProfileImage(file)
  if (!processed.ok) return { status: processed.status, body: { error: processed.error } }
  let current: Profile
  try {
    current = await store.getProfile(userId)
  } catch {
    return unavailable
  }
  const version = current.version + 1
  const path = picturePath(userId, version)
  try {
    await store.put(path, processed.webp)
  } catch {
    return { status: 500, body: { error: 'Your picture could not be saved. Your previous picture is unchanged.' } }
  }
  try {
    await store.setProfile(userId, { avatarPath: path, version })
  } catch {
    await store.remove(path).catch(() => undefined) // do not leave an unused file behind
    return { status: 500, body: { error: 'Your picture could not be saved. Your previous picture is unchanged.' } }
  }
  if (current.avatarPath) await store.remove(current.avatarPath).catch(() => undefined) // best effort: an orphan is harmless, a failure must not fail the save
  return { status: 200, body: { version, hasPicture: true } }
}

export async function removePicture(store: ProfileStore, userId: string): Promise<Json> {
  let current: Profile
  try {
    current = await store.getProfile(userId)
  } catch {
    return unavailable
  }
  if (!current.avatarPath) return { status: 200, body: { version: current.version, hasPicture: false } }
  const version = current.version + 1
  try {
    await store.setProfile(userId, { avatarPath: null, version })
  } catch {
    return { status: 500, body: { error: 'Your picture could not be removed. Please try again.' } }
  }
  await store.remove(current.avatarPath).catch(() => undefined)
  return { status: 200, body: { version, hasPicture: false } }
}

export async function pictureInfo(store: ProfileStore, userId: string): Promise<Json> {
  try {
    const p = await store.getProfile(userId)
    return { status: 200, body: { version: p.version, hasPicture: !!p.avatarPath } }
  } catch {
    return unavailable
  }
}

/** The caller's own image bytes (never anyone else's: the path comes from the caller's own profile row). */
export async function readOwnPicture(store: ProfileStore, userId: string): Promise<{ webp: Buffer; version: number } | null> {
  try {
    const p = await store.getProfile(userId)
    if (!p.avatarPath) return null
    const webp = await store.read(p.avatarPath)
    return webp ? { webp, version: p.version } : null
  } catch {
    return null
  }
}
