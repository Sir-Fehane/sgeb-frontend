import type { ComponentPropsWithoutRef } from 'react'

import { cn } from '@/shared/utils/cn'

export interface SpinnerProps extends ComponentPropsWithoutRef<'span'> {
  size?: 'sm' | 'md' | 'lg'
  /** Accessible label announced to assistive technology (visually hidden). */
  label?: string
}

const SIZE_CLASSES: Record<NonNullable<SpinnerProps['size']>, string> = {
  sm: 'size-4 border-2',
  md: 'size-5 border-2',
  lg: 'size-8 border-[3px]',
}

/**
 * Loading indicator. Color inherits from the surrounding text color
 * (`border-current`) so it reads correctly on any background — e.g. white
 * inside a solid `primary` Button, or `text-muted-foreground` standalone.
 * Respects `prefers-reduced-motion`.
 */
export function Spinner({
  size = 'md',
  label = 'Cargando',
  className,
  ...props
}: SpinnerProps) {
  return (
    <span
      role="status"
      className={cn('inline-flex items-center justify-center', className)}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          'animate-spin rounded-full border-current border-t-transparent motion-reduce:animate-none',
          SIZE_CLASSES[size],
        )}
      />
      <span className="sr-only">{label}</span>
    </span>
  )
}
