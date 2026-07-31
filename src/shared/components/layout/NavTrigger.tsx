import { IconMenu2 } from '@tabler/icons-react'

import { cn } from '@/shared/utils/cn'

export interface NavTriggerProps {
  onClick: () => void
}

/** Hamburger button that opens `MobileNavDrawer`. Hidden at `lg:` and up, where the persistent `Sidebar` is visible instead. */
export function NavTrigger({ onClick }: NavTriggerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Abrir navegación"
      className={cn(
        'text-foreground flex size-11 shrink-0 items-center justify-center rounded-lg lg:hidden',
        'hover:bg-accent',
        'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
      )}
    >
      <IconMenu2 aria-hidden="true" className="size-5" />
    </button>
  )
}
