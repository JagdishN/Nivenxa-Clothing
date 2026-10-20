/**
 * One-off: uploads the real payment QR image (a clean crop, not the full
 * event poster) to the `tournament-qr` Supabase Storage bucket and sets it
 * as `payment_qr_url` on the "Nivenxa Chess Tournament 2026" row — the
 * script-added tournament previously had no QR image, only the UPI ID as
 * text in payment_note.
 *
 * Usage: npm run upload-tournament-qr -- <path-to-qr-image>
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(__dirname, '..')

function loadEnvLocal() {
  const envPath = resolve(PROJECT_ROOT, '.env.local')
  if (!existsSync(envPath)) return
  const raw = readFileSync(envPath, 'utf8')
  for (const line of raw.split('\n')) {
    const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!match) continue
    const [, key, rawValue] = match
    const trimmed = rawValue.trim()
    const value = /^(["']).*\1$/.test(trimmed) ? trimmed.slice(1, -1) : trimmed
    if (!(key in process.env)) process.env[key] = value
  }
}
loadEnvLocal()

const TOURNAMENT_NAME = 'Nivenxa Chess Tournament 2026'
const TOURNAMENT_START_DATE = '2026-10-02'
const BUCKET = 'tournament-qr'

const CONTENT_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
}

async function main() {
  const imagePath = process.argv[2]
  if (!imagePath) {
    console.error('Usage: npm run upload-tournament-qr -- <path-to-qr-image>')
    process.exit(1)
  }
  const resolvedPath = resolve(imagePath)
  if (!existsSync(resolvedPath)) {
    console.error(`File not found: ${resolvedPath}`)
    process.exit(1)
  }

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!)

  const buffer = readFileSync(resolvedPath)
  const extension = extname(resolvedPath).toLowerCase()
  const contentType = CONTENT_TYPES[extension] ?? 'image/png'
  const storagePath = `${crypto.randomUUID()}${extension}`

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, { contentType, upsert: false })
  if (uploadError) {
    console.error('Upload failed:', uploadError.message)
    process.exit(1)
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
  console.log('Uploaded. Public URL:', urlData.publicUrl)

  const { data: existing, error: findError } = await supabase
    .from('tournaments')
    .select('id')
    .eq('name', TOURNAMENT_NAME)
    .eq('start_date', TOURNAMENT_START_DATE)
    .maybeSingle()
  if (findError || !existing) {
    console.error('Could not find the tournament row:', findError?.message ?? 'no match')
    process.exit(1)
  }

  const { error: updateError } = await supabase
    .from('tournaments')
    .update({ payment_qr_url: urlData.publicUrl, payment_qr_source: 'Clean QR crop supplied by the user, 2026-10-01.' })
    .eq('id', existing.id)
  if (updateError) {
    console.error('Update failed:', updateError.message)
    process.exit(1)
  }

  console.log(`Tournament row (id=${existing.id}) updated with the new payment_qr_url.`)
}

main()
