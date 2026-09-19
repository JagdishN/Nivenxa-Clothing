import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getChessSession, safeChessRedirect } from '@/lib/chess/chessAuth'
import ChessOtpForm from '../_auth/ChessOtpForm'
import styles from '../_auth/ChessAuthForm.module.scss'

export default async function ChessSignupPage({ searchParams }: { searchParams: Promise<{ redirect?: string }> }) {
  const { redirect: redirectParam } = await searchParams
  const redirectTo = safeChessRedirect(redirectParam)

  const session = await getChessSession()
  if (session) redirect(redirectTo)

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <p className={styles.eyebrow}>NIVENXA CHESS</p>
        <h1 className={styles.title}>Sign Up</h1>
        <p className={styles.subtitle}>Create a Nivenxa account to save your games and pick up your analysis anywhere.</p>
        <ChessOtpForm mode="signup" redirectTo={redirectTo} />
        <p className={styles.footer}>
          Already have an account? <Link href={`/chess/login?redirect=${encodeURIComponent(redirectTo)}`}>Log in</Link>
        </p>
      </div>
    </main>
  )
}
