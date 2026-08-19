import type { ComponentPropsWithoutRef, WheelEventHandler } from 'react'

import { cn } from '@/shared/utils/cn'

export interface InputProps extends ComponentPropsWithoutRef<'input'> {
  /** Convenience alias for `aria-invalid` — also drives the error styling. */
  invalid?: boolean
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
  onWheel,
  ...props
}: InputProps) {
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
