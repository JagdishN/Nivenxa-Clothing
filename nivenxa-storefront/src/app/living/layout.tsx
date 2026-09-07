import { Suspense } from 'react'
import { IBM_Plex_Mono, IBM_Plex_Sans, Source_Serif_4 } from 'next/font/google'
import type { Metadata } from 'next'
import Toast from './Toast'
import theme from './LivingTheme.module.scss'

const sourceSerif = Source_Serif_4({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-living-serif', display: 'swap' })
const plexSans = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-living-sans', display: 'swap' })
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-living-mono', display: 'swap' })

// Every page under /living reads the caller's session (cookies()) at some
// point — landing/login/signup to redirect an already-signed-in visitor,
// everything under app/ to enforce membership. None of it can be
// statically prerendered; set once here so every nested route inherits it,
// same reasoning as the chess puzzle pages' own `force-dynamic`.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Nivenxa Living — Built for Standalone Apartments',
  description: 'Maintenance, water billing, and collections for standalone apartment buildings — without hiring a society management company.',
}

export default function LivingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${theme.theme} ${sourceSerif.variable} ${plexSans.variable} ${plexMono.variable}`}>
      <Suspense fallback={null}>
        <Toast />
      </Suspense>
      {children}
    </div>
  )
}
