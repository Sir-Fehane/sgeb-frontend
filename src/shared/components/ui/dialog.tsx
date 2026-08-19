import { IconX } from '@tabler/icons-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { CardHeading } from '@/shared/components/ui/typography'
import { cn } from '@/shared/utils/cn'

export interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  /** Extra classes on the dialog surface, e.g. a wider `sm:max-w-*` for a form with a map. */
  className?: string
}

/**
 * Centered, focus-managed overlay dialog — portaled to `document.body` so
 * it behaves correctly no matter where in the tree it's mounted (unlike
 * `MobileNavDrawer`, which is only ever mounted once at the `AppShell`
 * root). Deliberately reuses the exact same containment strategy already
 * established there instead of a third dialog library or a hand-rolled
 * Tab-key focus trap: the platform `inert` attribute on every other
 * `document.body` child while open. `AppShell` can apply `inert` directly
 * via JSX because the drawer is a sibling of the subtree it inerts; a
 * `Dialog` usable from anywhere in the tree can't rely on a parent for
 * that, so it inerts imperatively here instead.
 *
 * No global state: `open`/`onClose` are owned entirely by the caller,
 * same as `MobileNavDrawer`.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: DialogProps) {
  const titleId = useId()
  const descriptionId = useId()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)
  const [portalNode] = useState(() => document.createElement('div'))

  useEffect(() => {
    if (!open) {
      return
    }

    document.body.appendChild(portalNode)
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null
    closeButtonRef.current?.focus()

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const siblings = Array.from(document.body.children).filter(
      (element) => element !== portalNode,
    )
    for (const element of siblings) {
      element.setAttribute('inert', '')
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      document.removeEventListener('keydown', handleKeyDown)
      for (const element of siblings) {
        element.removeAttribute('inert')
      }
      document.body.removeChild(portalNode)
      previouslyFocusedRef.current?.focus()
    }
  }, [open, onClose, portalNode])

  if (!open) {
    return null
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-stretch justify-center sm:items-center sm:p-4">
      <div
        data-testid="dialog-backdrop"
        className="bg-foreground/40 absolute inset-0"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          'bg-card border-border relative flex w-full flex-col overflow-hidden border shadow-lg',
          'sm:max-h-[90vh] sm:max-w-lg sm:rounded-xl',
          className,
        )}
      >
        <div className="border-border flex shrink-0 items-start justify-between gap-2 border-b p-4">
          <div className="flex flex-col gap-1">
            <CardHeading id={titleId}>{title}</CardHeading>
            {description ? (
              <p
                id={descriptionId}
                className="text-muted-foreground font-sans text-body-sm"
              >
                {description}
              </p>
            ) : null}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className={cn(
              'text-foreground flex size-9 shrink-0 items-center justify-center rounded-lg',
              'hover:bg-accent',
              'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
            )}
          >
            <IconX aria-hidden="true" className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>,
    portalNode,
  )
}
