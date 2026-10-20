'use client'
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
}) {
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
  if (!status) return null
  return (
    <p className={styles.voiceStatusFooter} aria-live="polite">
      {status === 'speaking' ? '💬 Speaking…' : status === 'yourTurn' ? 'Your turn' : 'Ready to continue'}
    </p>
  )
}
