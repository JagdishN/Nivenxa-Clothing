/**
 * Applies a schema file (supabase/schema.sql by default, or the path given
 * as the first CLI arg — e.g. supabase/living_schema.sql) directly against
 * the project's Postgres database, using the direct connection fields in
 * .env.local (SUPABASE_host/port/database/user/SUPABASE_DB_PASSWORD) rather
 * than the Supabase CLI's migration/link flow — that flow needs an
 * interactive `supabase login` (browser OAuth) this script can't do. Once
 * the Supabase CLI is linked interactively, prefer `supabase db push` with
 * a proper `supabase/migrations/` folder for any *future* schema changes;
 * this script is the one-time (or ad hoc re-run) bootstrap path.
 *
 * NOT part of the app runtime. Usage: npm run apply-schema [-- path/to/schema.sql]
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(__dirname, '..')

// Same spirit as import-puzzles.ts's loader, but tolerant of whitespace
// around "=" (this project's .env.local has at least one "KEY =value" line).
function loadEnvLocal() {
  const envPath = resolve(PROJECT_ROOT, '.env.local')
  if (!existsSync(envPath)) return
  const raw = readFileSync(envPath, 'utf8')
  for (const line of raw.split('\n')) {
    const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!match) continue
    const [, key, rawValue] = match
    const trimmed = rawValue.trim()
    // Strip one layer of matching surrounding quotes, e.g. PASSWORD="abc123".
    const value = /^(["']).*\1$/.test(trimmed) ? trimmed.slice(1, -1) : trimmed
    if (!(key in process.env)) process.env[key] = value
  }
}
loadEnvLocal()

async function main() {
  const required = ['SUPABASE_host', 'SUPABASE_port', 'SUPABASE_database', 'SUPABASE_user', 'SUPABASE_DB_PASSWORD'] as const
  for (const key of required) {
    if (!process.env[key]) {
      console.error(`Missing ${key} in .env.local`)
      process.exit(1)
    }
  }

  const client = new Client({
    host: process.env.SUPABASE_host,
    port: Number(process.env.SUPABASE_port),
    database: process.env.SUPABASE_database,
    user: process.env.SUPABASE_user,
    password: process.env.SUPABASE_DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
  })

  console.log('Connecting to Postgres —', {
    host: process.env.SUPABASE_host,
    port: process.env.SUPABASE_port,
    database: process.env.SUPABASE_database,
    user: process.env.SUPABASE_user,
  })
  await client.connect()
  console.log('Connected.')

  const schemaArg = process.argv[2] ?? 'supabase/schema.sql'
  const schemaPath = resolve(PROJECT_ROOT, schemaArg)
  const schemaSql = readFileSync(schemaPath, 'utf8')
  console.log(`Applying ${schemaPath}...`)
  await client.query(schemaSql)
  console.log('Schema applied successfully.')

  // PostgREST (what supabase-js talks to) caches the schema and doesn't
  // notice new/changed columns on its own — without this, a column added
  // just now can 404 as "not found in the schema cache" for a little while,
  // or until something else happens to trigger a reload.
  await client.query(`notify pgrst, 'reload schema'`)
  console.log("Sent 'reload schema' to PostgREST.")

  const { rows } = await client.query(
    `select table_name from information_schema.tables where table_schema = 'public' and table_name like 'living_%' or table_name in ('puzzles','puzzle_attempts','tournaments') order by table_name`
  )
  console.log(
    'Tables now present:',
    rows.map((r) => r.table_name)
  )

  await client.end()
}

main().catch((err) => {
  console.error('Failed:', err.message)
  process.exit(1)
})
