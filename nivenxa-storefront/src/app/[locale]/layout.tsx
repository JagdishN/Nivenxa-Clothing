import type { Metadata, Viewport } from 'next'
import { Playfair_Display, Inter, Noto_Sans } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import Navbar from '@/components/global/Navbar'
import Footer from '@/components/global/Footer'
import '../globals.css'
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

// Noto Sans Devanagari — covers Hindi and Marathi
// Other Indian scripts (Bengali, Telugu, Tamil, etc.) fall back to system fonts
// which are pre-installed on all modern Indian-locale devices
const notoSans = Noto_Sans({
  subsets: ['devanagari'],
  weight: ['400', '500'],
  variable: '--font-noto-sans',
  display: 'swap',
  preload: false,
})

const RTL_LOCALES = ['ar']

export const metadata: Metadata = {
  title: 'NIVENXA — Elevated Indian Comfortwear',
  description:
    'Heavy GSM bio-washed fabrics rooted in Indian heritage craftsmanship. Cargo pants, oversized tees, and premium comfortwear.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound()
  }

  const messages = await getMessages()
  const dir = RTL_LOCALES.includes(locale) ? 'rtl' : 'ltr'

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${playfair.variable} ${inter.variable} ${notoSans.variable}`}
    >
      <body>
        <NextIntlClientProvider messages={messages}>
          <Navbar />
          <main>{children}</main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
