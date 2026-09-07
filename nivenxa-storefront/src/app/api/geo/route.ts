import { NextResponse } from 'next/server'

// Server-side proxy for IP-based currency/country detection.
// The browser cannot call ipapi.co directly (CORS restriction).
// This route fetches from ipapi.co on the server and returns only the
// currency code and calling code — no PII is forwarded to the client.
// country_calling_code is also used by Nivenxa Living's phone-OTP form to
// default the country code instead of making the visitor type it.
export async function GET() {
  // Abort if ipapi.co doesn't respond within 3 s — fall back to India defaults
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 3000)

  try {
    const res = await fetch('https://ipapi.co/json/', {
      signal: controller.signal,
      headers: { 'User-Agent': 'NIVENXA-Storefront/1.0' },
      next: { revalidate: 3600 }, // Next.js cache: re-fetch at most once per hour
    })
    clearTimeout(timer)
    const data = (await res.json()) as { currency?: string; country_calling_code?: string }
    return NextResponse.json({ currency: data.currency ?? 'INR', country_calling_code: data.country_calling_code ?? '+91' })
  } catch {
    clearTimeout(timer)
    return NextResponse.json({ currency: 'INR', country_calling_code: '+91' })
  }
}
