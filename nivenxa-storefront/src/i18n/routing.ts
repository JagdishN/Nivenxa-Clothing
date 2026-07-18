import { defineRouting } from 'next-intl/routing'
import { createNavigation } from 'next-intl/navigation'

const LOCALES = [
  'en',   // English
  'hi',   // Hindi
  'bn',   // Bengali
  'te',   // Telugu
  'mr',   // Marathi
  'ta',   // Tamil
  'gu',   // Gujarati
  'kn',   // Kannada
  'ml',   // Malayalam
  'pa',   // Punjabi
  'fr',   // French
  'de',   // German
  'es',   // Spanish
  'ar',   // Arabic (RTL)
  'ja',   // Japanese
  'zh',   // Chinese Simplified
] as const

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: 'en',
  localePrefix: {
    mode: 'always',
    prefixes: Object.fromEntries(LOCALES.map(l => [l, `/studio/${l}`])) as Record<typeof LOCALES[number], string>,
  },
})

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)
