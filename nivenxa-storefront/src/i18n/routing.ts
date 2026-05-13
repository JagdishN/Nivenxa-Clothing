import { defineRouting } from 'next-intl/routing'
import { createNavigation } from 'next-intl/navigation'

export const routing = defineRouting({
  locales: [
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
  ],
  defaultLocale: 'en',
})

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)
