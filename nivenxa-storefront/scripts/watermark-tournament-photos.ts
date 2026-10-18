/**
 * Bakes a repeating "NIVENXA CHESS" watermark into every tournament gallery
 * photo under media/chess-tournament-photos/<date>/ — source files there
 * stay pristine (never overwritten), watermarked output goes to a sibling
 * watermarked/ subfolder, which is what galleryPhotoFiles.ts actually serves.
 *
 * A repeating diagonal tile (not one corner logo) is the point — a corner
 * mark crops out in two seconds; a tiled one survives any crop that still
 * contains a recognizable piece of the photo. This is a deterrent, not real
 * DRM (nothing served to a browser can be made uncopyable) — it just makes
 * a lifted copy visibly Nivenxa's, which is the realistic goal here.
 *
 * Usage: npx tsx scripts/watermark-tournament-photos.ts [date-folder]
 * (defaults to 2026-10-02)
 */
import { readdir, mkdir } from 'node:fs/promises'
import { resolve, dirname, extname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(__dirname, '..')

const dateFolder = process.argv[2] ?? '2026-10-02'
const SOURCE_DIR = resolve(PROJECT_ROOT, 'media', 'chess-tournament-photos', dateFolder)
const OUTPUT_DIR = resolve(SOURCE_DIR, 'watermarked')

function watermarkSvg(width: number, height: number): Buffer {
  // One tile of the repeating pattern: the text rotated -28°, white fill at
  // low opacity with a thin dark stroke so it reads against both light and
  // dark parts of a photo, tiled via <pattern> rather than placed once.
  const tileWidth = 300
  const tileHeight = 170
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="wm" width="${tileWidth}" height="${tileHeight}" patternUnits="userSpaceOnUse" patternTransform="rotate(-28)">
          <text x="${tileWidth / 2}" y="${tileHeight / 2}" text-anchor="middle" dominant-baseline="middle"
            font-family="Arial, sans-serif" font-size="30" font-weight="700"
            fill="rgba(255,255,255,0.22)" stroke="rgba(0,0,0,0.16)" stroke-width="0.6"
            letter-spacing="2">NIVENXA CHESS</text>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#wm)" />
    </svg>
  `
  return Buffer.from(svg)
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true })

  const entries = await readdir(SOURCE_DIR, { withFileTypes: true })
  const files = entries.filter((e) => e.isFile() && /\.(webp|jpg|jpeg|png)$/i.test(e.name)).map((e) => e.name)

  if (files.length === 0) {
    console.error(`No image files found in ${SOURCE_DIR}`)
    process.exit(1)
  }

  for (const file of files) {
    const sourcePath = resolve(SOURCE_DIR, file)
    const outputPath = resolve(OUTPUT_DIR, `${basename(file, extname(file))}${extname(file)}`)

    const image = sharp(sourcePath)
    const metadata = await image.metadata()
    if (!metadata.width || !metadata.height) {
      console.error(`Skipping ${file} — couldn't read dimensions`)
      continue
    }

    await image
      .composite([{ input: watermarkSvg(metadata.width, metadata.height), top: 0, left: 0 }])
      .webp({ quality: 88 })
      .toFile(outputPath)

    console.log(`Watermarked ${file} -> ${outputPath}`)
  }

  console.log(`Done. ${files.length} file(s) watermarked into ${OUTPUT_DIR}`)
}

main().catch((err) => {
  console.error('Failed:', err.message)
  process.exit(1)
})
