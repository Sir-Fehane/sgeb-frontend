import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { TONE_SOLID_CLASSES, type Tone } from '@/shared/components/ui/tone'
import { cn } from '@/shared/utils/cn'

export interface BadgeProps extends ComponentPropsWithoutRef<'span'> {
  tone?: Tone
  /**
   * Decorative leading icon (e.g. a Tabler icon). The badge's text is
   * always the source of truth for its meaning — per branding, tone is
   * never communicated by color alone.
   */
  icon?: ReactNode
}

export function Badge({
  tone = 'neutral',
  icon,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-3 py-1',
        'font-sans text-label font-medium',
        TONE_SOLID_CLASSES[tone],
        className,
      )}
      {...props}
    >
      {icon ? (
        <span aria-hidden="true" className="[&_svg]:size-3.5">
          {icon}
        </span>
      ) : null}
      {children}
    </span>
  )
}
