import { seoMetadata } from '@/lib/seo'

// /chess/play is a client component, so its title/description live here.
export const metadata = seoMetadata({
  title: 'Play Chess — NIVENXA Chess',
  description: 'Play against an adaptive engine. Choose your level, your colour and your pace — from a Teacher that explains your moves to a no-commentary Master challenge.',
  path: '/chess/play',
})

export default function PlayLayout({ children }: { children: React.ReactNode }) {
  return (
    <>{children}</>
  )
}
