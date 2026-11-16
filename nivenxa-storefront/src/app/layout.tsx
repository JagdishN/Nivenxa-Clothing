import type { Metadata, Viewport } from 'next'
import { Playfair_Display, Inter, Noto_Sans } from 'next/font/google'
import { PARENT_META_DESCRIPTION, PARENT_META_TITLE, SITE_NAME, SITE_URL, isProductionDeploy } from '@/lib/seo'
import './globals.css'
import '@/styles/globals.scss'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const notoSans = Noto_Sans({
  subsets: ['devanagari'],
  weight: ['400', '500'],
  variable: '--font-noto-sans',
  display: 'swap',
  preload: false,
})

// Site-wide fallback — was the clothing brand's own title/description
// hardcoded here, which is what every route with no metadata of its own
// (chess, ventures, admin) was silently serving to Google/WhatsApp/link
// previews, since nivenxa.com is the holding brand now, not just the
// comfortwear storefront. Every route with real metadata (/, /technologies,
// /living, /chess) fully overrides this; this is what's left for anything
// that doesn't. No `alternates`/`openGraph.url` here on purpose — those are
// page-specific, and a canonical/og:url shared across several different
// un-overridden routes would be actively wrong, not just imprecise.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: PARENT_META_TITLE,
  description: PARENT_META_DESCRIPTION,
  applicationName: SITE_NAME,
  // Previews and branch deploys must never be indexed (see isProductionDeploy); production emits no robots tag at all.
  ...(isProductionDeploy() ? {} : { robots: { index: false, follow: false } }),
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable} ${notoSans.variable}`}>
      <body>{children}</body>
    </html>
  )
}
