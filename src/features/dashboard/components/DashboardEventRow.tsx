import { Link } from 'react-router-dom'

import { EventStatusBadge } from '@/features/events/components/EventStatusBadge'
import type { DashboardEventViewModel } from '@/features/dashboard/types/dashboard'
import { formatDashboardDate } from '@/features/dashboard/utils/dashboardFormatting'
import { Caption } from '@/shared/components'
import { cn } from '@/shared/utils/cn'

export interface DashboardEventRowProps {
  event: DashboardEventViewModel
}

const TIPO_LABELS: Record<DashboardEventViewModel['tipo'], string> = {
  social: 'Social',
  empresarial: 'Empresarial',
}

/**
 * One dashboard event row, linking to the real `/eventos/{id}` detail
 * route (confirmed live — `app/router/routes.tsx`) — mirrors
 * `features/events/components/EventListItem.tsx`'s sibling-`<Link>`
 * pattern (main card + a smaller "Ver detalle" link, both real `<Link>`s
 * to the same href, never nested).
 */
export function DashboardEventRow({ event }: DashboardEventRowProps) {
  const href = `/eventos/${String(event.idEvento)}`

  return (
    <li>
      <Link
        to={href}
        className={cn(
          'border-border bg-card hover:bg-accent flex w-full flex-col gap-2 rounded-lg border p-4 text-left',
          'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
          'md:grid md:grid-cols-[2fr_1fr_1fr_auto] md:items-center md:gap-4',
        )}
      >
        <span className="flex flex-col gap-1">
          <span className="font-sans text-body-sm font-semibold">{event.titulo}</span>
          <Caption>
            {formatDashboardDate(event.fecha)} · {event.horaPresentacion}
          </Caption>
        </span>

        <span className="flex flex-col">
          <Caption>Salón</Caption>
          <span className="font-sans text-body-sm">
            {event.salonNombre ?? 'Información pendiente de integración'}
          </span>
        </span>

        <span className="flex flex-col">
          <Caption>Cupo de meseros</Caption>
          <span className="font-sans text-body-sm">{event.cupoMeseros}</span>
        </span>

        <span className="flex flex-wrap items-center gap-2">
          <span className="font-sans text-body-sm text-muted-foreground">
            {TIPO_LABELS[event.tipo]}
          </span>
          <EventStatusBadge estado={event.estado} />
        </span>
      </Link>
    </li>
  )
}
