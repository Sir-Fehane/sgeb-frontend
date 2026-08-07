import { Link } from 'react-router-dom'

import { EventStatusBadge } from '@/features/events/components/EventStatusBadge'
import type { EventListItemViewModel } from '@/features/events/types/event'
import { Badge, Caption } from '@/shared/components'
import { cn } from '@/shared/utils/cn'

export interface EventListItemProps {
  evento: EventListItemViewModel
  /** Opaque event id — never parsed/validated here, just forwarded. */
  onSelect?: ((id: string) => void) | undefined
}

const TIPO_LABELS: Record<EventListItemViewModel['tipo'], string> = {
  social: 'Social',
  empresarial: 'Empresarial',
}

/**
 * A single event. The existing `onSelect` control (a full-width
 * `<button>`) and the newer "Ver detalle" link
 * (`/eventos/:id` — `feature/event-detail-ui-foundation`) are deliberate
 * **siblings**, never nested: a `<Link>`/`<a>` inside a `<button>` is
 * both invalid HTML and an accessibility violation (two interactive
 * elements reporting as one). The button keeps its full original
 * content/behavior unchanged (date/salón/capitán/status all still live
 * in its accessible name); "Ver detalle" is a small, independently
 * focusable, distinctly labeled action alongside it.
 */
export function EventListItem({ evento, onSelect }: EventListItemProps) {
  return (
    <li className="flex flex-col gap-2 md:flex-row md:items-stretch">
      <button
        type="button"
        onClick={() => {
          onSelect?.(String(evento.idEvento))
        }}
        className={cn(
          'border-border bg-card hover:bg-accent flex w-full flex-1 flex-col gap-2 rounded-lg border p-4 text-left',
          'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
          'md:grid md:grid-cols-[1.5fr_1fr_1fr_1fr_auto] md:items-center md:gap-4',
        )}
      >
        <span className="sr-only">Ver detalles de </span>

        <span className="font-sans text-body-sm font-semibold">{evento.titulo}</span>

        <span className="flex flex-col">
          <Caption>Fecha</Caption>
          <span className="font-sans text-body-sm">
            {evento.fecha} · {evento.horaPresentacion}
          </span>
        </span>

        <span className="flex flex-col">
          <Caption>Salón</Caption>
          <span className="font-sans text-body-sm">
            {evento.salonNombre ?? 'Información pendiente de integración'}
          </span>
        </span>

        <span className="flex flex-col">
          <Caption>Capitán</Caption>
          <span className="font-sans text-body-sm">
            {evento.capitanNombre ?? 'Información pendiente de integración'}
          </span>
        </span>

        <span className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{TIPO_LABELS[evento.tipo]}</Badge>
          <EventStatusBadge estado={evento.estado} />
        </span>
      </button>

      <Link
        to={`/eventos/${String(evento.idEvento)}`}
        aria-label={`Ver detalle de ${evento.titulo}`}
        className={cn(
          'border-border bg-card hover:bg-accent flex shrink-0 items-center justify-center rounded-lg border px-4 py-2',
          'font-sans text-body-sm text-foreground font-medium',
          'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
        )}
      >
        Ver detalle
      </Link>
    </li>
  )
}
