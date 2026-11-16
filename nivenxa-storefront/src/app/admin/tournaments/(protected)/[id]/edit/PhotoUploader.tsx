'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from '../../../AdminTournaments.module.scss'

type Status = { name: string; state: 'waiting' | 'working' | 'done' | 'error'; message?: string }

const MAX_SIDE = 2400

/** Shrinks a big phone photo in the browser (the server only accepts about 5 MB per request). Falls back to the original file if the browser cannot decode it. */
async function shrink(file: File): Promise<File | Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
    return blob ?? file
  } catch {
    return file
  }
}

/** Uploads the chosen photos one at a time; the server watermarks each and files it under the tournament's date. */
export default function PhotoUploader({ tournamentId }: { tournamentId: string }) {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<Status[]>([])
  const [busy, setBusy] = useState(false)

  async function upload(files: File[]) {
    if (!files.length) return
    setBusy(true)
    setItems(files.map((f) => ({ name: f.name, state: 'waiting' })))
    const set = (i: number, patch: Partial<Status>) => setItems((prev) => prev.map((it, n) => (n === i ? { ...it, ...patch } : it)))
    for (let i = 0; i < files.length; i++) {
      set(i, { state: 'working' })
      try {
        const body = new FormData()
        body.set('tournamentId', tournamentId)
        body.set('file', await shrink(files[i]), files[i].name.replace(/\.[^.]+$/, '') + '.jpg')
        const res = await fetch('/admin/tournaments/api/photos', { method: 'POST', body })
        const json = (await res.json().catch(() => ({}))) as { error?: string }
        if (!res.ok) set(i, { state: 'error', message: json.error ?? `Upload failed (${res.status}).` })
        else set(i, { state: 'done' })
      } catch {
        set(i, { state: 'error', message: 'Network error — try this photo again.' })
      }
    }
    setBusy(false)
    if (input.current) input.current.value = ''
    router.refresh()
  }

  return (
    <div className={styles.uploader}>
      <label className={styles.field}>
        Add photos (you can choose several)
        <input ref={input} type="file" accept="image/*" multiple disabled={busy} className={styles.input} onChange={(e) => upload(Array.from(e.target.files ?? []))} />
      </label>
      <p className={styles.mutedNote}>Each photo is shrunk, watermarked “NIVENXA CHESS” and saved under this tournament’s date automatically.</p>
      {items.length > 0 && (
        <ul className={styles.uploadList} aria-live="polite">
          {items.map((it, i) => (
            <li key={i} data-state={it.state}>
              {it.state === 'done' ? '✓' : it.state === 'error' ? '✕' : it.state === 'working' ? '…' : '·'} {it.name}
              {it.message ? ` — ${it.message}` : it.state === 'working' ? ' — uploading' : it.state === 'done' ? ' — saved' : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
