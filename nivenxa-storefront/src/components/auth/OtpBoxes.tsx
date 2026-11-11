'use client'
import { useRef, useEffect } from 'react'
import styles from './OtpBoxes.module.scss'

interface Props {
  value: string
  length?: number
  onChange: (val: string) => void
  disabled?: boolean
  invalid?: boolean
  labelledBy?: string
  describedBy?: string
  /** A theme class that sets the --otp-* colour/font variables (Chess and Living each pass their own). */
  className?: string
}

/**
 * Six-box segmented code entry. Typing a digit moves to the next box; Backspace clears and steps back; arrow keys move
 * between boxes. A whole code arriving at once — pasted, or filled in by the phone/browser's one-time-code autofill,
 * which writes the full value into the first box — is spread across every box. The parent verifies as soon as the sixth
 * digit is present, so there is no submit button.
 */
export default function OtpBoxes({ value, length = 6, onChange, disabled, invalid, labelledBy, describedBy, className }: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    refs.current[0]?.focus()
  }, [])

  // After a failed check the boxes are re-enabled: put the cursor back so the code can be corrected straight away.
  const wasDisabled = useRef(false)
  useEffect(() => {
    if (wasDisabled.current && !disabled) refs.current[Math.min(value.length, length - 1)]?.focus()
    wasDisabled.current = Boolean(disabled)
  }, [disabled, value.length, length])

  function handleChange(index: number, raw: string) {
    const digits = raw.replace(/\D/g, '')
    if (digits.length > 1) {
      // autofill / multi-character input: treat as the whole code
      const full = digits.slice(0, length)
      onChange(full)
      refs.current[Math.min(full.length, length - 1)]?.focus()
      return
    }
    const chars = value.padEnd(length, ' ').split('')
    chars[index] = digits || ' '
    onChange(chars.join('').replace(/ +$/, '').slice(0, length))
    if (digits && index < length - 1) refs.current[index + 1]?.focus()
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const chars = value.padEnd(length, ' ').split('')
      if (chars[index].trim()) {
        chars[index] = ' '
        onChange(chars.join('').replace(/ +$/, ''))
      } else if (index > 0) {
        chars[index - 1] = ' '
        onChange(chars.join('').replace(/ +$/, ''))
        refs.current[index - 1]?.focus()
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault()
      refs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault()
      refs.current[index + 1]?.focus()
    } else if (e.key === 'Home') {
      refs.current[0]?.focus()
    } else if (e.key === 'End') {
      refs.current[length - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    onChange(digits)
    refs.current[Math.min(digits.length, length - 1)]?.focus()
  }

  return (
    <div className={`${styles.wrap} ${className ?? ''}`} role="group" aria-labelledby={labelledBy} aria-label={labelledBy ? undefined : 'One-time code'}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          type="text"
          inputMode="numeric"
          // Every box accepts the whole code (autofill writes all six digits into the focused box); typing is still one digit.
          maxLength={length}
          className={styles.cell}
          value={value[i]?.trim() ?? ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          readOnly={disabled} // read-only, not disabled: keeps keyboard focus while a check runs
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${i + 1} of ${length}`}
          aria-invalid={invalid ? true : undefined}
          aria-describedby={describedBy}
        />
      ))}
    </div>
  )
}
