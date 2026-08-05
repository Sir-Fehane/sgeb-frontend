import { IconBell } from '@tabler/icons-react'
import type { ReactNode } from 'react'

import { AccountMenuPlaceholder } from '@/shared/components/layout/AccountMenuPlaceholder'
import { NavTrigger } from '@/shared/components/layout/NavTrigger'
import { cn } from '@/shared/utils/cn'

export interface TopbarProps {
  /**
   * The current page's primary heading. This IS the page's `<h1>` —
   * pages rendered inside `AppShell` should not render their own
   * top-level heading; use `SectionHeading` (h2) or lower internally.
   */
  title: string
  breadcrumb?: ReactNode
  onOpenNav: () => void
}

export function Topbar({ title, breadcrumb, onOpenNav }: TopbarProps) {
  return (
    <header className="border-border bg-background flex h-16 shrink-0 items-center gap-3 border-b px-4 sm:px-6">
      <NavTrigger onClick={onOpenNav} />

      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <h1 className="font-heading text-subheading text-foreground truncate font-semibold">
          {title}
        </h1>
        {breadcrumb ? (
          <div className="text-caption text-muted-foreground truncate">{breadcrumb}</div>
        ) : null}
      </div>

      <button
        type="button"
        disabled
        aria-label="Notificaciones — pendiente de implementar"
        title="Notificaciones (pendiente)"
        className={cn(
          'text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg',
          'disabled:cursor-not-allowed disabled:opacity-60',
        )}
      >
        <IconBell aria-hidden="true" className="size-5" />
      </button>

      <AccountMenuPlaceholder />
    </header>
  )
}
