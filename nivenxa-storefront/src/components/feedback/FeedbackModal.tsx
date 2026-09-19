'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { submitFeedback } from '@/lib/feedback/actions'
import { deriveScreenLabel } from '@/lib/feedback/screenLabel'
import { type FeedbackApp, type FeedbackCategory, type FeedbackRating } from '@/lib/feedback/types'
import chessStyles from './FeedbackModal.chess.module.scss'
import livingStyles from './FeedbackModal.living.module.scss'

type PickableCategory = Extract<FeedbackCategory, 'bug' | 'improvement' | 'usability' | 'feature' | 'other'>

// Short chip label, distinct from the longer FEEDBACK_CATEGORY_LABEL used
// elsewhere (the dashboard) — a compact one-screen form needs a word, not a
// sentence. Each category also drives its own question — the whole point of
// asking "what's this about?" first is that the rest of the form should
// actually change, not just the heading above an identical textarea.
const CATEGORIES: { value: PickableCategory; chip: string; emoji: string; question: string; placeholder: string }[] = [
  { value: 'bug', chip: 'Problem', emoji: '🐞', question: 'What went wrong?', placeholder: 'Describe what happened…' },
  { value: 'improvement', chip: 'Improvement', emoji: '✨', question: 'What would you change?', placeholder: 'Tell us what could be better…' },
  {
    value: 'usability',
    chip: 'Usability',
    emoji: '🎨',
    question: 'What could be easier?',
    placeholder: 'Tell us what felt confusing or difficult…',
  },
  { value: 'feature', chip: 'Feature idea', emoji: '💡', question: 'What would you like us to add?', placeholder: 'Describe the idea…' },
  { value: 'other', chip: 'Other', emoji: '💬', question: "What's on your mind?", placeholder: 'Tell us anything else…' },
]

// A plain Difficult/Okay/Easy read — no emoji — shown only for Usability,
// since "how was this screen" and "what's broken" are two different
// questions and a bug report shouldn't be asked to rate anything.
const USABILITY_RATINGS: { value: FeedbackRating; label: string }[] = [
  { value: 'poor', label: 'Difficult' },
  { value: 'okay', label: 'Okay' },
  { value: 'good', label: 'Easy' },
]

function deviceTypeFor(width: number): 'mobile' | 'tablet' | 'desktop' {
  if (width < 640) return 'mobile'
  if (width < 1024) return 'tablet'
  return 'desktop'
}

type Step = 'form' | 'sent'

export interface FeedbackIdentity {
  userId?: string | null
  email?: string | null
  role?: string | null
}

