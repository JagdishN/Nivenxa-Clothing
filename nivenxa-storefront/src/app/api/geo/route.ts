import { NextResponse } from 'next/server'

// Server-side proxy for IP-based currency detection.
// The browser cannot call ipapi.co directly (CORS restriction).
// This route fetches from ipapi.co on the server and returns
// only the currency code — no PII is forwarded to the client.
export async function GET() {
  // Abort if ipapi.co doesn't respond within 3 s — fall back to INR
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 3000)

  try {
    const res = await fetch('https://ipapi.co/json/', {
      signal: controller.signal,
      headers: { 'User-Agent': 'NIVENXA-Storefront/1.0' },
      next: { revalidate: 3600 }, // Next.js cache: re-fetch at most once per hour
    })
    clearTimeout(timer)
    const data = await res.json() as { currency?: string }
    return NextResponse.json({ currency: data.currency ?? 'INR' })
  } catch {
    clearTimeout(timer)
    return NextResponse.json({ currency: 'INR' })
  }
}
