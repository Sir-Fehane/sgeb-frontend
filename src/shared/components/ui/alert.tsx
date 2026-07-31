import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { TONE_SOFT_CLASSES, type Tone } from '@/shared/components/ui/tone'
import { cn } from '@/shared/utils/cn'

export interface AlertProps extends Omit<ComponentPropsWithoutRef<'div'>, 'title'> {
  tone?: Tone
  /** Decorative icon reinforcing the tone — the title/text always carries the meaning. */
  icon?: ReactNode
  title?: ReactNode
  /**
   * Force an assertive (`role="alert"`, implicit `aria-live="assertive"`)
   * announcement even though this tone defaults to polite. Use only for a
   * warning that is genuinely urgent and needs to interrupt — most
   * warnings should stay polite. `danger` is always assertive regardless
   * of this prop.
   */
  assertive?: boolean
}

export function Alert({
  tone = 'neutral',
  icon,
  title,
  assertive = false,
  className,
  children,
  ...props
}: AlertProps) {
  /**
   * Conservative default: only `danger` interrupts the user
   * (`role="alert"`). Every other tone, including `warning`, is polite
   * (`role="status"`) unless the caller explicitly opts in via
   * `assertive` for a genuinely urgent case.
   */
  const isAssertive = tone === 'danger' || assertive

  return (
    <div
      role={isAssertive ? 'alert' : 'status'}
      className={cn(
        'flex gap-3 rounded-lg border p-4',
        'font-sans text-body-sm text-foreground',
        TONE_SOFT_CLASSES[tone],
        className,
      )}
      {...props}
    >
      {icon ? (
        <span aria-hidden="true" className="mt-0.5 shrink-0 [&_svg]:size-5">
          {icon}
        </span>
      ) : null}
      <div className="flex flex-col gap-1">
        {title ? <p className="font-medium">{title}</p> : null}
        {children}
      </div>
    </div>
  )
}
