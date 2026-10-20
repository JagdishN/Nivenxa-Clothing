import { readFile } from 'node:fs/promises'
import type { NextRequest } from 'next/server'
import { GALLERY_PHOTO_FILES } from '@/lib/chess/galleryPhotoFiles'

// Needs real filesystem access (readFile) — not available on the Edge
// runtime.
export const runtime = 'nodejs'

/**
 * Serves tournament gallery photos from outside public/ (see
 * galleryPhotoFiles.ts) through an opaque id instead of a literal file path.
 * This, plus the gallery UI rendering photos as CSS backgrounds instead of
 * <img> tags and blocking right-click (see GallerySection.tsx/gallery/page.tsx),
 * raises the bar past a casual save — it does not and cannot make a
 * displayed image uncopyable. Anyone with devtools, a screenshot, or
 * "view-source," can still get the pixels; nothing served to a browser can
 * prevent that. What this does achieve: the real directory layout and
 * filenames never appear in any HTML/JS the browser receives, other sites
 * can't hotlink the image directly (see the referer check below), and
 * responses are heavily cached since tournament photos never change once
 * published.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ photoId: string }> }) {
  const { photoId } = await params
  const filePath = GALLERY_PHOTO_FILES[photoId]
  if (!filePath) return new Response('Not found', { status: 404 })

  // Block another site embedding this URL directly (hotlinking) while still
  // allowing direct navigation (no referer at all, e.g. opening the URL in
  // a fresh tab) and requests that came from our own pages.
  const referer = request.headers.get('referer')
  if (referer) {
    try {
      if (new URL(referer).origin !== request.nextUrl.origin) {
        return new Response('Forbidden', { status: 403 })
      }
    } catch {
      // Malformed referer header — ignore rather than block a real request over it.
    }
  }

  let buffer: Buffer
  try {
    buffer = await readFile(filePath)
  } catch {
    return new Response('Not found', { status: 404 })
  }

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'image/webp',
      // Immutable — a replaced photo gets a new id (see galleryPhotos.ts)
      // rather than overwriting one in place, so a year-long cache is safe.
      'Cache-Control': 'public, max-age=31536000, immutable',
      // Renders inline in the page, never triggers a "Save As" download prompt.
      'Content-Disposition': 'inline',
      'Cross-Origin-Resource-Policy': 'same-site',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
