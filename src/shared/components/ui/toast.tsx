import { IconCheck, IconX } from '@tabler/icons-react'
import { useEffect, useRef, type ReactNode } from 'react'

import { Alert } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'
import type { Tone } from '@/shared/components/ui/tone'

export interface ToastProps {
  tone?: Tone
  title: string
  children?: ReactNode
  onDismiss: () => void
  /** Milliseconds before auto-dismiss. `null` disables auto-dismiss entirely (manual dismiss only). */
  autoDismissMs?: number | null
}

const DEFAULT_AUTO_DISMISS_MS = 4500

/**
 * Viewport-fixed, self-contained transient feedback for a successful
 * mutation — NOT a notification system. No queue, no global/Zustand
 * state, no context provider: the caller owns showing/hiding exactly one
 * of these at a time via its own local state, the same way it already
 * owns any other transient UI state in this codebase.
 *
 * Fixed at `top-20` (clears `Topbar`'s real `h-16` height, per its own
 * component, plus the same 16px/`p-4` spacing rhythm `Alert`/`Card`
 * already use elsewhere) and anchored to the viewport, not to `AppShellMain`
 * (the actual scrolling container — see that component's own
 * `overflow-y-auto`) — this is what keeps the toast visible regardless of
 * how far the page is scrolled. `z-50` reuses this codebase's one existing
 * fixed-overlay precedent (`MobileNavDrawer`'s backdrop+panel), not an
 * invented value.
 *
 * Composes the existing `Alert` for tone/icon/title/copy conventions
 * (docs/branding/branding.pdf) rather than styling its own surface —
 * this component only adds fixed positioning, the auto-dismiss timer, and
 * the manual dismiss control (via `Alert`'s `action` slot). No shadow: the
 * branding guide documents no elevation system at all (see
 * `styles/globals.css`) — `Card` already made the same border-only choice
 * for the identical reason.
 *
 * The wrapper directly around `Alert` adds `bg-card` (the same opaque
 * surface token `Card` itself uses) — `Alert`'s own tone background
 * (`TONE_SOFT_CLASSES`, e.g. `bg-success/10`) is a deliberate 10%-alpha
 * tint, correct as-is for an INLINE alert sitting on the page's known flat
 * `--background`, but see-through enough that arbitrary page content
 * behind a floating, viewport-fixed toast visibly bled through it and hurt
 * readability. `bg-card` paints a guaranteed-opaque backdrop directly
 * behind that tint, which then composites the same soft-success look
 * `Alert` already has everywhere else — no change to `Alert`/`tone.ts`
 * themselves, so every other (inline, non-floating) `Alert` usage is
 * unaffected.
 */
export function Toast({
  tone = 'success',
  title,
  children,
  onDismiss,
  autoDismissMs = DEFAULT_AUTO_DISMISS_MS,
}: ToastProps) {
  // A ref, not a `useEffect` dependency, so a caller passing a fresh
  // `onDismiss` closure on every render (the common case — it usually
  // closes over local `useState` setters) never resets the auto-dismiss
  // timer. Synced in its own effect (never written during render — refs
  // are only safe to read/write outside render, e.g. here or in a handler).
  const onDismissRef = useRef(onDismiss)
  useEffect(() => {
    onDismissRef.current = onDismiss
  })

  useEffect(() => {
    if (!autoDismissMs) {
      return
    }
    const timer = window.setTimeout(() => {
      onDismissRef.current()
    }, autoDismissMs)
    return () => {
      window.clearTimeout(timer)
    }
  }, [autoDismissMs])

  return (
    <div className="fixed inset-x-4 top-20 z-50 sm:inset-x-auto sm:right-4 sm:left-auto sm:w-96">
      <div className="bg-card rounded-lg animate-in fade-in slide-in-from-top-2 duration-200 motion-reduce:animate-none">
        <Alert
          tone={tone}
          icon={tone === 'success' ? <IconCheck aria-hidden="true" /> : undefined}
          title={title}
          action={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="-m-2 size-8"
              aria-label="Cerrar notificación"
              onClick={onDismiss}
            >
              <IconX aria-hidden="true" className="size-4" />
            </Button>
          }
        >
          {children}
        </Alert>
      </div>
    </div>
  )
}
