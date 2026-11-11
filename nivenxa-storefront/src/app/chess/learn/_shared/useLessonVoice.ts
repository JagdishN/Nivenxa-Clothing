'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Shared by BoardLesson.tsx and PieceLesson.tsx — all Web Speech API
 * plumbing (TTS + push-to-talk STT + command parsing) lives here once,
 * same reason feedbackCopy.ts is shared rather than duplicated per engine.
 * No cloud/paid provider — browser-native speechSynthesis/SpeechRecognition
 * only, per the user's own explicit choice.
 *
 * Narration is strictly decorative: nothing in a lesson may wait for it. Every
 * path that starts speech goes through `speak`, which bumps a generation
 * counter; a callback from an utterance (or a reading-time timer) that belongs
 * to an older generation is ignored, so rapid Back/Next, repeated Replay and
 * leaving the lesson can never produce overlapping speech or a late callback.
 */

export type VoiceCommand = 'repeat' | 'hint' | 'explain' | 'showMe' | 'tryAgain' | 'next' | 'pause' | 'resume'
export type SpeechRate = 'slow' | 'normal'

const MUTE_STORAGE_KEY = 'chess-voice-muted'
const RATE_STORAGE_KEY = 'chess-voice-rate'
// Slow is the default — the plain 0.95 this used before was never a
// deliberate "slow" choice, just a mild default. 0.78 reads as genuinely
// slower without dragging; 1.0 is the browser's own normal pace.
const RATE_VALUES: Record<SpeechRate, number> = { slow: 0.78, normal: 1 }

// Order matters: longer/more-specific phrases checked before the shorter
// ones they could otherwise be confused with ("show me" before "hint").
const COMMAND_PATTERNS: [VoiceCommand, RegExp][] = [
  ['showMe', /show\s*me/],
  ['tryAgain', /try\s*again/],
  ['explain', /explain/],
  ['hint', /hint/],
  ['repeat', /repeat/],
  ['resume', /resume/],
  ['pause', /pause/],
  ['next', /next/],
]

// Roughly 200 words/minute, with a floor so even a short "This is check."
// still gets a moment — used to pace autoplay (StepThroughPanel.tsx) when
// voice is muted/unsupported and there's no real utterance to wait out.
export function estimateReadingMs(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1200, Math.round((words / 200) * 60000))
}

