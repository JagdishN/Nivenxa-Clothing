/**
 * One-time insert of the "Nivenxa Chess Tournament 2026" (02 Oct 2026, run by
 * Pragathi Chess Foundation) into the `tournaments` table, transcribed from
 * the event poster. Idempotent — matches on (name, start_date) and updates
 * that row instead of inserting a duplicate if run again.
 *
 * Usage: npm run add-tournament
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
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

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY)

// Entry fee and categories now live in their own columns (see
// supabase/tournaments_entry_categories.sql) instead of being folded into
// format/payment_note text — the card redesign surfaces both as primary
// info, so they needed to be real structured fields, not prose.
const payload = {
  name: 'Nivenxa Chess Tournament 2026',
  country: 'India',
  tournament_type: 'Local',
  start_date: '2026-10-02',
  end_date: null,
  location_name: 'Puchalapalli Sundarayya Bhavan, Elephant Circle, near Mithila Nagar Arch, Pragathinagar, Hyderabad',
  latitude: null,
  longitude: null,
  fide_rated: false,
  // Chess-notation short form ("25+10 Rapid") for the card's own scan-in-
  // 5-seconds stat row — the detail page explains what 25+10 actually means
  // for anyone who doesn't already know (see [id]/page.tsx's timeControlExplanation).
  time_control: '25+10 Rapid',
  format: '5 Rounds',
  top_players: null,
  // Kept to just the headline number — this is the card's primary,
  // 5-second-glance stat. The full Open/Girls prize breakdown lives in
  // payment_note, shown in full on the detail page instead.
  prize_pool: '₹15,000',
  entry_fee: '₹650',
  categories: 'U7, U9, U11, U14',
  organizer_name: 'Pragathi Chess Foundation (a unit of Puchalapalli Sundarayya Bhavan)',
  organizer_verified: true,
  register_url: null,
  organizer_whatsapp: '+919553301959',
  payment_note:
    'Prizes: Open — 1st ₹1,500+Trophy, 2nd ₹1,250+Trophy, 3rd–7th Trophy. Girls — 1st ₹1,000+Trophy, 2nd & 3rd Trophy. 40 trophies + certificates for all participants. Pay via UPI ID 7416996665@kotak (Pay to NIVENXA) or bank transfer — A/C No. 2324201865, IFSC KKBK0007534, Kotak Mahindra Bank. Last date of entry: 30 Sep 2026. Reporting time 10:00 AM, first round starts 10:30 AM. After payment, share the payment screenshot along with the player\'s name and date of birth (Aadhar card or DOB certificate) on WhatsApp to +919553301959 (Tournament Contact: K. Srinivasa Raju).',
  source: 'manual',
  verified: true,
  is_live: false,
  is_nivenxa_organized: true,
}

// payment_qr_url/payment_qr_source are deliberately NOT in `payload` above —
// they're set separately by scripts/upload-tournament-qr.ts once a real QR
// image exists, and this script must never clobber that on a rerun. Only
// applied as a null default on first INSERT (a brand new tournament really
// has no QR yet); left untouched on UPDATE.
const qrDefaultsForInsert = {
  payment_qr_url: null,
  payment_qr_source: null,
}

async function main() {
  const { data: existing, error: findError } = await supabase
    .from('tournaments')
    .select('id')
    .eq('name', payload.name)
    .eq('start_date', payload.start_date)
    .maybeSingle()

  if (findError) {
    console.error('Lookup failed:', findError.message)
    process.exit(1)
  }

  if (existing) {
    const { error } = await supabase.from('tournaments').update(payload).eq('id', existing.id)
    if (error) {
      console.error('Update failed:', error.message)
      process.exit(1)
    }
    console.log(`Updated existing tournament row (id=${existing.id}) — payment_qr_url left untouched.`)
  } else {
    const { data, error } = await supabase
      .from('tournaments')
      .insert({ ...payload, ...qrDefaultsForInsert })
      .select('id')
      .single()
    if (error) {
      console.error('Insert failed:', error.message)
      process.exit(1)
    }
    console.log(`Inserted new tournament row (id=${data.id}).`)
  }
}

main()
