import sharp from 'sharp'

/** Same repeating diagonal "NIVENXA CHESS" tile as scripts/watermark-tournament-photos.ts — a crop that still shows part of the photo still shows the mark. */
function watermarkSvg(width: number, height: number): Buffer {
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

/** Applies the camera's rotation, caps the longest side at 2000px, bakes in the watermark and returns a webp. Throws if the bytes are not an image. */
export async function watermarkPhoto(input: Buffer): Promise<Buffer> {
  const resized = await sharp(input).rotate().resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true }).toBuffer({ resolveWithObject: true })
  const { width, height } = resized.info
  return sharp(resized.data)
    .composite([{ input: watermarkSvg(width, height), top: 0, left: 0 }])
    .webp({ quality: 86 })
    .toBuffer()
}
