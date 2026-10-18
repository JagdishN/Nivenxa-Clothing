'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Shared by BoardLesson.tsx and PieceLesson.tsx — all Web Speech API
 * plumbing (TTS + push-to-talk STT + command parsing) lives here once,
 * same reason feedbackCopy.ts is shared rather than duplicated per engine.
 * No cloud/paid provider — browser-native speechSynthesis/SpeechRecognition
 * only, per the user's own explicit choice.
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
  onerror: (() => void) | null
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
  // True while an utterance is actually sounding — lets a demo step hold
  // its Next button until narration for that step has finished, instead of
  // Next sitting there the whole time speech is still playing.
  const [speaking, setSpeaking] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  // Deliberately an effect, not a lazy useState initializer: these values
  // are only knowable client-side (window/localStorage don't exist during
  // SSR), so starting at `false` and flipping after mount is what keeps the
  // very first client render matching the server-rendered markup — a lazy
  // initializer would read the real values on that first render too and
  // trip a hydration mismatch the instant any browser actually supports
  // speech. This is the one setState-in-effect in this file that isn't
  // avoidable by restructuring; see the project's established precedent of
  // only "fixing" this lint rule where a clean non-effect alternative
  // genuinely exists.
  useEffect(() => {
    setSupported(typeof window !== 'undefined' && 'speechSynthesis' in window)
    setMicSupported(typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition))
    try {
      setMuted(localStorage.getItem(MUTE_STORAGE_KEY) === '1')
      const storedRate = localStorage.getItem(RATE_STORAGE_KEY)
      if (storedRate === 'slow' || storedRate === 'normal') setRate(storedRate)
    } catch {
      // Private-mode/blocked storage — defaults stay as declared above.
    }
  }, [])

  const cancel = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [])

  // Cancels whatever's mid-utterance first — satisfies "stop previous
  // speech when changing lessons or replaying" by construction, since every
  // path to new speech (Replay, Hint, Show Me, the step-entry auto-speak, a
  // spoken command) goes through this one function.
  const speak = useCallback(
    (text: string) => {
      if (!supported || muted || !text) return
      window.speechSynthesis.cancel()
      // Visible step copy uses a lightweight **bold** convention (see
      // BoardLesson.tsx/PieceLesson.tsx's renderEmphasis) — now that
      // auto-speak reads that same text aloud by default, the literal
      // asterisks would otherwise be spoken too ("asterisk asterisk...").
      const utterance = new SpeechSynthesisUtterance(text.replace(/\*\*/g, ''))
      utterance.rate = RATE_VALUES[rate]
      utterance.onstart = () => setSpeaking(true)
      utterance.onend = () => setSpeaking(false)
      utterance.onerror = () => setSpeaking(false)
      window.speechSynthesis.speak(utterance)
    },
    [supported, muted, rate]
  )

  const pause = useCallback(() => {
    if (supported && window.speechSynthesis.speaking) window.speechSynthesis.pause()
  }, [supported])

  const resume = useCallback(() => {
    if (supported && window.speechSynthesis.paused) window.speechSynthesis.resume()
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

  // Genuine push-to-talk: a recognizer is created and started only while
  // the Mic control is physically held, never on a timer/auto-start. Guards
  // against a double-start (e.g. a touch device firing both touch and
  // synthetic mouse events) via the `listening` check.
  const startPushToTalk = useCallback(
    (onResult: (command: VoiceCommand | null) => void) => {
      if (!micSupported || listening) return
      const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition
      if (!Ctor) return
      const recognition = new Ctor()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-US'
      recognition.onresult = (event) => {
        const transcript = event.results[0]?.[0]?.transcript ?? ''
        onResult(parseVoiceCommand(transcript))
      }
      recognition.onerror = () => onResult(null)
      recognition.onend = () => setListening(false)
      recognitionRef.current = recognition
      setListening(true)
      recognition.start()
    },
    [micSupported, listening]
  )

  const stopPushToTalk = useCallback(() => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
  }, [])

  // Takes effect on the next utterance, not the one already playing — no
  // need to interrupt mid-sentence just because the learner switched pace.
  const setSpeechRate = useCallback((next: SpeechRate) => {
    setRate(next)
    try {
      localStorage.setItem(RATE_STORAGE_KEY, next)
    } catch {
      // Private-mode/blocked storage — preference just won't persist.
    }
  }, [])

  useEffect(() => () => cancel(), [cancel])

  return {
    supported,
    micSupported,
    muted,
    rate,
    listening,
    speaking,
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
