import { Link } from 'react-router-dom'

import { EventStatusBadge } from '@/features/events/components/EventStatusBadge'
import type { EventListItemViewModel } from '@/features/events/types/event'
import { Badge, Caption } from '@/shared/components'
import { cn } from '@/shared/utils/cn'

export interface EventListItemProps {
  evento: EventListItemViewModel
}

const TIPO_LABELS: Record<EventListItemViewModel['tipo'], string> = {
  social: 'Social',
  empresarial: 'Empresarial',
}

/**
 * A single event. The main card surface and the smaller "Ver detalle"
 * link are deliberate **siblings**, both real `<Link>`s to the same
 * `/eventos/{id}` route — never nested, since an `<a>` inside another
 * `<a>` is both invalid HTML and an accessibility violation (two
 * interactive elements reporting as one). This card previously showed a
 * stale "detail not available" notice on its main click target while
 * "Ver detalle" already navigated for real; both now do the same real
 * navigation, using semantic `<Link>`s rather than an imperative
 * `onClick` handler, so keyboard/link semantics (Enter/Space activation,
 * "open in new tab", screen-reader link role) come from the browser for
 * free instead of being reimplemented.
 */
export function EventListItem({ evento }: EventListItemProps) {
  const href = `/eventos/${String(evento.idEvento)}`

  return (
    <li className="flex flex-col gap-2 md:flex-row md:items-stretch">
      <Link
        to={href}
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
      </Link>

      <Link
        to={href}
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
