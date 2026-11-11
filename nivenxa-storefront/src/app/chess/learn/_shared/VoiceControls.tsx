'use client'
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { SpeechRate } from './useLessonVoice'
import styles from './VoiceControls.module.scss'

/**
 * Purely presentational — zero chess-domain knowledge, same separation
 * feedbackCopy.ts keeps from BoardLesson.tsx/PieceLesson.tsx. Each engine
 * owns its own useLessonVoice() instance and wires these callbacks to its
 * own step/hint logic.
 *
 * Three grouped clusters, not one flat row — Voice (on/off + pace), Help
 * (Replay/Hint/Show Me), Listen (the mic) — separated by thin dividers so
 * each control's role is visually clear without growing the bar's height.
 * No standalone "Listen" button — narration now starts on its own once the
 * learner clicks "Start lesson" and auto-speaks each new step, so the
 * persistent Voice toggle (not a one-shot button) is what controls whether
 * that happens at all. Hint/Show Me are passed via `showHintControls`
 * rather than always rendering disabled/no-op — a plain explanation step
 * has nothing for either to do.
 *
 * The "Speaking…"/"Your turn" status used to live inline in this bar,
 * sandwiched between the Voice toggle and the pace switch — on feedback
 * that it looked odd stuck between buttons. It's now rendered by each
 * engine itself, right above the Back/Next footer (see VoiceStatusLine
 * below), not as part of this control row at all.
 */
export default function VoiceControls({
  supported,
  micSupported,
  voiceOn,
  rate,
  listening,
  showHintControls,
  autoplay,
  onToggleVoice,
  onSetRate,
  onReplay,
  onWatchAgain,
  onHint,
  onShowMe,
  onMicStart,
  onMicEnd,
  layout,
  micNotice,
  helpLocked,
}: {
  supported: boolean
  micSupported: boolean
  voiceOn: boolean
  rate: SpeechRate
  listening: boolean
  showHintControls: boolean
  /** StepThroughPanel's autoplay loop only — omitted by every other caller (TacticPuzzleSet, and anything with nothing to auto-advance through). */
  autoplay?: { playing: boolean; onToggle: () => void }
  onToggleVoice: () => void
  onSetRate: (rate: SpeechRate) => void
  onReplay: () => void
  /** Restarts the whole demonstration from the top (re-teaching the concept, then the moves) — StepThroughPanel's "Watch example again," omitted elsewhere. */
  onWatchAgain?: () => void
  onHint: () => void
  onShowMe: () => void
  onMicStart: () => void
  onMicEnd: () => void
  /** 'lesson' (Chess Basics): Replay/Hint/Show Me stay visible as large controls, and voice on/off, speed and the microphone live together in one "Lesson settings" group. Omitted: the original compact bar. */
  layout?: 'lesson'
  /** Plain-language reason the microphone could not be used (lesson layout only). */
  micNotice?: string
  /** Lesson layout: the step is finished, so Hint and Show me are switched off (they would not change a recorded result). */
  helpLocked?: boolean
}) {
  if (layout === 'lesson') {
    return (
      <LessonBar
        {...{ supported, micSupported, voiceOn, rate, listening, showHintControls, onToggleVoice, onSetRate, onReplay, onHint, onShowMe, onMicStart, onMicEnd, micNotice, helpLocked }}
      />
    )
  }
  // No speechSynthesis at all in this browser — nothing here would work,
  // so the bar doesn't render rather than offering dead buttons. Every
  // lesson stays fully click-usable either way.
  if (!supported) return null

  return (
    <div className={styles.voiceBar}>
      <div className={styles.group} aria-label="Voice settings">
        <button
          type="button"
          className={`${styles.voiceToggle} ${voiceOn ? styles.voiceToggleOn : ''}`}
          onClick={onToggleVoice}
          aria-pressed={voiceOn}
        >
          {voiceOn ? '🔊 Voice: On' : '🔇 Voice: Off'}
        </button>
        {/* Narration pace, separate from whether it's on at all — Slow is
            the starting default (see useLessonVoice.ts), Normal the
            alternative. Switching only changes the NEXT utterance, never
            the one already playing. */}
        <div className={styles.rateToggle} role="group" aria-label="Narration speed">
          <button
            type="button"
            className={`${styles.rateBtn} ${rate === 'slow' ? styles.rateBtnActive : ''}`}
            onClick={() => onSetRate('slow')}
          >
            Slow
          </button>
          <button
            type="button"
            className={`${styles.rateBtn} ${rate === 'normal' ? styles.rateBtnActive : ''}`}
            onClick={() => onSetRate('normal')}
          >
            Normal
          </button>
        </div>
      </div>

      <div className={styles.divider} aria-hidden="true" />

      <div className={styles.group} aria-label="Lesson help">
        {autoplay && (
          <button type="button" className={styles.voiceBtn} onClick={autoplay.onToggle}>
            {autoplay.playing ? '⏸ Pause' : '▶ Play'}
          </button>
        )}
        <button type="button" className={styles.voiceBtn} onClick={onReplay}>
          🔁 Replay
        </button>
        {onWatchAgain && (
          <button type="button" className={styles.voiceBtn} onClick={onWatchAgain}>
            ↺ Watch example again
          </button>
        )}
        {showHintControls && (
          <>
            <button type="button" className={styles.voiceBtn} onClick={onHint}>
              💡 Hint
            </button>
            <button type="button" className={styles.voiceBtn} onClick={onShowMe}>
              👀 Show Me
            </button>
          </>
        )}
      </div>

      <div className={styles.divider} aria-hidden="true" />

      <div className={styles.group} aria-label="Voice input">
        <button
          type="button"
          className={`${styles.voiceBtn} ${styles.voiceBtnMic} ${listening ? styles.voiceBtnListening : ''}`}
          disabled={!micSupported}
          title={
            micSupported
              ? 'Hold to speak a command — narration being on never means the mic is listening'
              : "Voice commands aren't supported in this browser"
          }
          onMouseDown={onMicStart}
          onMouseUp={onMicEnd}
          onMouseLeave={onMicEnd}
          onTouchStart={onMicStart}
          onTouchEnd={onMicEnd}
          onTouchCancel={onMicEnd}
        >
          🎤 {listening ? 'Listening…' : 'Hold to talk'}
        </button>
      </div>
    </div>
  )
}

