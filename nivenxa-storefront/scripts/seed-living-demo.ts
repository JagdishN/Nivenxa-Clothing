/**
 * One-time backfill of real August 2025 data (maintenance line items, water
 * tanker spend, a slab config, and July -> August water readings) into an
 * ALREADY-CREATED Apartment.
 *
 * This does not create the Apartment or its Admin account itself — living_*
 * rows are owned by a real auth.users row (created_by / uploaded_by columns
 * are NOT NULL FKs into auth.users), so the prerequisite is:
 *   1. Apply supabase/living_schema.sql (npm run apply-living-schema).
 *   2. Sign up for real at /living/signup and "Create an Apartment" — this
 *      is what actually creates the auth user + the Apartment row.
 *   3. Note the join code shown on that Apartment's home page.
 *   4. Run this script with that join code.
 *
 * Uses the service-role key (bypasses RLS) — same trust level as
 * apply-schema.ts / import-puzzles.ts, run by hand, never part of the app runtime.
 *
 * Usage: npm run seed-living-demo -- RVK-4F2K [YYYY-MM-01]
 *
 * The app only ever computes a "current" bill for the real calendar month
 * (no historical-month bill view exists yet in Phase 1 — a past reading only
 * shows up read-only, in the Owner's reading-history table). So by default
 * this seeds under THIS month, not the source sheet's real August 2025 date,
 * so the Home/Bill pages actually show something the moment you log in.
 * Pass an explicit month (e.g. 2025-08-01) to seed it as real history
 * instead — it just won't appear as anyone's "current bill" if you do.
 *
 * Data provenance / known caveats (surfaced again at the end of the run):
 *  - Flat list, line items, tanker spend, and readings are the real August
 *    2025 sheet, 27 flats (101-105, 201-205, 301-305, 401-405, 501-505, 603-604
 *    — 601/602 are genuinely absent from the source sheet, not an import bug).
 *  - The sheet's own amount_per_flat (1391.832) implies 26 flats, not 27,
 *    for its stated grand_total. This script does NOT seed that number —
 *    living_maintenance_months has no stored amount_per_flat column; the
 *    app computes each flat's share live from line_items ÷ actual flat
 *    count (27 here), so it'll land on ~1340.28/flat, not the sheet's
 *    1391.83. Worth reconciling against the real sheet before trusting it.
 *  - Slab tiers/rates below (base ₹30, +20%/+40%) are placeholders from the
 *    pasted schema, not confirmed real rates — edit /living/app/settings/slabs
 *    after seeding if they're wrong.
 *  - Flat 502 is seeded flagged (its own sheet says "meter not work"), with
 *    its real reading numbers kept for audit even though the app bills it
 *    via the broken-meter fallback, not those numbers, while flagged.
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

const FLATS = [
  '101', '102', '103', '104', '105',
  '201', '202', '203', '204', '205',
  '301', '302', '303', '304', '305',
  '401', '402', '403', '404', '405',
  '501', '502', '503', '504', '505',
  '603', '604',
] as const

const LINE_ITEMS = [
  { description: 'Watch Man Salary', amount: 9000, category: 'Staff' },
  { description: 'Electricity Bill', amount: 7000, category: 'Utilities' },
  { description: 'Diesel', amount: 2000, category: 'Utilities' },
  { description: 'Lift Maintenance', amount: 1400, category: 'Repairs' },
  { description: 'Cleaning Items', amount: 2000, category: 'Staff' },
  { description: 'Garbage Collection Amount', amount: 3500, category: 'Staff' },
  { description: 'Common Water Bill', amount: 787.62, category: 'Utilities' },
  { description: 'Generator Maintenance', amount: 0, category: 'Repairs' },
  { description: 'Common Electrical issues (including bulbs)', amount: 500, category: 'Repairs' },
  { description: 'Majeera water pipeline repairing', amount: 0, category: 'Repairs' },
  { description: 'Bore Motor issues', amount: 0, category: 'Repairs' },
  { description: 'General Motor issues', amount: 0, category: 'Repairs' },
  {
    description: 'Miscellaneous',
    amount: 10000,
    category: '',
    comment:
      'Cleaning Rain Harvesting Pit, Cleaning over Head Tanker, sanitizer, plumbing, Flowers, Lift Earthing issues, CCTV camera servicing, Bird Nest and others',
  },
  { description: 'Dusser Mamulu', amount: 0, category: '' },
  { description: 'Corpus Fund Recovery', amount: 0, category: '' },
]

// The real sheet's rate (1200/tanker) doesn't say WHICH of the 3 private
// sizes those 6 tankers were — rather than guess, this seeds 0 counts for
// private/govt tankers and placeholder per-size rates, but keeps Majeera's
// real amount (6534), since that one isn't size-ambiguous. Enter real
// tanker counts/rates yourself on /living/app/water and /living/app/settings/tankers.
const TANKER_RATES = {
  rate_small_5000l: 1200,
  rate_large_10000l: 1800,
  rate_xlarge_25000l: 2500,
  rate_govt_small_5000l: 1000,
  rate_govt_large_10000l: 1600,
}
const MAJEERA_AMOUNT = 6534

// [flat_no, previous_reading, current_reading]
const READINGS: [string, number, number][] = [
  ['101', 1689690, 1706682], ['102', 1082294, 1102135], ['103', 531007, 559510], ['104', 386713, 408819],
  ['105', 1465086, 1478298], ['201', 901002, 911661], ['202', 1036190, 1057291], ['203', 1213598, 1214211],
  ['204', 301526, 307892], ['205', 803652, 812641], ['301', 906478, 914753], ['302', 1284129, 1296928],
  ['303', 749231, 759846], ['304', 201250, 219172], ['305', 2569557, 2596971], ['401', 882030, 887198],
  ['402', 334739, 348984], ['403', 1429091, 1443706], ['404', 339297, 357903], ['405', 1234123, 1234464],
  ['501', 800122, 815836], ['502', 1339854, 1359854], ['503', 659087, 671354], ['504', 265918, 281960],
  ['505', 1108032, 1119544], ['603', 502901, 515125], ['604', 58169, 59824],
]

function currentMonthKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

async function main() {
  const joinCode = process.argv[2]
  const MONTH = process.argv[3] ?? currentMonthKey()
  if (!joinCode) {
    console.error('Usage: npm run seed-living-demo -- <JOIN-CODE> [YYYY-MM-01]')
    process.exit(1)
  }
  console.log(`Seeding as month ${MONTH}${process.argv[3] ? '' : ' (this month — default; pass a date to seed real history instead)'}`)

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) {
    console.error('Missing SUPABASE_URL / SUPABASE_SECRET_KEY in .env.local')
    process.exit(1)
  }
  const supabase = createClient(url, key)

  const { data: apartment, error: apartmentError } = await supabase
    .from('living_apartments')
    .select('id, name, created_by')
    .eq('join_code', joinCode.toUpperCase())
    .maybeSingle()
  if (apartmentError) throw apartmentError
  if (!apartment) {
    console.error(`No apartment found with join code ${joinCode}. Sign up and create one first — see the header comment in this script.`)
    process.exit(1)
  }
  console.log(`Seeding into "${apartment.name}" (${apartment.id})`)

  // Flats — upsert on (apartment_id, flat_no) so re-running this script is safe.
  const { data: flats, error: flatsError } = await supabase
    .from('living_flats')
    .upsert(
      FLATS.map((flat_no) => ({ apartment_id: apartment.id, flat_no })),
      { onConflict: 'apartment_id,flat_no' }
    )
    .select('id, flat_no')
  if (flatsError) throw flatsError
  console.log(`Flats: ${flats!.length}`)
  const flatIdByNo = new Map(flats!.map((f) => [f.flat_no, f.id]))

  // Maintenance month — line_items total (₹36,187.62) matches the source
  // sheet's own grand_total. Water/tanker costs are seeded separately below
  // (living_tanker_rates + living_water_supply_costs) — they're part of the
  // water bill now, not common maintenance.
  const { error: monthError } = await supabase.from('living_maintenance_months').upsert(
    {
      apartment_id: apartment.id,
      month: MONTH,
      line_items: LINE_ITEMS,
      status: 'published',
      published_at: new Date().toISOString(),
      created_by: apartment.created_by,
    },
    { onConflict: 'apartment_id,month' }
  )
  if (monthError) throw monthError
  console.log(`Maintenance month ${MONTH}: ${LINE_ITEMS.length} line items`)

  // Tanker rates — placeholders (see the TANKER_RATES comment above).
  const { error: tankerRatesError } = await supabase.from('living_tanker_rates').upsert(
    { apartment_id: apartment.id, effective_from: MONTH, ...TANKER_RATES },
    { onConflict: 'apartment_id,effective_from' }
  )
  if (tankerRatesError) throw tankerRatesError

  // Water supply costs for the month — Majeera's real amount, 0 tanker
  // counts (see TANKER_RATES comment for why).
  const { error: supplyCostError } = await supabase.from('living_water_supply_costs').upsert(
    {
      apartment_id: apartment.id,
      month: MONTH,
      small_tanker_count: 0,
      large_tanker_count: 0,
      xlarge_tanker_count: 0,
      govt_small_tanker_count: 0,
      govt_large_tanker_count: 0,
      majeera_amount: MAJEERA_AMOUNT,
      majeera_extra_enabled: true,
      majeera_extra_amount: 0,
    },
    { onConflict: 'apartment_id,month' }
  )
  if (supplyCostError) throw supplyCostError
  console.log(`Water supply costs: Majeera ₹${MAJEERA_AMOUNT}, tanker counts 0 (enter real counts on /living/app/water)`)

  // Slab config — placeholder rates from the pasted schema (base ₹30/1000L,
  // +20% 5-10k, +40% 10k+), not confirmed real ones.
  const { error: slabError } = await supabase.from('living_slab_configs').upsert(
    {
      apartment_id: apartment.id,
      effective_from: MONTH,
      base_rate_per_1000l: 30,
      slabs: [
        { from_liters: 0, to_liters: 5000, rate_multiplier: 1 },
        { from_liters: 5000, to_liters: 10000, rate_multiplier: 1.2 },
        { from_liters: 10000, to_liters: null, rate_multiplier: 1.4 },
      ],
      grace_period_days: 15,
      escalation_cadence: 'weekly',
      escalation_multiplier: 2.0,
      rise_threshold_percent: 15,
      notify_admin_at_streak: 3,
    },
    { onConflict: 'apartment_id,effective_from' }
  )
  if (slabError) throw slabError
  console.log('Slab config seeded (placeholder rates — edit in /living/app/settings/slabs if wrong).')

  // Water readings — flat 502 flagged per the source sheet's "meter not work" note.
  const readingRows = READINGS.map(([flatNo, previous, current]) => {
    const flatId = flatIdByNo.get(flatNo)
    if (!flatId) throw new Error(`Reading for unknown flat_no ${flatNo}`)
    const flagged = flatNo === '502'
    return {
      apartment_id: apartment.id,
      flat_id: flatId,
      month: MONTH,
      previous_reading: previous,
      current_reading: current,
      flagged,
      flagged_note: flagged ? 'Meter not working' : null,
      flagged_since: flagged ? MONTH : null,
    }
  })
  const { error: readingsError } = await supabase.from('living_water_readings').upsert(readingRows, { onConflict: 'apartment_id,flat_id,month' })
  if (readingsError) throw readingsError
  console.log(`Water readings: ${readingRows.length}`)

  console.log(`
Done. Reminders:
  - 27 flats seeded — your source sheet's amount_per_flat (1391.832) implies 26;
    the app will compute ~1340.28/flat live off the actual 27. Check which is right.
  - Slab rates are placeholders — confirm/edit at /living/app/settings/slabs.
  - Tanker rates are placeholders and counts are seeded at 0 — confirm/edit
    rates at /living/app/settings/tankers, enter real counts at /living/app/water.
  - Flat 502 is flagged; its bill comes from the broken-meter fallback, not
    the raw reading numbers above (which are kept only for audit).`)
}

main().catch((err) => {
  console.error('Failed:', err.message ?? err)
  process.exit(1)
})
