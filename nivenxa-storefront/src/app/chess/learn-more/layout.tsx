import { seoMetadata } from '@/lib/seo'

// learn-more/page.tsx is a client component, so its metadata lives in this layout (same pattern as /chess/play).
export const metadata = seoMetadata({
  title: 'The Story of Chess — A Short History | NIVENXA Chess',
  description: 'A short timeline of chess, from its origins in India to the modern game.',
  path: '/chess/learn-more',
})

export default function LearnMoreLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
