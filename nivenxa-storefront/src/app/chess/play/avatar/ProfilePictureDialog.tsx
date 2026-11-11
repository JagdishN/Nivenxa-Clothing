'use client'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { PLAYER_AVATARS } from './playerAvatars'
import { KnightMark } from './KnightMark'
import type { UploadResult } from './usePlayerAvatar'
import styles from './ProfilePictureDialog.module.scss'

export const LIMITS_TEXT = 'JPEG, PNG or WebP, up to 5 MB, at least 64 × 64 pixels.'
const ACCEPT = ['image/jpeg', 'image/png', 'image/webp']
const VIEW = 240 // crop viewport, css px
const OUT = 512 // exported square, px
const MAX_BYTES = 5 * 1024 * 1024

interface Props {
  hasPicture: boolean
  currentPresetId: string
  onClose: () => void
  onUpload: (blob: Blob, onProgress: (f: number) => void) => Promise<UploadResult>
  onRemove: () => Promise<UploadResult>
  onPreset: (id: string) => Promise<UploadResult>
  /** Called after a successful save/removal so the page can show a brief toast. */
  onDone: (message: string) => void
}

type Phase = 'idle' | 'uploading' | 'removing'

/**
 * "Change profile picture": a dedicated dialog (never a popover over the board). Choose an image, drag and zoom it inside a circular
 * crop, preview the result, then Save or Cancel. Signed-in players only (the caller never opens it otherwise). The game underneath is
 * untouched. The browser crops for convenience; the server still decodes, validates, re-encodes and strips the image.
 */
