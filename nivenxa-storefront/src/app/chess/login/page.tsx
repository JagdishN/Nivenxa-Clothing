import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getChessSession, safeChessRedirect } from '@/lib/chess/chessAuth'
import ChessOtpForm from '../_auth/ChessOtpForm'
import styles from '../_auth/ChessAuthForm.module.scss'

export default async function ChessLoginPage({ searchParams }: { searchParams: Promise<{ redirect?: string }> }) {
  const { redirect: redirectParam } = await searchParams
  const redirectTo = safeChessRedirect(redirectParam)

  const session = await getChessSession()
  if (session) redirect(redirectTo)

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <p className={styles.eyebrow}>NIVENXA CHESS</p>
        <h1 className={styles.title}>Log In</h1>
        <p className={styles.subtitle}>Sign in to see the games you&apos;ve played on Nivenxa and continue previous analyses.</p>
        <ChessOtpForm mode="login" redirectTo={redirectTo} />
        <p className={styles.footer}>
          New to Nivenxa? <Link href={`/chess/signup?redirect=${encodeURIComponent(redirectTo)}`}>Sign up</Link>
        </p>
      </div>
    </main>
  )
}