export default function FeedbackModal({
  open,
  onClose,
  app,
  identity,
}: {
  open: boolean
  onClose: () => void
  app: FeedbackApp
  identity?: FeedbackIdentity
}) {
  // Same structure, different visual language per app — a shared backend
  // and interaction model doesn't mean identical chrome. Chess gets Chess's
  // purple/serif treatment; Living gets Living's ink/water/serif-numeral one.
  const styles = app === 'living' ? livingStyles : chessStyles

  const pathname = usePathname()
  const screenLabel = useMemo(() => deriveScreenLabel(app, pathname ?? '/').label, [app, pathname])

  const [step, setStep] = useState<Step>('form')
  const [category, setCategory] = useState<PickableCategory>('bug')
  const [comment, setComment] = useState('')
  const [rating, setRating] = useState<FeedbackRating | null>(null)
  const [allowContact, setAllowContact] = useState(false)
  const [screenshotPath, setScreenshotPath] = useState<string | null>(null)
  const [screenshotName, setScreenshotName] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fresh form every time the modal opens, same pattern as AuthDrawer.
  useEffect(() => {
    if (!open) return
    ;(() => {
      setStep('form')
      setCategory('bug')
      setComment('')
      setRating(null)
      setAllowContact(false)
      setScreenshotPath(null)
      setScreenshotName(null)
      setError(null)
    })()
  }, [open])

  useEffect(() => {
    if (!open) return
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onEsc)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const active = CATEGORIES.find((c) => c.value === category)!

  function selectCategory(c: PickableCategory) {
    setCategory(c)
    // A rating only ever applied to the previous category's question.
    setRating(null)
  }

  async function handleScreenshotPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('app', app)
      formData.append('file', file)
      const res = await fetch('/api/feedback/upload-screenshot', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed.')
      setScreenshotPath(data.path)
      setScreenshotName(file.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Screenshot upload failed.')
    } finally {
      setUploading(false)
    }
  }

  function handleRemoveScreenshot() {
    setScreenshotPath(null)
    setScreenshotName(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    const { label, route } = deriveScreenLabel(app, pathname ?? '/')
    const width = window.innerWidth
    const result = await submitFeedback({
      app,
      category,
      rating: category === 'usability' ? rating : null,
      comment,
      allowContact,
      userId: identity?.userId,
      userEmail: identity?.email,
      userRole: identity?.role,
      screenLabel: label,
      route,
      appVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? null,
      deviceType: deviceTypeFor(width),
      userAgent: navigator.userAgent,
      screenWidth: width,
      screenHeight: window.innerHeight,
      screenshotPath,
    })
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setStep('sent')
  }

  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div className={styles.card} role="dialog" aria-modal="true" aria-label="Feedback" onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
          ×
        </button>

        {step === 'form' ? (
          <>
            <h2 className={styles.title}>Share feedback</h2>
            <p className={styles.subtitle}>
              Help us make {app === 'living' ? 'Living' : 'NIVENXA'} better. <span className={styles.about}>About: {screenLabel}</span>
            </p>

            <p className={styles.label}>What&rsquo;s this about?</p>
            <div className={styles.categoryRow}>
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className={c.value === category ? styles.chipActive : styles.chip}
                  onClick={() => selectCategory(c.value)}
                >
                  {c.chip}
                </button>
              ))}
            </div>

            <label className={styles.label} htmlFor="feedback-comment">
              {active.question}
            </label>
            <textarea
              id="feedback-comment"
              className={styles.textarea}
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={active.placeholder}
            />

            {category === 'usability' && (
              <>
                <p className={styles.label}>How easy was this screen to use? (optional)</p>
                <div className={styles.ratingRow}>
                  {USABILITY_RATINGS.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      className={rating === r.value ? styles.ratingBtnActive : styles.ratingBtn}
                      onClick={() => setRating(rating === r.value ? null : r.value)}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className={styles.screenshotRow}>
              {screenshotPath ? (
                <span className={styles.screenshotAttached}>
                  ✓ {screenshotName}
                  <button type="button" className={styles.removeLink} onClick={handleRemoveScreenshot}>
                    Remove
                  </button>
                </span>
              ) : (
                <button type="button" className={styles.screenshotBtn} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading ? 'Uploading…' : '📎 Add screenshot (optional)'}
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleScreenshotPick} />
            </div>

            <label className={styles.toggleRow}>
              <input type="checkbox" className={styles.toggleInput} checked={allowContact} onChange={(e) => setAllowContact(e.target.checked)} />
              <span className={styles.toggleTrack}>
                <span className={styles.toggleThumb} />
              </span>
              You can contact me about this feedback
            </label>

            {error && <p className={styles.error}>{error}</p>}

            <button type="button" className={styles.submitBtn} onClick={handleSubmit} disabled={submitting || uploading}>
              {submitting ? 'Sending…' : 'Send Feedback'}
            </button>
          </>
        ) : (
          <div className={styles.sent}>
            <p className={styles.sentEmoji}>✓</p>
            <h2 className={styles.title}>Thanks — got it.</h2>
            <p className={styles.sentBody}>Your feedback helps us improve {app === 'living' ? 'Living' : 'NIVENXA'}.</p>
            <button type="button" className={styles.submitBtn} onClick={onClose}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
