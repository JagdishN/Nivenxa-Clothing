import type { Metadata, Viewport } from 'next'
import { Playfair_Display, Inter, Noto_Sans } from 'next/font/google'
import { SITE_URL } from '@/lib/seo'
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
  title: 'NIVENXA — Independent ventures. Built with intention.',
  description:
    'NIVENXA Studio and NIVENXA Technologies — premium Indian comfortwear and software built with intention, from Hyderabad, India.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={`${playfair.variable} ${inter.variable} ${notoSans.variable}`}>
      <body>{children}</body>
    </html>
  )
}
