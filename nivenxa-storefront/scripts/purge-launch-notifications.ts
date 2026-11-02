/**
 * Retention job for Studio "notify me" requests. Implements the promise in the
 * Studio Privacy Policy (section 7): launch notification requests are deleted
 * once the notification has been sent (notified_at is set), or after 12 months
 * if the product hasn't launched.
 *
 * No scheduler is wired into this stack (the repo carries both vercel.json and
 * netlify.toml, and neither defines cron jobs), so this is a documented admin
 * script — run it at least monthly:
 *
 *   npm run purge-launch-notifications
 *
 * It calls studio_purge_launch_notifications() (supabase/migrations/20261022090300_studio_launch_notifications.sql),
 * which does the delete in the database. If your Supabase plan has pg_cron, the
 * same function can be scheduled there instead:
 *   select cron.schedule('purge-launch-notifications', '0 3 * * *', 'select studio_purge_launch_notifications()');
 *
 * NOT part of the app runtime.
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '..', '.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!match) continue
    const [, key, rawValue] = match
    const trimmed = rawValue.trim()
    const value = /^(["']).*\1$/.test(trimmed) ? trimmed.slice(1, -1) : trimmed
    if (!(key in process.env)) process.env[key] = value
  }
}

async function main() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local')

  const supabase = createClient(url, key)
  const { data, error } = await supabase.rpc('studio_purge_launch_notifications')
  if (error) throw new Error(`Purge failed: ${error.message}`)
  console.log(`Purged ${data ?? 0} launch notification request(s).`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
