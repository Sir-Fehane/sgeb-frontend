import { Link } from 'react-router-dom'

import { EventDetailSection } from '@/features/events/components/EventDetailSection'
import { Badge } from '@/shared/components'
import { cn } from '@/shared/utils/cn'

export interface EventDetailRoadmapSectionProps {
  idEvento: number
}

/**
 * The remaining already-documented operational areas for a single event
 * (docs/FrontendArchitecture.md §17's "Proposed Routing Structure":
 * `/pase-de-lista`, `/montaje`, `/cubaitor`, `/cierre`, `/pagos`). None of
 * these routes are registered yet — see the labels below. "Selección de
 * equipo" (`/eventos/:id/equipo`) is no longer in this list — it's a real
 * route now, rendered separately below as the one interactive entry.
 */
const PENDING_ROADMAP_ITEMS: readonly string[] = [
  'Pase de lista',
  'Montaje / asignación de mesas',
  'Bebidas y Cubaitor',
  'Cierre',
  'Pagos',
]

/**
 * Mostly contextual entry points, NOT implementations of those screens —
 * mirrors `NavItem`'s `status: 'route-pending'` treatment
 * (`shared/components/layout/NavItem.tsx`) for every item except
 * "Selección de equipo": no `href`, no `href="#"`, no interactive role,
 * no `tabIndex`, no click handler for the pending ones — a label with no
 * control behind it, not a broken link. `aria-disabled="true"` plus the
 * always-visible "Próximamente" badge (never color alone) carry that to
 * assistive technology the same way ordinary reading-order content would.
 *
 * "Selección de equipo" (`feature/event-team-selection-ui-foundation`) is
 * the one real `Link` here — a genuine registered route
 * (`/eventos/:id/equipo`), not a placeholder.
 */
export function EventDetailRoadmapSection({ idEvento }: EventDetailRoadmapSectionProps) {
  return (
    <EventDetailSection title="Operación del evento">
      <ul aria-label="Áreas operativas del evento" className="flex flex-col gap-2">
        <li>
          <Link
            to={`/eventos/${String(idEvento)}/equipo`}
            className={cn(
              'border-border bg-card hover:bg-accent flex min-h-11 items-center gap-3 rounded-lg border px-4',
              'font-sans text-body-sm text-foreground font-medium',
              'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
            )}
          >
            Selección de equipo
          </Link>
        </li>
        {PENDING_ROADMAP_ITEMS.map((label) => (
          <li key={label}>
            <span
              aria-disabled="true"
              className="border-border bg-muted/40 text-muted-foreground flex min-h-11 cursor-not-allowed items-center justify-between gap-3 rounded-lg border px-4 font-sans text-body-sm font-medium"
            >
              <span>{label}</span>
              <Badge tone="neutral" className="shrink-0">
                Próximamente
              </Badge>
            </span>
          </li>
        ))}
      </ul>
    </EventDetailSection>
  )
}
