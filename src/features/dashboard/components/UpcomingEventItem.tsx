import type { ReactNode } from 'react'

import { DashboardEventStatusBadge } from '@/features/dashboard/components/DashboardEventStatusBadge'
import type { UpcomingEventViewModel } from '@/features/dashboard/types/dashboard'
import { Caption } from '@/shared/components'
import { cn } from '@/shared/utils/cn'

export interface UpcomingEventItemProps {
  event: UpcomingEventViewModel
  /**
   * Opaque event id — never parsed/validated here, just forwarded. When
   * omitted, the item renders as a non-interactive semantic item — no
   * event-detail route is approved yet (see `idEvento`'s comment in
   * types/dashboard.ts), so the routed page intentionally does not
   * supply this.
   */
  onSelect?: ((id: string) => void) | undefined
}

const BASE_CLASSES = cn(
  'border-border bg-card flex w-full flex-col gap-2 rounded-lg border p-4 text-left',
  'md:grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr] md:items-center md:gap-4',
)

const INTERACTIVE_CLASSES = cn(
  'hover:bg-accent',
  'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
)

/**
 * A single upcoming event. Renders as exactly one focusable `<button>`
 * when `onSelect` is supplied, or as a plain non-interactive `<li>`
 * (never a clickable div) when it isn't — mirrors `WaiterListItem`'s
 * shared-base-classes pattern. The exact `porcentaje_cobertura` value is
 * always the primary, accessible text — no decorative bar is required to
 * convey it.
 */
export function UpcomingEventItem({ event, onSelect }: UpcomingEventItemProps) {
  const fields: ReactNode = (
    <>
      <span className="flex flex-col gap-1">
        <span className="font-sans text-body-sm font-semibold">{event.titulo}</span>
        <Caption>
          {event.fecha} · {event.horaPresentacion} · {event.salon}
        </Caption>
      </span>

      <span>
        <DashboardEventStatusBadge estado={event.estado} />
      </span>

      <span className="flex flex-col">
        <Caption>Cupo</Caption>
        <span className="font-sans text-body-sm">{event.cupoMeseros}</span>
      </span>

      <span className="flex flex-col">
        <Caption>Confirmados</Caption>
        <span className="font-sans text-body-sm">{event.confirmados}</span>
      </span>

      <span className="flex flex-col">
        <Caption>Cobertura</Caption>
        <span className="font-sans text-body-sm">{event.porcentajeCobertura}%</span>
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
          onSelect(event.idEvento)
        }}
        className={cn(BASE_CLASSES, INTERACTIVE_CLASSES)}
      >
        {fields}
      </button>
    </li>
  )
}
