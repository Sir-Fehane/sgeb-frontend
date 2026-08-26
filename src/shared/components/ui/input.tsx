import type {
  ChangeEventHandler,
  ComponentPropsWithoutRef,
  WheelEventHandler,
} from 'react'

import {
  sanitizeDecimalInputValue,
  sanitizeIntegerInputValue,
} from '@/shared/utils/numericInput'
import { cn } from '@/shared/utils/cn'

export interface InputProps extends ComponentPropsWithoutRef<'input'> {
  /** Convenience alias for `aria-invalid` — also drives the error styling. */
  invalid?: boolean
  /**
   * Opt-in numeric hardening for `type="number"` fields. Native
   * `type="number"` inputs accept `1e3`/`+10`/`-10` as spec-valid values —
   * technically legal HTML, never a valid SGEB business input (no confirmed
   * SGEB numeric field uses scientific notation, and only a signed
   * measurement like `latitud`/`longitud` accepts a minus sign). Runs on
   * every value-changing DOM event — typing, paste, and autofill alike —
   * not just keystrokes, since a keydown-only guard cannot see paste/
   * autofill at all. `'decimal'` allows one plain decimal separator, never
   * a sign; pass `allowNegative` alongside it for the one field family that
   * needs a leading `-`. This is UX hardening only — the field's own Zod
   * schema (range, integer-ness, decimal precision) remains the
   * authoritative check at submit time, completely untouched by this prop.
   */
  numeric?: 'integer' | 'decimal'
  /** Only meaningful together with `numeric="decimal"` — see `numeric`'s own comment. */
  allowNegative?: boolean
}

/**
 * Blurs a `type="number"` input the instant the page is scrolled while it
 * still has focus — Chrome/Firefox/Safari all silently step a FOCUSED
 * number input's value on wheel scroll, which is almost never what a user
 * scrolling the page past the field intends (the confirmed real-world
 * incident: a `tarifaPorMesero` of 200 persisted as 199.88 after the
 * field was scrolled past while still focused). Blurring — rather than
 * `event.preventDefault()` — is deliberate: React registers `onWheel` as a
 * passive listener, so `preventDefault` would silently no-op there anyway;
 * blurring needs no such permission, still lets the page keep scrolling
 * normally (never blocked), and removes focus before the browser's native
 * step behavior would otherwise apply on that same scroll tick. Typing and
 * keyboard step (arrow keys) while focused are completely unaffected —
 * only a wheel event triggers this.
 */
const blurNumberInputOnWheel: WheelEventHandler<HTMLInputElement> = (event) => {
  event.currentTarget.blur()
}

export function Input({
  className,
  invalid = false,
  type,
  numeric,
  allowNegative = false,
  onWheel,
  onChange,
  ...props
}: InputProps) {
  const handleChange: ChangeEventHandler<HTMLInputElement> | undefined = numeric
    ? (event) => {
        const sanitized =
          numeric === 'integer'
            ? sanitizeIntegerInputValue(event.target.value)
            : sanitizeDecimalInputValue(event.target.value, { allowNegative })
        if (sanitized !== event.target.value) {
          event.target.value = sanitized
        }
        onChange?.(event)
      }
    : onChange

  return (
    <input
      type={type}
      aria-invalid={invalid || undefined}
      onWheel={
        type === 'number'
          ? (event) => {
              blurNumberInputOnWheel(event)
              onWheel?.(event)
            }
          : onWheel
      }
      onChange={handleChange}
      className={cn(
        'border-input bg-background text-foreground flex h-10 w-full rounded-lg border px-3 py-2',
        'font-sans text-body-sm',
        'placeholder:text-muted-foreground',
        'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive',
        className,
      )}
      {...props}
    />
  )
}
