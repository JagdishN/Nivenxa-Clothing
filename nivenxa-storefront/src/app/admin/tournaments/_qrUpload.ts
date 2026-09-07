import { getSupabaseAdmin } from '@/lib/chess/supabase'

const BUCKET = 'tournament-qr'

/**
 * Uploads a payment QR image to the public `tournament-qr` Supabase Storage
 * bucket (see supabase/schema.sql) and returns its public URL. Informational
 * display only — nothing here processes a payment.
 */
export async function uploadPaymentQr(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const extension = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : ''
  const path = `${crypto.randomUUID()}${extension}`

  const supabase = getSupabaseAdmin()
  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type || 'image/png',
    upsert: false,
  })
  if (error) throw new Error(`QR upload failed: ${error.message}`)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}
