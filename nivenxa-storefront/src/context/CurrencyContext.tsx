'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface CurrencyInfo {
  code: string   // ISO 4217, e.g. 'USD'
  rate: number   // 1 INR = rate units of this currency
  locale: string // BCP 47 locale for Intl.NumberFormat
}

const LOCALE_MAP: Record<string, string> = {
  USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB', JPY: 'ja-JP',
  AUD: 'en-AU', CAD: 'en-CA', SGD: 'en-SG', AED: 'ar-AE',
  NZD: 'en-NZ', CHF: 'de-CH', HKD: 'zh-HK', SEK: 'sv-SE',
  NOK: 'nb-NO', DKK: 'da-DK', MYR: 'ms-MY', THB: 'th-TH',
  IDR: 'id-ID', PHP: 'en-PH', KRW: 'ko-KR', CNY: 'zh-CN',
  BDT: 'bn-BD', PKR: 'ur-PK', LKR: 'si-LK', NPR: 'ne-NP',
  BHD: 'ar-BH', KWD: 'ar-KW', OMR: 'ar-OM', QAR: 'ar-QA',
  SAR: 'ar-SA', ZAR: 'en-ZA', BRL: 'pt-BR', MXN: 'es-MX',
  INR: 'en-IN',
}

// Currencies with no decimal places
const NO_DECIMALS = new Set(['JPY', 'KRW', 'IDR', 'VND', 'BIF', 'CLP'])

const DEFAULT: CurrencyInfo = { code: 'INR', rate: 1, locale: 'en-IN' }
const CACHE_KEY = 'nx_currency_v1'
const CACHE_TTL = 6 * 60 * 60 * 1000 // 6 hours

function formatPrice(amount: number, info: CurrencyInfo): string {
  const converted = amount * info.rate
  return new Intl.NumberFormat(info.locale, {
    style: 'currency',
    currency: info.code,
    maximumFractionDigits: NO_DECIMALS.has(info.code) ? 0 : 0,
    minimumFractionDigits: 0,
  }).format(converted)
}

interface CurrencyCtx {
  currency: CurrencyInfo
  formatPrice: (amountINR: number) => string
}

const CurrencyContext = createContext<CurrencyCtx>({
  currency: DEFAULT,
  formatPrice: (p) => `₹${p.toLocaleString('en-IN')}`,
})

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [info, setInfo] = useState<CurrencyInfo>(DEFAULT)

  useEffect(() => {
    // Try localStorage cache first
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (raw) {
        const { data, ts } = JSON.parse(raw)
        if (Date.now() - ts < CACHE_TTL) {
          setInfo(data)
          return
        }
      }
    } catch {}

    // Detect currency from IP via server-side proxy (/api/geo).
    // Direct calls to ipapi.co are blocked by CORS — the proxy
    // fetches server-side and returns only the currency code.
    fetch('/api/geo')
      .then((r) => r.json())
      .then(async (geo: { currency?: string }) => {
        const code = geo.currency ?? 'INR'
        if (code === 'INR') return // already the default

        const res = await fetch(`https://open.er-api.com/v6/latest/INR`)
        const data = await res.json()
        const rate: number = data?.rates?.[code] ?? 1
        const locale = LOCALE_MAP[code] ?? 'en-US'

        const detected: CurrencyInfo = { code, rate, locale }
        setInfo(detected)
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data: detected, ts: Date.now() }))
      })
      .catch(() => {}) // silently fall back to INR
  }, [])

  return (
    <CurrencyContext.Provider
      value={{ currency: info, formatPrice: (p) => formatPrice(p, info) }}
    >
      {children}
    </CurrencyContext.Provider>
  )
}

export const useCurrency = () => useContext(CurrencyContext)
