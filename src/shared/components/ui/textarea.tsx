import type { ComponentPropsWithoutRef } from 'react'

import { cn } from '@/shared/utils/cn'

export interface TextareaProps extends ComponentPropsWithoutRef<'textarea'> {
  /** Convenience alias for `aria-invalid` — also drives the error styling. */
  invalid?: boolean
}

export function Textarea({ className, invalid = false, ...props }: TextareaProps) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cn(
        'border-input bg-background text-foreground flex min-h-24 w-full rounded-lg border px-3 py-2',
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
