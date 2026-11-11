'use client'
import { useEffect, useState } from 'react'
import { useChessAuth } from '../../_auth/ChessAuthProvider'
import { resolvePlayerAvatar } from './playerAvatars'
import { usePlayerAvatar } from './usePlayerAvatar'
import { dismissAccountExpired, useAccountExpiry } from '@/lib/chess/sessionExpiry'
import { KnightMark } from './KnightMark'
import ProfilePictureDialog from './ProfilePictureDialog'
import styles from './PlayerAvatar.module.scss'

export { KnightMark }

/**
 * "You · White" row content: the player's profile picture, the name and one action line. A static identity image: it never animates,
 * never reacts to the game and is not a bot character.
 * Everyone has one: guests and accounts without a saved picture show the designated default knight.
 * Guests: "Sign in to change your picture" (opens the sign-in drawer; the game carries on underneath).
 * Signed in: "Change profile picture" opens a dedicated dialog (upload, crop, save/cancel, remove). Success is a brief toast, never
 * permanent text under the header.
 */
export default function PlayerAvatar({ children }: { children: React.ReactNode }) {
  const { userId, signedIn, presetId, pictureUrl, hasPicture, upload, removePicture, choosePreset } = usePlayerAvatar()
  const auth = useChessAuth()
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const current = resolvePlayerAvatar(presetId)
  const expiry = useAccountExpiry()
  const expired = expiry.expired && expiry.userId === userId

  // Signing out closes the dialog: nothing from the previous account stays on screen.
  useEffect(() => {
    if (!signedIn) {
      setOpen(false) // eslint-disable-line react-hooks/set-state-in-effect -- reacting to an external auth change
      setToast('')
    }
  }, [signedIn])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 3500)
    return () => clearTimeout(t)
  }, [toast])

  // After an expired sign-in the account's picture is no longer shown as current: the default stands in until sign-in works again.
  const showPicture = !!pictureUrl && failedUrl !== pictureUrl && !expired

  return (
    <div className={styles.wrap}>
      <div className={styles.disc} data-testid="player-avatar" data-avatar-id={showPicture ? 'custom' : current.id}>
        {showPicture ? (
          // eslint-disable-next-line @next/next/no-img-element -- the player's own private picture, served by an authenticated route at a fixed size
          <img className={styles.photo} src={pictureUrl!} width={64} height={64} alt="Your profile picture" data-testid="player-avatar-image" onError={() => setFailedUrl(pictureUrl)} draggable={false} />
        ) : (
          <KnightMark bg={current.bg} ring={current.ring} title="Your profile picture" />
        )}
      </div>
      <div className={styles.text}>
        <span className={styles.name}>{children}</span>
        {signedIn ? (
          <button type="button" className={styles.action} onClick={() => setOpen(true)} data-testid="player-avatar-change">
            Change profile picture
          </button>
        ) : (
          <button type="button" className={styles.action} onClick={() => auth.open('login')} data-testid="player-avatar-signin">
            Sign in to change your picture
          </button>
        )}
      </div>
      {open && signedIn && (
        <ProfilePictureDialog
          hasPicture={hasPicture}
          currentPresetId={current.id}
          onClose={() => setOpen(false)}
          onUpload={(blob, onProgress) => upload(blob, onProgress)}
          onRemove={removePicture}
          onPreset={choosePreset}
          onDone={setToast}
        />
      )}
      {expired && !expiry.dismissed && (
        <div className={styles.expiry} role="status" data-testid="session-expired">
          <span>Your sign-in has expired. Sign in again to use your profile picture and keep coach progress on your account. Your game is not affected.</span>
          <button type="button" onClick={() => auth.open('login')} data-testid="session-expired-signin">
            Sign in
          </button>
          <button type="button" onClick={dismissAccountExpired} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}
      {toast && (
        <div className={styles.toast} role="status" data-testid="player-avatar-toast">
          {toast}
        </div>
      )}
    </div>
  )
}
