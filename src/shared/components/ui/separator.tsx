import * as SeparatorPrimitive from '@radix-ui/react-separator'
import type { ComponentPropsWithoutRef } from 'react'

import { cn } from '@/shared/utils/cn'

export type SeparatorProps = ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>

export function Separator({
  className,
  orientation = 'horizontal',
  decorative = true,
  ...props
}: SeparatorProps) {
  return (
    <SeparatorPrimitive.Root
      orientation={orientation}
      decorative={decorative}
      className={cn(
        'bg-border shrink-0',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
      {...props}
    />
  )
}
