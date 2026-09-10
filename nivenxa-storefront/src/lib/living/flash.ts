import { cookies } from 'next/headers'

const FLASH_COOKIE = 'living_flash'
// Belt-and-suspenders only — middleware.ts is what actually clears this
// (a Server Component render can't write cookies, so the layout that
// reads it can't clear it itself). This cap just bounds how long a flash
// could theoretically resurface if middleware somehow didn't run.
const FLASH_MAX_AGE_SECONDS = 15

export type FlashKind = 'notice' | 'warning' | 'error'

export interface LivingFlashMessage {
  kind: FlashKind
  message: string
}

/**
 * A one-time message carried across a Server Action's redirect() — the only
 * channel a plain <form action={serverAction}> has to say "here's what
 * happened" — via a short-lived cookie instead of a ?notice=/?error= query
 * param, so it never appears in the URL bar. Call this, then redirect() to
 * a clean path. living/layout.tsx reads it once (readLivingFlash) and hands
 * it to <Toast>; middleware.ts strips the cookie from the very next response
 * so it can't resurface on a later navigation or refresh.
 */
export async function setLivingFlash(kind: FlashKind, message: string) {
  const store = await cookies()
  store.set(FLASH_COOKIE, JSON.stringify({ kind, message }), {
    path: '/living',
    maxAge: FLASH_MAX_AGE_SECONDS,
    httpOnly: true,
    sameSite: 'lax',
  })
}

export async function setLivingNotice(message: string) {
  await setLivingFlash('notice', message)
}

export async function setLivingWarning(message: string) {
  await setLivingFlash('warning', message)
}

export async function setLivingError(message: string) {
  await setLivingFlash('error', message)
}

/** Read-only — safe to call from a Server Component render. Clearing happens in middleware.ts, not here. */
export async function readLivingFlash(): Promise<LivingFlashMessage | null> {
  const store = await cookies()
  const raw = store.get(FLASH_COOKIE)?.value
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (parsed && (parsed.kind === 'notice' || parsed.kind === 'warning' || parsed.kind === 'error') && typeof parsed.message === 'string') {
      return parsed as LivingFlashMessage
    }
  } catch {
    // Malformed/tampered cookie — treat as no message rather than throwing.
  }
  return null
}