/**
 * What narration is doing right now — "Voice: On" alone doesn't say
 * whether the tutor is actually talking or waiting on the learner.
 * Deliberately rendered on its own, right above the Back/Next footer
 * (bottom-right, next to where Next will appear) rather than inside the
 * control row above — it used to sit between the Voice toggle and the pace
 * switch, which read as an odd, unrelated button wedged into that row.
 */
export function VoiceStatusLine({ status }: { status: 'speaking' | 'yourTurn' | 'readyToContinue' | null }) {
  // Only an active narration is worth a status: an enabled Next button already says "ready", and the task itself says "your turn".
  // Not a live region, so a screen reader is not told about it every time narration starts and stops.
  if (status !== 'speaking') return null
  return <p className={styles.voiceStatusFooter}>💬 Speaking…</p>
}

function LessonBar({
  supported,
  micSupported,
  voiceOn,
  rate,
  listening,
  showHintControls,
  onToggleVoice,
  onSetRate,
  onReplay,
  onHint,
  onShowMe,
  onMicStart,
  onMicEnd,
  micNotice,
  helpLocked,
}: {
  supported: boolean
  micSupported: boolean
  voiceOn: boolean
  rate: SpeechRate
  listening: boolean
  showHintControls: boolean
  onToggleVoice: () => void
  onSetRate: (rate: SpeechRate) => void
  onReplay: () => void
  onHint: () => void
  onShowMe: () => void
  onMicStart: () => void
  onMicEnd: () => void
  micNotice?: string
  helpLocked?: boolean
}) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const toggleRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  function closeSettings() {
    setOpen(false)
    // Focus goes back to the button that opened the dialog.
    requestAnimationFrame(() => toggleRef.current?.focus())
  }
  // On open, focus moves into the dialog. Escape closes it; Tab stays inside while it is open.
  useEffect(() => {
    if (!open) return
    dialogRef.current?.querySelector<HTMLElement>('button:not([disabled])')?.focus()
  }, [open])
  return (
    <div className={styles.lessonBar} data-testid="lesson-controls">
      <div className={styles.helpRow} role="group" aria-label="Lesson help">
        {supported && (
          <button type="button" className={styles.helpBtn} onClick={onReplay} data-testid="lesson-replay">
            <span aria-hidden="true">🔁</span> Replay narration
          </button>
        )}
        {showHintControls && (
          <>
            <button type="button" className={styles.helpBtn} onClick={() => !helpLocked && onHint()} aria-disabled={helpLocked || undefined} title={helpLocked ? 'This step is finished. Use Replay narration to hear the explanation again.' : undefined} data-testid="lesson-hint">
              <span aria-hidden="true">💡</span> Hint
            </button>
            <button type="button" className={styles.helpBtn} onClick={() => !helpLocked && onShowMe()} aria-disabled={helpLocked || undefined} title={helpLocked ? 'This step is finished. Use Replay narration to hear the explanation again.' : undefined} data-testid="lesson-showme">
              <span aria-hidden="true">👀</span> Show me
            </button>
          </>
        )}
        {supported && (
          <button ref={toggleRef} type="button" className={`${styles.helpBtn} ${styles.settingsBtn}`} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? panelId : undefined} onClick={() => (open ? closeSettings() : setOpen(true))} data-testid="lesson-settings-toggle">
            <span aria-hidden="true">⚙</span> Lesson settings
          </button>
        )}
      </div>

      {supported && open && createPortal(
        <div className={styles.settingsBackdrop} onMouseDown={(e) => e.target === e.currentTarget && closeSettings()}>
        <div
          id={panelId}
          ref={dialogRef}
          className={styles.settingsPanel}
          role="dialog"
          aria-modal="true"
          aria-label="Lesson settings"
          data-testid="lesson-settings"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation()
              closeSettings()
            } else if (e.key === 'Tab') {
              const f = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])') ?? [])]
              if (!f.length) return
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
          <div className={styles.settingsHead}>
            <span className={styles.settingsTitle}>Lesson settings</span>
            <button type="button" className={styles.settingsClose} onClick={closeSettings} data-testid="lesson-settings-close">
              Close
            </button>
          </div>
          <div className={styles.settingRow}>
            <span className={styles.settingLabel}>Narration</span>
            <button type="button" className={`${styles.voiceToggle} ${voiceOn ? styles.voiceToggleOn : ''} ${styles.large}`} onClick={onToggleVoice} aria-pressed={voiceOn}>
              {voiceOn ? '🔊 Voice: On' : '🔇 Voice: Off'}
            </button>
            <div className={styles.rateToggle} role="group" aria-label="Narration speed">
              <button type="button" className={`${styles.rateBtn} ${styles.large} ${rate === 'slow' ? styles.rateBtnActive : ''}`} aria-pressed={rate === 'slow'} onClick={() => onSetRate('slow')}>
                Slow
              </button>
              <button type="button" className={`${styles.rateBtn} ${styles.large} ${rate === 'normal' ? styles.rateBtnActive : ''}`} aria-pressed={rate === 'normal'} onClick={() => onSetRate('normal')}>
                Normal
              </button>
            </div>
          </div>
          <div className={styles.settingRow}>
            <span className={styles.settingLabel}>Voice input</span>
            <button
              type="button"
              className={`${styles.voiceBtn} ${styles.voiceBtnMic} ${styles.large} ${listening ? styles.voiceBtnListening : ''}`}
              disabled={!micSupported}
              onMouseDown={onMicStart}
              onMouseUp={onMicEnd}
              onMouseLeave={onMicEnd}
              onTouchStart={onMicStart}
              onTouchEnd={onMicEnd}
              onTouchCancel={onMicEnd}
              onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && !e.repeat && onMicStart()}
              onKeyUp={(e) => (e.key === ' ' || e.key === 'Enter') && onMicEnd()}
            >
              🎤 {listening ? 'Listening…' : 'Hold to talk'}
            </button>
            <p className={styles.settingNote}>
              {micSupported
                ? 'Optional. Hold the button and say “hint”, “show me”, “repeat” or “next”. Narration never turns the microphone on.'
                : 'Voice commands are not supported in this browser. Everything works with the buttons.'}
            </p>
            {micNotice && (
              <p className={styles.settingNote} role="status" data-testid="mic-notice">
                {micNotice}
              </p>
            )}
          </div>
        </div>
        </div>,
        document.body
      )}
    </div>
  )
}
