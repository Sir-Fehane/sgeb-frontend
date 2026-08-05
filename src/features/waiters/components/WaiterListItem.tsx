import type { ReactNode } from 'react'

import { WaiterStatusBadge } from '@/features/waiters/components/WaiterStatusBadge'
import type { WaiterListItemViewModel } from '@/features/waiters/types/waiter'
import { Caption } from '@/shared/components'
import { cn } from '@/shared/utils/cn'

export interface WaiterListItemProps {
  waiter: WaiterListItemViewModel
  /**
   * Opaque waiter id — never parsed/validated here, just forwarded.
   * When omitted, the item renders as a non-interactive semantic item
   * (no button, no role) — there is no approved waiter-detail route or
   * documented selection action yet, so the routed `/meseros` page
   * intentionally does not supply this.
   */
  onSelect?: ((id: string) => void) | undefined
}

const BASE_CLASSES = cn(
  'border-border bg-card flex w-full flex-col gap-2 rounded-lg border p-4 text-left',
  'md:grid md:grid-cols-[1.5fr_1.5fr_1fr_auto] md:items-center md:gap-4',
)

const INTERACTIVE_CLASSES = cn(
  'hover:bg-accent',
  'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
)

/**
 * A single waiter. Renders as exactly one focusable `<button>` when
 * `onSelect` is supplied, or as a plain non-interactive `<li>` (never a
 * clickable div) when it isn't — layout stays visually identical
 * between both modes (`BASE_CLASSES` is shared; only the
 * interaction-specific hover/focus styling and the element type
 * differ). Either way, this is the one node per waiter — no parallel
 * static+interactive DOM representations, so there's never a duplicate
 * accessible name. `id` is never rendered as visible text.
 */
export function WaiterListItem({ waiter, onSelect }: WaiterListItemProps) {
  const fields: ReactNode = (
    <>
      <span className="font-sans text-body-sm font-semibold">
        {waiter.nombreCompleto}
      </span>

      <span className="flex flex-col">
        <Caption>Correo</Caption>
        <span className="font-sans text-body-sm">{waiter.correo}</span>
      </span>

      <span className="flex flex-col">
        <Caption>Teléfono</Caption>
        <span className="font-sans text-body-sm">
          {waiter.telefono ?? 'No registrado'}
        </span>
      </span>

      <span>
        <WaiterStatusBadge estadoCuenta={waiter.estadoCuenta} />
      </span>
    </>
  )

  if (!onSelect) {
    return <li className={BASE_CLASSES}>{fields}</li>
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => {
          onSelect(waiter.id)
        }}
        className={cn(BASE_CLASSES, INTERACTIVE_CLASSES)}
      >
        {fields}
      </button>
    </li>
  )
}
