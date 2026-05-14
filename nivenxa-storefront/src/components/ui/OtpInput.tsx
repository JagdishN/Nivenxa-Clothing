'use client'
import { useRef, useEffect } from 'react'
import styles from './OtpInput.module.scss'

interface Props {
  value:    string
  length?:  number
  onChange: (val: string) => void
}

export default function OtpInput({ value, length = 6, onChange }: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([])

  // Auto-focus first cell on mount
  useEffect(() => {
    refs.current[0]?.focus()
  }, [])

  function handleChange(index: number, raw: string) {
    const digit = raw.replace(/\D/g, '').slice(-1)
    const chars  = value.padEnd(length, '').split('')
    chars[index] = digit
    onChange(chars.join('').slice(0, length))
    if (digit && index < length - 1) {
      refs.current[index + 1]?.focus()
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const chars = value.padEnd(length, '').split('')
      if (chars[index]) {
        chars[index] = ''
        onChange(chars.join(''))
      } else if (index > 0) {
        chars[index - 1] = ''
        onChange(chars.join(''))
        refs.current[index - 1]?.focus()
      }
    } else if (e.key === 'ArrowLeft'  && index > 0)          refs.current[index - 1]?.focus()
    else if   (e.key === 'ArrowRight' && index < length - 1) refs.current[index + 1]?.focus()
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    onChange(digits.padEnd(length, '').slice(0, length))
    const focusAt = Math.min(digits.length, length - 1)
    refs.current[focusAt]?.focus()
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    e.target.select()
  }

  return (
    <div className={styles.wrap} role="group" aria-label="One-time password">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          className={styles.cell}
          value={value[i] ?? ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={handleFocus}
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  )
}
