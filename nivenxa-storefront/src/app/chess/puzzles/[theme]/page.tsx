import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPuzzlesByTheme, THEME_LABELS } from '@/lib/chess/puzzles'
import PuzzleSolver from './PuzzleSolver'
import styles from '../Puzzles.module.scss'

export const dynamic = 'force-dynamic'

export default async function PuzzleThemePage({ params }: { params: Promise<{ theme: string }> }) {
  const { theme } = await params
  const puzzles = await getPuzzlesByTheme(theme)
  if (puzzles.length === 0) notFound()

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <Link href="/chess/puzzles" className={styles.breadcrumb}>
          ← Puzzles
        </Link>
        <h1 className={styles.heading}>{THEME_LABELS[theme] ?? theme}</h1>
        <p className={styles.subtext}>
          {puzzles.length} puzzle{puzzles.length === 1 ? '' : 's'}, easiest first.
        </p>
      </section>

      <PuzzleSolver puzzles={puzzles} themeLabel={THEME_LABELS[theme] ?? theme} theme={theme} />
    </main>
  )
}
