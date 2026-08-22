import { IconX } from '@tabler/icons-react'
import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

import { BrandLogo } from '@/shared/components/layout/BrandLogo'
import { SidebarNavList } from '@/shared/components/layout/SidebarNavList'
import { cn } from '@/shared/utils/cn'

export interface MobileNavDrawerProps {
  open: boolean
  onClose: () => void
}

/**
 * Small/tablet-width navigation drawer (`lg:hidden` — the persistent
 * `Sidebar` takes over above that breakpoint). Keyboard containment
 * relies on the platform `inert` attribute applied to the rest of the
 * app by `AppShell` while this is open, rather than a hand-rolled
 * Tab-key focus trap.
 */
export function MobileNavDrawer({ open, onClose }: MobileNavDrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)
  const location = useLocation()
  const previousPathnameRef = useRef(location.pathname)

  useEffect(() => {
    if (!open) {
      return
    }

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null
    closeButtonRef.current?.focus()

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocusedRef.current?.focus()
    }
  }, [open, onClose])

  /**
   * Safety net beyond `SidebarNavList`'s `onNavigate` (which already
   * closes the drawer synchronously on click): if the route changes
   * while the drawer is open through any other means — browser back/
   * forward, or future programmatic navigation — close it too, rather
   * than leaving a stale open drawer over a different page.
   */
  useEffect(() => {
    if (open && previousPathnameRef.current !== location.pathname) {
      onClose()
    }
    previousPathnameRef.current = location.pathname
  }, [location.pathname, open, onClose])

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="bg-foreground/40 absolute inset-0"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
        className="bg-card absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col shadow-lg"
      >
        <div className="border-border flex h-16 shrink-0 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <BrandLogo className="size-7" />
            <span className="font-heading text-body text-foreground font-semibold">
              SGEB
            </span>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar navegación"
            className={cn(
              'text-foreground flex size-10 items-center justify-center rounded-lg',
              'hover:bg-accent',
              'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
            )}
          >
            <IconX aria-hidden="true" className="size-5" />
          </button>
        </div>
        <nav
          aria-label="Navegación principal"
          className="flex-1 overflow-y-auto px-3 py-4"
        >
          <SidebarNavList onNavigate={onClose} />
        </nav>
      </div>
    </div>
  )
}
