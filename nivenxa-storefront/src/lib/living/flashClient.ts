'use client'

/**
 * Client-side counterpart to lib/living/flash.ts's setLivingFlash — for the
 * couple of places a message is set before a client-driven router.push()
 * rather than a Server Action's redirect() (AuthDrawer, UploadReadingsForm).
 * Same cookie, same shape, same middleware cleanup on the next response.
 */
export function setLivingFlashClient(kind: 'notice' | 'error', message: string) {
  const value = encodeURIComponent(JSON.stringify({ kind, message }))
  document.cookie = `living_flash=${value}; path=/living; max-age=15; samesite=lax`
}
