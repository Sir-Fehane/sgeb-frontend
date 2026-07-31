import type { ComponentPropsWithoutRef } from 'react'

import { cn } from '@/shared/utils/cn'

/**
 * Purely decorative loading placeholder — hidden from assistive
 * technology. If a screen containing skeletons needs to announce a
 * loading state, wrap the region in an element with `role="status"`
 * (see `Spinner`, or apply the pattern directly where the skeletons are
 * used).
 */
export function Skeleton({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={cn(
        'bg-muted animate-pulse rounded-lg motion-reduce:animate-none',
        className,
      )}
      {...props}
    />
  )
}
