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
 * A single event, rendered as exactly one focusable control (a
 * full-width `<button>`) so the responsive card/row presentation never
 * duplicates an interactive accessible name — only the internal layout
 * (stacked vs. grid columns) changes at the `md:` breakpoint, via CSS on
 * this one node, not two parallel DOM representations. Field content is
 * left in the normal accessible-name/content flow (not `aria-hidden`)
 * so a screen-reader user hears the date/salón/capitán/status, not just
 * a generic "view details" label.
 */
export function EventListItem({ evento, onSelect }: EventListItemProps) {
  return (
    <li>
      <button
        type="button"
        onClick={() => {
          onSelect?.(String(evento.idEvento))
        }}
        className={cn(
          'border-border bg-card hover:bg-accent flex w-full flex-col gap-2 rounded-lg border p-4 text-left',
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
    </li>
  )
}
