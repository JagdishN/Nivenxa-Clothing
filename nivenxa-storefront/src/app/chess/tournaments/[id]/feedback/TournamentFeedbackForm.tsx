'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { submitTournamentFeedback } from '@/lib/feedback/tournamentFeedback'
import {
  TOURNAMENT_FEEDBACK_EXPERIENCE,
  TOURNAMENT_FEEDBACK_MAX_TEXT,
  TOURNAMENT_FEEDBACK_ROLES,
  TOURNAMENT_FEEDBACK_TOPICS,
} from '@/lib/feedback/tournamentFeedbackOptions'
import { IllustrationDefs, KnightFace, RoleIcon, TopicIcon } from './FeedbackIcons'
import styles from '../../Tournaments.module.scss'

const RETURN_SECONDS = 10

interface Draft {
  role: string
  experience: number | null
  topics: string[]
  message: string
  email: string
}

const draftKey = (id: string) => `nivenxa-tournament-feedback-draft-${id}`

function readDraft(id: string): Draft | null {
  try {
    const raw = window.localStorage.getItem(draftKey(id))
    return raw ? (JSON.parse(raw) as Draft) : null
  } catch {
    return null
  }
}

export default function TournamentFeedbackForm({ tournamentId, tournamentName, tournamentDate }: { tournamentId: string; tournamentName: string; tournamentDate: string }) {
  const router = useRouter()
  const tournamentHref = `/chess/tournaments/${tournamentId}`
  const [role, setRole] = useState('')
  const [experience, setExperience] = useState<number | null>(null)
  const [topics, setTopics] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('') // honeypot
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(RETURN_SECONDS)
  const [draftLoaded, setDraftLoaded] = useState(false)
  const textRef = useRef<HTMLTextAreaElement>(null)

  // Bring back an unsent draft (a failed submit, a reload, or signing in and coming back). It lives in this
  // browser only, and is cleared once the feedback is sent. Done after mount so the server HTML and first render match.
  useEffect(() => {
    const draft = readDraft(tournamentId)
    /* eslint-disable react-hooks/set-state-in-effect -- one-time restore from localStorage, which does not exist on the server */
    if (draft) {
      setRole(draft.role ?? '')
      setExperience(draft.experience ?? null)
      setTopics(Array.isArray(draft.topics) ? draft.topics : [])
      setMessage(draft.message ?? '')
      setEmail(draft.email ?? '')
    }
    setDraftLoaded(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [tournamentId])

  useEffect(() => {
    if (!draftLoaded || sent) return
    try {
      const empty = !role && experience === null && topics.length === 0 && !message && !email
      if (empty) window.localStorage.removeItem(draftKey(tournamentId))
      else window.localStorage.setItem(draftKey(tournamentId), JSON.stringify({ role, experience, topics, message, email } satisfies Draft))
    } catch {
      // storage blocked: the form still works, the draft just isn't kept
    }
  }, [draftLoaded, sent, tournamentId, role, experience, topics, message, email])

  // The feedback box starts small and grows as the visitor types (up to a limit, then it scrolls).
  useEffect(() => {
    const el = textRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight + 2, 320)}px`
  }, [message, draftLoaded])

  // After a successful send: count down, then go back to the same tournament page.
  useEffect(() => {
    if (!sent) return
    const timer = window.setInterval(() => setSecondsLeft((s) => s - 1), 1000)
    return () => window.clearInterval(timer)
  }, [sent])
  useEffect(() => {
    if (sent && secondsLeft <= 0) router.push(tournamentHref)
  }, [sent, secondsLeft, router, tournamentHref])

  function toggleTopic(value: string) {
    setTopics((prev) => (prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]))
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setError(null)
    if (!role) return setError('Please choose your role.')
    if (experience === null) return setError('Please choose how your overall experience was.')
    if (!message.trim()) return setError('Please write your feedback or suggestion.')
    setBusy(true)
    try {
      const result = await submitTournamentFeedback({
        tournamentId,
        role,
        experience,
        topics,
        message,
        email,
        website,
        userAgent: navigator.userAgent,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
      })
      if (result.ok) {
        try {
          window.localStorage.removeItem(draftKey(tournamentId))
        } catch {
          // nothing to clear
        }
        setSent(true)
      } else {
        setError(result.error) // the draft stays: nothing the visitor typed is lost
      }
    } catch {
      setError('Sorry, something went wrong. Your answers are kept; please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <div className={styles.fbDone} role="status">
        <h2 className={styles.detailSectionTitle}>Thank you! Your feedback has been received.</h2>
        <p>
          Returning to the tournament page in {Math.max(secondsLeft, 0)} second{secondsLeft === 1 ? '' : 's'}…
        </p>
        <Link href={tournamentHref} className={styles.fbLink}>
          Go back now →
        </Link>
      </div>
    )
  }

  return (
    <form className={styles.fbForm} onSubmit={onSubmit} noValidate>
      <IllustrationDefs />
      <div className={styles.fbSummary}>
        <p className={styles.fbSummaryName}>{tournamentName}</p>
        <p className={styles.fbSummaryDate}>{tournamentDate}</p>
      </div>

      <fieldset className={styles.fbFieldset}>
        <legend>
          Your role <em>(required)</em>
        </legend>
        <div className={styles.fbRoleGrid}>
          {TOURNAMENT_FEEDBACK_ROLES.map((r) => (
            <label key={r.value} className={`${styles.fbRoleCard} ${role === r.value ? styles.fbCardOn : ''}`}>
              <input type="radio" name="role" value={r.value} checked={role === r.value} onChange={() => setRole(r.value)} />
              <span className={styles.fbRoleArt}>
                <RoleIcon role={r.value} />
              </span>
              <span className={styles.fbCardLabel}>{r.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.fbFieldset}>
        <legend>
          Overall experience <em>(required)</em>
        </legend>
        <div className={styles.fbKnightRow}>
          {TOURNAMENT_FEEDBACK_EXPERIENCE.map((e) => (
            <label key={e.value} className={`${styles.fbKnight} ${experience === e.value ? styles.fbCardOn : ''}`}>
              <input type="radio" name="experience" value={e.value} checked={experience === e.value} onChange={() => setExperience(e.value)} aria-label={`${e.value} of 5: ${e.label}`} />
              <span className={styles.fbKnightArt}>
                <KnightFace level={e.value} />
              </span>
              <span className={styles.fbCardLabel}>{e.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.fbFieldset}>
        <legend>Which parts would you like to tell us about?</legend>
        <p className={styles.fbGuide}>Choose any that apply. You can skip this.</p>
        <div className={styles.fbTopicList}>
          {TOURNAMENT_FEEDBACK_TOPICS.map((t) => {
            const on = topics.includes(t.value)
            return (
              <label key={t.value} className={`${styles.fbTopic} ${on ? styles.fbTopicOn : ''}`}>
                <input type="checkbox" name="topics" value={t.value} checked={on} onChange={() => toggleTopic(t.value)} />
                <span className={styles.fbTick} aria-hidden="true">
                  {on ? '✓' : ''}
                </span>
                <span className={styles.fbTopicIcon}>
                  <TopicIcon topic={t.value} />
                </span>
                <span className={styles.fbTopicText}>
                  <span className={styles.fbTopicTitle}>{t.label}</span>
                  <span className={styles.fbTopicHint}>{t.hint}</span>
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <label className={styles.fbField}>
        <span>
          What went well, and what should we do better next time? <em>(required)</em>
        </span>
        <small className={styles.fbGuide}>A few lines is plenty. Name the part you mean, such as the venue, the timing or the prizes, and say what would have helped.</small>
        <textarea
          ref={textRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={TOURNAMENT_FEEDBACK_MAX_TEXT}
          rows={3}
          className={`${styles.fbInput} ${styles.fbText}`}
          placeholder="Share your tournament experience, ideas or suggestions…"
        />
        <small className={styles.fbHint}>
          {message.length} / {TOURNAMENT_FEEDBACK_MAX_TEXT}
        </small>
      </label>

      <label className={styles.fbField}>
        <span>
          Contact email <em>(optional — only if you would like a reply)</em>
        </span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={styles.fbInput} />
      </label>

      {/* Honeypot: hidden from people, tempting to bots. */}
      <div aria-hidden="true" className={styles.fbHoney}>
        <label>
          Website
          <input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
      </div>

      {error && (
        <p className={styles.fbError} role="alert">
          {error}
        </p>
      )}

      <button type="submit" disabled={busy} className={styles.fbSubmit}>
        {busy ? 'Sending…' : 'Send feedback'}
      </button>
      <p className={styles.fbPrivacy}>Your feedback is shared privately with the organising team.</p>
    </form>
  )
}
