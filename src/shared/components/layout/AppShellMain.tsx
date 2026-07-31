import type { ReactNode } from 'react'

import { cn } from '@/shared/utils/cn'

export interface AppShellMainProps {
  children: ReactNode
  className?: string
}

/** The `<main>` landmark and content container used by `AppShell`. */
export function AppShellMain({ children, className }: AppShellMainProps) {
  return (
    <main
      id="main-content"
      className={cn('flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8', className)}
    >
      {children}
    </main>
  )
}
