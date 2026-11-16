import type { Metadata } from 'next'

// A placeholder with no content of its own: kept reachable, kept out of search (and out of the sitemap).
export const metadata: Metadata = {
  title: 'NIVENXA Ventures — Coming Soon',
  robots: { index: false, follow: true },
}

export default function VenturesPage() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'sans-serif', color: '#1F1B3A', opacity: 0.5, letterSpacing: '0.1em' }}>
        NIVENXA VENTURES — Coming Soon
      </p>
    </div>
  )
}
