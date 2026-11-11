'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createChessBrowserClient } from '@/lib/chess/chessSupabaseBrowser'
import { useChessSession } from '@/lib/chess/useChessSession'
import { clearAccountExpired, markAccountExpired } from '@/lib/chess/sessionExpiry'
import { DEFAULT_PLAYER_AVATAR_ID, PLAYER_AVATAR_METADATA_KEY, resolvePlayerAvatar } from './playerAvatars'

export const PICTURE_API = '/api/chess/profile-picture'

export type UploadResult = { ok: true } | { ok: false; error: string }

/**
 * The human player's identity picture. Everyone has one: guests and accounts without a saved picture get the designated default
 * knight. Only a signed-in player can upload, replace or remove a custom picture (saved on the account by the server, restored on
 * any device). A preset icon remains an optional secondary choice and never substitutes for an upload.
 * Nothing about the previous account is kept: on sign-out the picture is gone from the page at once.
 */
export function usePlayerAvatar() {
  const session = useChessSession()
  const [presetId, setPresetId] = useState(DEFAULT_PLAYER_AVATAR_ID)
  const [version, setVersion] = useState<number | null>(null) // null = no custom picture
  const userRef = useRef<string | null>(null)

  useEffect(() => {
    userRef.current = session.userId
    if (!session.signedIn || !session.userId) {
      setPresetId(DEFAULT_PLAYER_AVATAR_ID) // eslint-disable-line react-hooks/set-state-in-effect -- reacting to an external auth change
      setVersion(null)
      return
    }
    const uid = session.userId
    let live = true
    setVersion(null) // account switch: nothing from the previous account stays until THIS account's own picture is known
    setPresetId(DEFAULT_PLAYER_AVATAR_ID)
    try {
      createChessBrowserClient()
        .auth.getSession()
        .then(({ data }) => live && userRef.current === uid && setPresetId(resolvePlayerAvatar(data.session?.user.user_metadata?.[PLAYER_AVATAR_METADATA_KEY]).id))
        .catch(() => {})
    } catch {
      // accounts not configured here
    }
    fetch(`${PICTURE_API}?info=1`)
      .then((r) => {
        if (r.status === 401 && live && userRef.current === uid) markAccountExpired(uid) // the page thinks it is signed in but the server disagrees
        else if (r.ok) clearAccountExpired()
        return r.ok ? r.json() : null
      })
      .then((d: { version?: number; hasPicture?: boolean } | null) => {
        if (live && userRef.current === uid) setVersion(d?.hasPicture && typeof d.version === 'number' ? d.version : null)
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [session.signedIn, session.userId, session.epoch])

  const pictureUrl = version !== null && session.userId ? `${PICTURE_API}?u=${encodeURIComponent(session.userId)}&v=${version}` : null

  /** Uploads an already cropped square image. Reports progress; never changes the shown picture unless the server saved it. */
  const upload = useCallback(
    (blob: Blob, onProgress?: (fraction: number) => void): Promise<UploadResult> =>
      new Promise((resolve) => {
        const uid = userRef.current
        if (!uid) return resolve({ ok: false, error: 'Sign in to change your profile picture.' })
        const form = new FormData()
        form.append('file', blob, 'profile.jpg')
        const xhr = new XMLHttpRequest()
        xhr.open('POST', PICTURE_API)
        xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total)
        xhr.onerror = () => resolve({ ok: false, error: 'The upload failed. Check your connection and try again. Your picture is unchanged.' })
        xhr.ontimeout = xhr.onerror
        xhr.timeout = 30000
        xhr.onload = () => {
          let body: { version?: number; error?: string } = {}
          try {
            body = JSON.parse(xhr.responseText)
          } catch {
            // not JSON
          }
          if (xhr.status === 401) {
            if (userRef.current === uid) {
              markAccountExpired(uid)
              setVersion(null)
            }
            return resolve({ ok: false, error: 'Your sign-in has expired. Sign in again to change your profile picture. Your game is not affected.' })
          }
          if (xhr.status >= 200 && xhr.status < 300 && typeof body.version === 'number') {
            if (userRef.current === uid) setVersion(body.version) // ignored if the player signed out meanwhile
            resolve({ ok: true })
          } else resolve({ ok: false, error: body.error ?? 'Your picture could not be saved. Your previous picture is unchanged.' })
        }
        xhr.send(form)
      }),
    []
  )

  const removePicture = useCallback(async (): Promise<UploadResult> => {
    const uid = userRef.current
    if (!uid) return { ok: false, error: 'Sign in to change your profile picture.' }
    try {
      const res = await fetch(PICTURE_API, { method: 'DELETE' })
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      if (res.status === 401) {
        markAccountExpired(uid)
        return { ok: false, error: 'Your sign-in has expired. Sign in again to change your profile picture.' }
      }
      if (!res.ok) return { ok: false, error: body.error ?? 'Your picture could not be removed. Please try again.' }
      if (userRef.current === uid) setVersion(null)
      return { ok: true }
    } catch {
      return { ok: false, error: 'Your picture could not be removed. Please try again.' }
    }
  }, [])

  /** Optional secondary choice: a preset icon. Choosing one replaces any custom picture (the player sees exactly one identity). */
  const choosePreset = useCallback(
    async (id: string): Promise<UploadResult> => {
      if (!session.signedIn) return { ok: false, error: 'Sign in to change your profile picture.' }
      const previous = presetId
      const next = resolvePlayerAvatar(id).id
      setPresetId(next)
      try {
        if (version !== null) {
          const r = await removePicture()
          if (!r.ok) throw new Error(r.error)
        }
        const { error } = await createChessBrowserClient().auth.updateUser({ data: { [PLAYER_AVATAR_METADATA_KEY]: next } })
        if (error) throw error
        return { ok: true }
      } catch {
        setPresetId(previous)
        return { ok: false, error: "Couldn't save your choice. Please try again." }
      }
    },
    [session.signedIn, presetId, version, removePicture]
  )

  return { userId: session.userId, signedIn: session.signedIn, presetId, pictureUrl, hasPicture: version !== null, upload, removePicture, choosePreset }
}
