import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { getSupabaseAdmin } from '@/lib/chess/supabase'
import { products } from '@/data/products'

// "Notify me when it launches" for coming-soon Studio products. The email is
// stored in studio_launch_notifications (supabase/migrations/20261022090300_studio_launch_notifications.sql)
// and used for ONE launch email — it is never added to a marketing list.

const NOTIFY_RATE_LIMIT = 5
const NOTIFY_RATE_WINDOW_SECONDS = 60 * 60

// Deliberately simple: one @, something either side, a dot in the domain, no whitespace.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  return (forwarded?.split(',')[0] ?? req.headers.get('x-real-ip') ?? 'unknown').trim()
}

/** Only a hash of the IP is ever stored, and only to rate-limit. */
async function withinRateLimit(ip: string): Promise<boolean> {
  const ipHash = createHash('sha256').update(ip).digest('hex')
  const { data, error } = await getSupabaseAdmin().rpc('studio_notify_rate_limit_increment', {
    p_ip_hash: ipHash,
    p_limit: NOTIFY_RATE_LIMIT,
    p_window_seconds: NOTIFY_RATE_WINDOW_SECONDS,
  })
  if (error) {
    // Fails OPEN, like the Chess limiter: a broken limiter shouldn't be the
    // reason a genuine request fails. The unique (email, product_id) key and
    // the validation below still bound what a client can write.
    console.error('notify rate limit rpc failed —', error.message)
    return true
  }
  return data === true
}

export async function POST(req: NextRequest) {
  let body: { email?: unknown; productId?: unknown; company?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  // Honeypot: real visitors never fill this hidden field. Pretend success so a bot learns nothing.
  if (typeof body.company === 'string' && body.company.trim() !== '') {
    return NextResponse.json({ ok: true })
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const productId = typeof body.productId === 'string' ? body.productId : ''

  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }

  // Only products that are genuinely "coming soon" accept requests.
  const product = products.find((p) => p.id === productId)
  if (!product || !product.comingSoon) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  if (!(await withinRateLimit(clientIp(req)))) {
    return NextResponse.json({ error: 'Too many requests. Please try again a little later.' }, { status: 429 })
  }

  // ignoreDuplicates: asking twice for the same product is a quiet no-op, and the
  // response is identical either way so the endpoint can't be used to probe who signed up.
  const { error } = await getSupabaseAdmin()
    .from('studio_launch_notifications')
    .upsert({ email, product_id: productId }, { onConflict: 'email,product_id', ignoreDuplicates: true })

  if (error) {
    console.error('notify insert failed —', error.message)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