export default function ProfilePictureDialog({ hasPicture, currentPresetId, onClose, onUpload, onRemove, onPreset, onDone }: Props) {
  const titleId = useId()
  const dialog = useRef<HTMLDivElement>(null)
  const opener = useRef<Element | null>(null)
  const [src, setSrc] = useState<string | null>(null)
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [error, setError] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState(0)
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null)
  const img = useRef<HTMLImageElement>(null)

  useEffect(() => {
    opener.current = document.activeElement
    dialog.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    return () => {
      if (opener.current instanceof HTMLElement) opener.current.focus()
    }
  }, [])
  useEffect(() => () => { if (src) URL.revokeObjectURL(src) }, [src])

  const baseScale = nat ? VIEW / Math.min(nat.w, nat.h) : 1
  const scale = baseScale * zoom
  const clamp = useCallback(
    (x: number, y: number, s = scale) => (nat ? { x: Math.min(0, Math.max(VIEW - nat.w * s, x)), y: Math.min(0, Math.max(VIEW - nat.h * s, y)) } : { x, y }),
    [nat, scale]
  )

  const choose = (file: File | undefined) => {
    setError('')
    if (!file) return
    if (!ACCEPT.includes(file.type)) return setError('Please choose a JPEG, PNG or WebP image.')
    if (file.size > MAX_BYTES) return setError('That image is larger than 5 MB. Please choose a smaller one.')
    const url = URL.createObjectURL(file)
    const probe = new Image()
    probe.onload = () => {
      if (Math.min(probe.naturalWidth, probe.naturalHeight) < 64) {
        URL.revokeObjectURL(url)
        return setError('That image is too small. Use one at least 64 × 64 pixels.')
      }
      setSrc(url)
      setNat({ w: probe.naturalWidth, h: probe.naturalHeight })
      setZoom(1)
      const s = VIEW / Math.min(probe.naturalWidth, probe.naturalHeight)
      setPos({ x: (VIEW - probe.naturalWidth * s) / 2, y: (VIEW - probe.naturalHeight * s) / 2 }) // centred
    }
    probe.onerror = () => {
      URL.revokeObjectURL(url)
      setError('That file could not be read as an image.')
    }
    probe.src = url
  }

  const setZoomKeeping = (z: number) => {
    // keep the centre of the crop where it is while zooming
    const next = baseScale * z
    const cx = (VIEW / 2 - pos.x) / scale
    const cy = (VIEW / 2 - pos.y) / scale
    setZoom(z)
    setPos(clamp(VIEW / 2 - cx * next, VIEW / 2 - cy * next, next))
  }

  const exportBlob = (): Promise<Blob | null> =>
    new Promise((resolve) => {
      const el = img.current
      if (!el || !nat) return resolve(null)
      const canvas = document.createElement('canvas')
      canvas.width = OUT
      canvas.height = OUT
      const ctx = canvas.getContext('2d')
      if (!ctx) return resolve(null)
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(el, -pos.x / scale, -pos.y / scale, VIEW / scale, VIEW / scale, 0, 0, OUT, OUT)
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9)
    })

  const save = async () => {
    setError('')
    const blob = await exportBlob()
    if (!blob) return setError('That image could not be prepared. Please try another one.')
    setPhase('uploading')
    setProgress(0)
    const r = await onUpload(blob, setProgress)
    setPhase('idle')
    if (r.ok) {
      onDone('Profile picture updated.')
      onClose()
    } else setError(r.error)
  }

  const remove = async () => {
    setError('')
    setPhase('removing')
    const r = await onRemove()
    setPhase('idle')
    if (r.ok) {
      onDone('Profile picture removed.')
      onClose()
    } else setError(r.error)
  }

  const preset = async (id: string) => {
    setError('')
    setPhase('uploading')
    const r = await onPreset(id)
    setPhase('idle')
    if (r.ok) {
      onDone('Profile picture updated.')
      onClose()
    } else setError(r.error)
  }

  const busy = phase !== 'idle'
  const previewScale = 72 / VIEW

  return (
    <div className={styles.backdrop} onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div
        ref={dialog}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="profile-picture-dialog"
        onKeyDown={(e) => {
          if (e.key === 'Escape' && !busy) {
            e.stopPropagation()
            onClose()
          }
          if (e.key === 'Tab') {
            const f = [...(dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), summary, [tabindex="0"]') ?? [])].filter((el) => el.getClientRects().length > 0 && (el.tagName === 'SUMMARY' || !el.closest('details:not([open])')))
            if (f.length === 0) return
            const first = f[0]
            const last = f[f.length - 1]
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault()
              last.focus()
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault()
              first.focus()
            }
          }
        }}
      >
        <h2 id={titleId} className={styles.title}>
          Change profile picture
        </h2>
        <p className={styles.limits} data-testid="profile-picture-limits">
          {LIMITS_TEXT}
        </p>

        <div className={styles.row}>
          <div
            className={styles.crop}
            style={{ width: VIEW, height: VIEW }}
            data-testid="profile-picture-crop"
            tabIndex={src ? 0 : -1}
            role={src ? 'application' : undefined}
            aria-label={src ? 'Crop area. Drag, or use the arrow keys, to move the picture.' : undefined}
            onPointerDown={(e) => {
              if (!src) return
              ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
              drag.current = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y }
            }}
            onPointerMove={(e) => drag.current && setPos(clamp(drag.current.x + e.clientX - drag.current.px, drag.current.y + e.clientY - drag.current.py))}
            onPointerUp={() => (drag.current = null)}
            onKeyDown={(e) => {
              const d = { ArrowLeft: [10, 0], ArrowRight: [-10, 0], ArrowUp: [0, 10], ArrowDown: [0, -10] }[e.key]
              if (d && src) {
                e.preventDefault()
                setPos(clamp(pos.x + d[0], pos.y + d[1]))
              }
            }}
          >
            {src && nat ? (
              // eslint-disable-next-line @next/next/no-img-element -- a local object URL being cropped
              <img ref={img} src={src} alt="" draggable={false} style={{ width: nat.w, height: nat.h, transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`, transformOrigin: '0 0' }} className={styles.cropImg} />
            ) : (
              <span className={styles.empty}>No image chosen</span>
            )}
            <span className={styles.ring} aria-hidden="true" />
          </div>
          <div className={styles.side}>
            <span className={styles.previewLabel}>Preview</span>
            <div className={styles.preview} data-testid="profile-picture-preview">
              {src && nat ? (
                // eslint-disable-next-line @next/next/no-img-element -- a local object URL being previewed
                <img src={src} alt="" draggable={false} style={{ width: nat.w, height: nat.h, transform: `translate(${pos.x * previewScale}px, ${pos.y * previewScale}px) scale(${scale * previewScale})`, transformOrigin: '0 0' }} className={styles.cropImg} />
              ) : (
                <KnightMark bg="#3A1550" ring="#D6A85F" />
              )}
            </div>
            <label className={styles.zoomLabel}>
              Zoom
              <input type="range" min={1} max={4} step={0.01} value={zoom} disabled={!src || busy} onChange={(e) => setZoomKeeping(Number(e.target.value))} data-testid="profile-picture-zoom" />
            </label>
          </div>
        </div>

        <input
          type="file"
          accept={ACCEPT.join(',')}
          className={styles.file}
          id={`${titleId}-file`}
          data-testid="profile-picture-file"
          disabled={busy}
          onChange={(e) => {
            choose(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <label htmlFor={`${titleId}-file`} className={styles.pick} data-autofocus tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), document.getElementById(`${titleId}-file`)?.click())}>
          {src ? 'Choose a different image' : 'Upload image'}
        </label>

        {phase === 'uploading' && (
          <progress className={styles.progress} value={progress} max={1} aria-label="Uploading" data-testid="profile-picture-progress" />
        )}
        <p className={styles.error} role="alert" data-testid="profile-picture-error">
          {error}
        </p>

        <div className={styles.actions}>
          {hasPicture && (
            <button type="button" className={styles.remove} onClick={remove} disabled={busy} data-testid="profile-picture-remove">
              {phase === 'removing' ? 'Removing…' : 'Remove picture'}
            </button>
          )}
          <span className={styles.spacer} />
          <button type="button" className={styles.cancel} onClick={onClose} disabled={busy} data-testid="profile-picture-cancel">
            Cancel
          </button>
          <button type="button" className={styles.save} onClick={save} disabled={!src || busy} data-testid="profile-picture-save">
            {phase === 'uploading' ? 'Saving…' : 'Save'}
          </button>
        </div>

        <details className={styles.presets}>
          <summary>Or choose an icon instead</summary>
          <div className={styles.presetRow}>
            {PLAYER_AVATARS.map((a) => (
              <button key={a.id} type="button" className={`${styles.preset} ${!hasPicture && a.id === currentPresetId ? styles.presetOn : ''}`} aria-label={a.label} aria-pressed={!hasPicture && a.id === currentPresetId} disabled={busy} onClick={() => preset(a.id)} data-testid={`player-avatar-option-${a.id}`}>
                <KnightMark bg={a.bg} ring={a.ring} />
              </button>
            ))}
          </div>
          <p className={styles.presetNote}>Choosing an icon replaces an uploaded picture.</p>
        </details>
      </div>
    </div>
  )
}
