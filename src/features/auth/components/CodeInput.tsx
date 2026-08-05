import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react'

import { cn } from '@/shared/utils/cn'

const CODE_LENGTH = 6

export interface CodeInputProps {
  id: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  disabled?: boolean
  'aria-describedby'?: string | undefined
  'aria-invalid'?: true | undefined
}

/**
 * Six individual digit boxes bound to a single string value (S3's `otp`
 * pattern) — built for RHF's `Controller` rather than `register`, since
 * this is a composite widget with no single native `<input>`. Supports
 * digit-only entry, arrow-key/backspace navigation between boxes, and
 * pasting the full 6-digit code at once.
 */
export function CodeInput({
  id,
  value,
  onChange,
  onBlur,
  disabled = false,
  ...aria
}: CodeInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])
  const digits = Array.from({ length: CODE_LENGTH }, (_, index) => value[index] ?? '')

  function setDigit(index: number, raw: string) {
    const digit = raw.replace(/\D/g, '').slice(-1)
    const next = digits.slice()
    next[index] = digit
    onChange(next.join(''))
    if (digit && index < CODE_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    } else if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault()
      inputsRef.current[index - 1]?.focus()
    } else if (event.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      event.preventDefault()
      inputsRef.current[index + 1]?.focus()
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, CODE_LENGTH)
    if (!pasted) {
      return
    }
    event.preventDefault()
    onChange(pasted)
    const focusIndex = Math.min(pasted.length, CODE_LENGTH - 1)
    inputsRef.current[focusIndex]?.focus()
  }

  return (
    <div
      role="group"
      aria-label="Código de verificación de 6 dígitos"
      className="flex justify-center gap-2"
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          id={index === 0 ? id : undefined}
          ref={(element) => {
            inputsRef.current[index] = element
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(event) => {
            setDigit(index, event.target.value)
          }}
          onKeyDown={(event) => {
            handleKeyDown(index, event)
          }}
          onPaste={handlePaste}
          onBlur={onBlur}
          aria-label={`Dígito ${String(index + 1)} de ${String(CODE_LENGTH)}`}
          {...aria}
          className={cn(
            'border-input bg-background text-foreground h-12 w-10 rounded-lg border text-center',
            'font-sans text-body font-semibold',
            'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
            'aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        />
      ))}
    </div>
  )
}
