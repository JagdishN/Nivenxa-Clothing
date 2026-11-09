import { notFound } from 'next/navigation'
import AppFooter from '@/components/global/AppFooter/AppFooter'
import type { FooterApp } from '@/lib/footerConfig'

// Development-only: each app's footer (incl. Living's wide signed-in alignment), because the signed-in Living
// screens can't be opened without an account. 404 in a production build. Used by tests/app-footer.spec.ts.
export const dynamic = 'force-dynamic'

const APPS: Array<{ key: string; app: FooterApp; wide?: boolean }> = [
  { key: 'chess', app: 'chess' },
  { key: 'living', app: 'living' },
  { key: 'living-wide', app: 'living', wide: true },
  { key: 'technologies', app: 'technologies' },
]

export default function Page() {
  if (process.env.NODE_ENV === 'production') notFound()
  return (
    <main style={{ background: '#F7F5EF', padding: '1rem 0' }}>
      {APPS.map(({ key, app, wide }) => (
        <section key={key} data-preview={key} style={{ marginBottom: '6rem' }}>
          <p style={{ font: '12px sans-serif', margin: '0 1rem 0.4rem' }}>{key}</p>
          <AppFooter app={app} wide={wide} />
        </section>
      ))}
    </main>
  )
}
