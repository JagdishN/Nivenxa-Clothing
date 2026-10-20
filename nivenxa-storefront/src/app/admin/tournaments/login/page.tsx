import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ADMIN_TOURNAMENTS_COOKIE, hashAdminPassword } from '../_auth'
import styles from '../AdminTournaments.module.scss'

// This is itself a public 200 page (it has to be, to show the form before a
// cookie exists) — noindex keeps it out of search. follow: false, there's
// nothing on a bare login form worth a crawler following onward from.
export const metadata: Metadata = { robots: { index: false, follow: false } }

async function authenticate(formData: FormData) {
  'use server'
  const password = String(formData.get('password') ?? '')
  const expected = process.env.ADMIN_TOURNAMENTS_PASSWORD
  if (!expected) redirect('/admin/tournaments/login?error=' + encodeURIComponent('ADMIN_TOURNAMENTS_PASSWORD is not set on the server.'))
  if (password !== expected) redirect('/admin/tournaments/login?error=' + encodeURIComponent('Incorrect password.'))

  const cookieStore = await cookies()
  cookieStore.set(ADMIN_TOURNAMENTS_COOKIE, hashAdminPassword(expected), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/admin/tournaments',
    maxAge: 60 * 60 * 8, // 8 hours
  })
  redirect('/admin/tournaments')
}

export default async function AdminTournamentsLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams
  return (
    <main className={styles.page}>
      <div className={styles.loginCard}>
        <h1 className={styles.heading}>Admin — Tournaments</h1>
        {params.error && <p className={styles.error}>{params.error}</p>}
        <form action={authenticate} className={styles.loginForm}>
          <input type="password" name="password" placeholder="Password" required className={styles.input} />
          <button type="submit" className={styles.primaryBtn}>
            Sign in
          </button>
        </form>
      </div>
    </main>
  )
}
