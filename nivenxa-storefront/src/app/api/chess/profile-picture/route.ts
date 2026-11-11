import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { getChessSession } from '@/lib/chess/chessAuth'
import { MAX_UPLOAD_BYTES, pictureInfo, readOwnPicture, removePicture, savePicture } from '@/lib/chess/profilePicture'
import { supabaseProfileStore } from '@/lib/chess/profilePictureStore'

export const runtime = 'nodejs'

// The signed-in player's own profile picture. Every operation takes the account from the SERVER session: a user id, path or
// file name sent by the browser is never read, so one player can only ever read, replace or delete their own picture.

const noStore = { 'Cache-Control': 'private, no-store' }
const json = (status: number, body: Record<string, unknown>) => NextResponse.json(body, { status, headers: noStore })
const signedOut = () => json(401, { error: 'Sign in to use a profile picture.' })

export async function GET(request: NextRequest) {
  const session = await getChessSession()
  if (!session) return signedOut()
  if (request.nextUrl.searchParams.get('info') === '1') {
    const r = await pictureInfo(supabaseProfileStore, session.userId)
    return json(r.status, r.body)
  }
  const own = await readOwnPicture(supabaseProfileStore, session.userId)
  if (!own) return new NextResponse(null, { status: 404, headers: noStore })
  // Revalidated on every use (private, no-cache + ETag): another account signing in on this browser can never be served this image
  // from the cache, and a replacement shows at once.
  const etag = `"${createHash('sha1').update(session.userId).update(String(own.version)).digest('hex')}"`
  const headers = { 'Cache-Control': 'private, no-cache', ETag: etag, 'Content-Type': 'image/webp', 'X-Content-Type-Options': 'nosniff' }
  if (request.headers.get('if-none-match') === etag) return new NextResponse(null, { status: 304, headers })
  return new NextResponse(new Uint8Array(own.webp), { status: 200, headers })
}

export async function POST(request: NextRequest) {
  const session = await getChessSession()
  if (!session) return signedOut()
  const declared = Number(request.headers.get('content-length') ?? 0)
  if (declared > MAX_UPLOAD_BYTES + 64 * 1024) return json(413, { error: 'That image is larger than 5 MB.' })
  let file: File | null = null
  try {
    const form = await request.formData()
    const f = form.get('file')
    if (f instanceof File) file = f
  } catch {
    return json(400, { error: 'The upload could not be read.' })
  }
  if (!file) return json(400, { error: 'Choose an image to upload.' })
  const r = await savePicture(supabaseProfileStore, session.userId, Buffer.from(await file.arrayBuffer()))
  return json(r.status, r.body)
}

export async function DELETE() {
  const session = await getChessSession()
  if (!session) return signedOut()
  const r = await removePicture(supabaseProfileStore, session.userId)
  return json(r.status, r.body)
}
