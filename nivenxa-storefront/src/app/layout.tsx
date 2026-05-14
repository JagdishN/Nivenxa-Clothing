import type { Metadata, Viewport } from 'next'
import { Playfair_Display, Inter, Noto_Sans } from 'next/font/google'
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={`${playfair.variable} ${inter.variable} ${notoSans.variable}`}>
      <body>{children}</body>
    </html>
  )
}
