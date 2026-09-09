'use client'
import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { setLivingFlashClient } from '@/lib/living/flashClient'
import theme from '../../LivingTheme.module.scss'
import homeStyles from '../Home.module.scss'
import styles from './UploadReadingsForm.module.scss'

interface FlatOption {
  id: string
  flatNo: string
  previous: number | null
}

interface ExtractedRow {
  flat_no: string
  current_reading: number
  confidence: 'high' | 'low'
}

interface ReviewRow {
  flatId: string
  flatNo: string
  previous: number | null
  current: number | null
  confidence: 'high' | 'low' | 'unmatched' | 'not-found'
}

const normalize = (flatNo: string) => flatNo.trim().toLowerCase()

/**
 * Upload → Claude vision extracts flat_no/reading pairs → this builds a
 * review table (matched against the apartment's real flats, consumption
 * computed live) → Admin corrects anything wrong → Confirm applies it via
 * a Server Action. Never saves anything without that confirm step — a
 * misread digit here becomes a wrong bill, so nothing is automatic.
 */
export default function UploadReadingsForm({
  flats,
  apply,
}: {
  flats: FlatOption[]
  apply: (entries: { flatId: string; current: number }[]) => Promise<{ error?: string }>
}) {
  const router = useRouter()
  const [step, setStep] = useState<'upload' | 'review'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<ReviewRow[]>([])
  const [unmatched, setUnmatched] = useState<ExtractedRow[]>([])

  function pickFile(f: File | null) {
    setFile(f)
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return f ? URL.createObjectURL(f) : null
    })
  }

  async function extract(e: FormEvent) {
    e.preventDefault()
    if (!file) return
    setError(null)
    setPending(true)

    const formData = new FormData()
    formData.append('file', file)
    let data: { rows?: ExtractedRow[]; error?: string }
    try {
      const res = await fetch('/api/living/extract-readings', { method: 'POST', body: formData })
      data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to extract readings')
    } catch (err) {
      setPending(false)
      setError(err instanceof Error ? err.message : 'Failed to extract readings')
      return
    }
    setPending(false)

    const extractedByFlatNo = new Map((data.rows ?? []).map((r) => [normalize(r.flat_no), r]))
    const matched: ReviewRow[] = flats.map((f) => {
      const key = normalize(f.flatNo)
      const found = extractedByFlatNo.get(key)
      extractedByFlatNo.delete(key)
      return {
        flatId: f.id,
        flatNo: f.flatNo,
        previous: f.previous,
        current: found?.current_reading ?? null,
        confidence: found ? found.confidence : 'not-found',
      }
    })
    setRows(matched)
    setUnmatched([...extractedByFlatNo.values()])
    setStep('review')
  }

  function setCurrent(flatId: string, raw: string) {
    setRows((prev) => prev.map((r) => (r.flatId === flatId ? { ...r, current: raw === '' ? null : Number(raw) } : r)))
  }

  async function confirm() {
    setPending(true)
    setError(null)
    const entries = rows.filter((r): r is ReviewRow & { current: number } => r.current !== null).map((r) => ({ flatId: r.flatId, current: r.current }))
    const result = await apply(entries)
    setPending(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setLivingFlashClient('notice', `Applied ${entries.length} reading(s) from the photo.`)
    router.push('/living/water')
  }

  if (step === 'upload') {
    return (
      <div className={theme.card} style={{ marginBottom: '1.5rem' }}>
        <h2 className={homeStyles.sectionTitle}>Upload a reading sheet photo</h2>
        <p className={theme.muted} style={{ marginBottom: '1rem' }}>
          A clear photo of this month&rsquo;s meter readings — flat numbers and readings get matched and filled in below for you to
          check before anything saves.
        </p>
        {error && <div className={theme.alert}>{error}</div>}
        <form onSubmit={extract}>
          <div className={theme.field}>
            <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
          </div>
          {previewUrl && <img src={previewUrl} alt="Reading sheet preview" className={styles.preview} />}
          <button type="submit" className={theme.button} disabled={!file || pending}>
            {pending ? 'Reading photo…' : 'Extract readings'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className={theme.card} style={{ marginBottom: '1.5rem' }}>
      <h2 className={homeStyles.sectionTitle}>Review extracted readings</h2>
      <p className={theme.muted} style={{ marginBottom: '1rem' }}>
        Check each value against the photo — <span className={theme.pillFlag}>low confidence</span> rows are the ones most likely to
        have an error. Nothing saves until you confirm.
      </p>
      {error && <div className={theme.alert}>{error}</div>}
      <div className={styles.reviewLayout}>
        {previewUrl && (
          <div className={styles.photoPane}>
            <img src={previewUrl} alt="Reading sheet" className={styles.photo} />
          </div>
        )}
        <div className={theme.tableScroll}>
          <table className={theme.table}>
            <thead>
              <tr>
                <th>Flat</th>
                <th className={theme.num}>Previous</th>
                <th className={theme.num}>Current</th>
                <th className={theme.num}>Consumption</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const consumption = row.current !== null && row.previous !== null ? row.current - row.previous : null
                return (
                  <tr key={row.flatId}>
                    <td>{row.flatNo}</td>
                    <td className={theme.num}>{row.previous ?? '—'}</td>
                    <td>
                      <input
                        className={theme.input}
                        type="number"
                        step="0.01"
                        value={row.current ?? ''}
                        onChange={(e) => setCurrent(row.flatId, e.target.value)}
                      />
                    </td>
                    <td className={theme.num}>{consumption !== null ? consumption.toLocaleString('en-IN') : '—'}</td>
                    <td>
                      {row.confidence === 'low' && <span className={theme.pillFlag}>Low confidence</span>}
                      {row.confidence === 'not-found' && <span className={theme.pillBrass}>Not on sheet</span>}
                      {row.confidence === 'high' && <span className={theme.pillOk}>Matched</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {unmatched.length > 0 && (
        <p className={theme.muted} style={{ marginTop: '0.75rem' }}>
          The sheet also listed {unmatched.map((u) => `"${u.flat_no}"`).join(', ')}, which don&rsquo;t match any flat number in this
          Apartment — ignored.
        </p>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
        <button type="button" className={theme.button} onClick={confirm} disabled={pending}>
          {pending ? 'Saving…' : 'Confirm & save'}
        </button>
        <button type="button" className={theme.buttonGhost} onClick={() => setStep('upload')} disabled={pending}>
          ← Start over
        </button>
      </div>
    </div>
  )
}