/** The saved "voice off" preference, readable before the hook's own mount effect has applied it. */
export function readMutedPreference(): boolean {
  try {
    return localStorage.getItem(MUTE_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function parseVoiceCommand(transcript: string): VoiceCommand | null {
  const text = transcript.toLowerCase()
  for (const [command, pattern] of COMMAND_PATTERNS) {
    if (pattern.test(text)) return command
  }
  return null
}

// Minimal ambient typing for the Web Speech STT API — not present in this
// project's TS lib target, and only ever used inside this one file.
interface SpeechRecognitionEventLike extends Event {
  results: { [index: number]: { [index: number]: { transcript: string } } }
}
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onend: (() => void) | null
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

export function useLessonVoice() {
  const [supported, setSupported] = useState(false)
  const [micSupported, setMicSupported] = useState(false)
  const [muted, setMuted] = useState(false)
  const [rate, setRate] = useState<SpeechRate>('slow')
  const [listening, setListening] = useState(false)
  // True while an utterance is actually sounding. Purely informational (a "Speaking…" status): no control may
  // be hidden, disabled or delayed because of it.
  const [speaking, setSpeaking] = useState(false)
  // A short, plain-language reason the microphone could not be used (blocked permission, no microphone…), or ''.
  const [micNotice, setMicNotice] = useState('')
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  // Bumped by every speak()/cancel(). An utterance or timer from an older generation is stale and must do nothing.
  const generation = useRef(0)
  const readingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Deliberately an effect, not a lazy useState initializer: these values
  // are only knowable client-side (window/localStorage don't exist during
  // SSR), so starting at `false` and flipping after mount is what keeps the
  // very first client render matching the server-rendered markup. This is the
  // one setState-in-effect in this file that isn't avoidable by restructuring.
  useEffect(() => {
    setSupported(typeof window !== 'undefined' && 'speechSynthesis' in window && !!window.speechSynthesis)
    setMicSupported(typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition))
    try {
      setMuted(localStorage.getItem(MUTE_STORAGE_KEY) === '1')
      const storedRate = localStorage.getItem(RATE_STORAGE_KEY)
      if (storedRate === 'slow' || storedRate === 'normal') setRate(storedRate)
    } catch {
      // Private-mode/blocked storage — defaults stay as declared above.
    }
  }, [])

  /** Stops whatever is sounding AND invalidates every pending callback from earlier speech. */
  const cancel = useCallback(() => {
    generation.current += 1
    if (readingTimer.current) {
      clearTimeout(readingTimer.current)
      readingTimer.current = null
    }
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    } catch {
      // A browser that throws on cancel() has nothing playing worth stopping.
    }
    setSpeaking(false)
  }, [])

  // Cancels whatever's mid-utterance first — every path to new speech (Replay, Hint, Show Me, the step-entry
  // auto-speak, a spoken command) goes through this one function.
  //
  // `onEnd`, when passed, fires once this utterance finishes (only if it is still the latest speech). When voice is
  // muted/unsupported (or `text` is empty), or the browser refuses to speak, `onEnd` fires after a reading-time
  // estimate instead, so a caller never waits forever on speech that cannot happen.
  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      cancel()
      const mine = generation.current
      const finish = () => {
        if (generation.current !== mine) return
        setSpeaking(false)
        onEnd?.()
      }
      if (!supported || muted || !text) {
        if (onEnd) readingTimer.current = setTimeout(finish, estimateReadingMs(text))
        return
      }
      try {
        // Visible step copy uses a lightweight **bold** convention — the literal asterisks must not be spoken.
        const utterance = new SpeechSynthesisUtterance(text.replace(/\*\*/g, ''))
        utterance.rate = RATE_VALUES[rate]
        utterance.onstart = () => {
          if (generation.current === mine) setSpeaking(true)
        }
        utterance.onend = finish
        utterance.onerror = finish
        window.speechSynthesis.speak(utterance)
      } catch {
        // Speech unavailable or failing: the written lesson is unaffected.
        if (onEnd) readingTimer.current = setTimeout(finish, estimateReadingMs(text))
      }
    },
    [supported, muted, rate, cancel]
  )

  const pause = useCallback(() => {
    try {
      if (supported && window.speechSynthesis.speaking) window.speechSynthesis.pause()
    } catch {}
  }, [supported])

  const resume = useCallback(() => {
    try {
      if (supported && window.speechSynthesis.paused) window.speechSynthesis.resume()
    } catch {}
  }, [supported])

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev
      if (next) cancel()
      try {
        localStorage.setItem(MUTE_STORAGE_KEY, next ? '1' : '0')
      } catch {
        // Private-mode/blocked storage — preference just won't persist.
      }
      return next
    })
  }, [cancel])

  // Genuine push-to-talk: a recognizer is created and started only while the Mic control is physically held, never
  // on a timer/auto-start. Guards against a double-start via the `listening` check. A refused permission or a
  // recognition error never blocks the lesson: it only produces a short notice.
  const startPushToTalk = useCallback(
    (onResult: (command: VoiceCommand | null) => void) => {
      if (!micSupported || listening) return
      const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition
      if (!Ctor) return
      setMicNotice('')
      try {
        const recognition = new Ctor()
        recognition.continuous = false
        recognition.interimResults = false
        recognition.lang = 'en-US'
        recognition.onresult = (event) => {
          const transcript = event.results[0]?.[0]?.transcript ?? ''
          onResult(parseVoiceCommand(transcript))
        }
        recognition.onerror = (event) => {
          setListening(false)
          const code = event?.error
          if (code === 'not-allowed' || code === 'service-not-allowed') setMicNotice('The microphone is blocked. You can allow it in your browser settings, or just use the buttons.')
          else if (code === 'audio-capture') setMicNotice('No microphone was found. You can use the buttons instead.')
          else if (code === 'no-speech' || code === 'aborted') setMicNotice('')
          else setMicNotice('Voice input is not working right now. You can use the buttons instead.')
        }
        recognition.onend = () => setListening(false)
        recognitionRef.current = recognition
        setListening(true)
        recognition.start()
      } catch {
        setListening(false)
        setMicNotice('Voice input is not available right now. You can use the buttons instead.')
      }
    },
    [micSupported, listening]
  )

  const stopPushToTalk = useCallback(() => {
    try {
      recognitionRef.current?.stop()
    } catch {}
    recognitionRef.current = null
  }, [])

  // Takes effect on the next utterance, not the one already playing.
  const setSpeechRate = useCallback((next: SpeechRate) => {
    setRate(next)
    try {
      localStorage.setItem(RATE_STORAGE_KEY, next)
    } catch {
      // Private-mode/blocked storage — preference just won't persist.
    }
  }, [])

  // Leaving the lesson (unmount), or the tab being hidden/unloaded, stops speech and drops pending callbacks.
  useEffect(() => {
    const stop = () => cancel()
    window.addEventListener('pagehide', stop)
    return () => {
      window.removeEventListener('pagehide', stop)
      cancel()
      try {
        recognitionRef.current?.stop()
      } catch {}
    }
  }, [cancel])

  return {
    supported,
    micSupported,
    muted,
    rate,
    listening,
    speaking,
    micNotice,
    speak,
    cancel,
    pause,
    resume,
    toggleMute,
    setSpeechRate,
    startPushToTalk,
    stopPushToTalk,
  }
}
