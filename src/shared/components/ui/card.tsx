import type { ComponentPropsWithoutRef } from 'react'

import { CardHeading } from '@/shared/components/ui/typography'
import { cn } from '@/shared/utils/cn'

/**
 * No shadow: branding documents no elevation system (see globals.css),
 * so the card is separated from its surroundings by a border only.
 */
export function Card({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      className={cn(
        'bg-card text-card-foreground border-border rounded-lg border',
        className,
      )}
      {...props}
    />
  )
}

/** Padding is 24px (`p-6`) per branding's documented card padding value. */
export function CardHeader({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div className={cn('flex flex-col gap-1.5 p-6', className)} {...props} />
}

export function CardTitle({ className, ...props }: ComponentPropsWithoutRef<'h3'>) {
  return <CardHeading className={className} {...props} />
}

export function CardDescription({ className, ...props }: ComponentPropsWithoutRef<'p'>) {
  return (
    <p
      className={cn('font-sans text-body-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

export function CardContent({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div className={cn('p-6 pt-0', className)} {...props} />
}

export function CardFooter({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div className={cn('flex items-center p-6 pt-0', className)} {...props} />
}
