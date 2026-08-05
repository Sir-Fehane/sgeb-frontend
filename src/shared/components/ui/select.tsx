import type { ComponentPropsWithoutRef } from 'react'

import { cn } from '@/shared/utils/cn'

export interface SelectProps extends ComponentPropsWithoutRef<'select'> {
  /** Convenience alias for `aria-invalid` — also drives the error styling. */
  invalid?: boolean
}

/**
 * A plain native `<select>` styled to match `Input` — no
 * `@radix-ui/react-select` dependency has been added since a native
 * element already satisfies every requirement here (keyboard operation,
 * accessible name via `FormField`, options list) without a new package.
 */
export function Select({ className, invalid = false, children, ...props }: SelectProps) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={cn(
        'border-input bg-background text-foreground flex h-10 w-full rounded-lg border px-3 py-2',
        'font-sans text-body-sm',
        'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}
