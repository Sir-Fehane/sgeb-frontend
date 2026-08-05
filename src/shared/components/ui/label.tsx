import * as LabelPrimitive from '@radix-ui/react-label'
import type { ComponentPropsWithoutRef } from 'react'

import { cn } from '@/shared/utils/cn'

export type LabelProps = ComponentPropsWithoutRef<typeof LabelPrimitive.Root>

export function Label({ className, ...props }: LabelProps) {
  return (
    <LabelPrimitive.Root
      className={cn(
        'font-sans text-label text-foreground font-medium leading-none',
        'peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className,
      )}
      {...props}
    />
  )
}
