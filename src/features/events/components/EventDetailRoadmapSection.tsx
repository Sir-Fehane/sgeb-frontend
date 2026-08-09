import { Link } from 'react-router-dom'

import { EventDetailSection } from '@/features/events/components/EventDetailSection'
import { Badge } from '@/shared/components'
import { cn } from '@/shared/utils/cn'

export interface EventDetailRoadmapSectionProps {
  idEvento: number
}

/**
 * The already-documented operational areas that are now real, registered
 * routes: "Selección de equipo" (W-05,
 * `feature/event-team-selection-ui-foundation`) and "Pase de lista"
 * (W-06, `feature/event-attendance-ui-foundation`). Rendered as ordinary
 * `Link`s, not placeholders.
 */
const ACTIVE_ROADMAP_ITEMS: readonly { label: string; slug: string }[] = [
  { label: 'Selección de equipo', slug: 'equipo' },
  { label: 'Pase de lista', slug: 'pase-de-lista' },
]

/**
 * The remaining still-unimplemented operational areas
 * (docs/FrontendArchitecture.md §17's "Proposed Routing Structure":
 * `/montaje`, `/cubaitor`, `/cierre`, `/pagos`). None of these routes are
 * registered yet.
 */
const PENDING_ROADMAP_ITEMS: readonly string[] = [
  'Montaje / asignación de mesas',
  'Bebidas y Cubaitor',
  'Cierre',
  'Pagos',
]

/**
 * A mix of real entry points and contextual, non-interactive ones — NOT
 * implementations of the pending screens. The pending items mirror
 * `NavItem`'s `status: 'route-pending'` treatment
 * (`shared/components/layout/NavItem.tsx`): no `href`, no `href="#"`, no
 * interactive role, no `tabIndex`, no click handler — a label with no
 * control behind it, not a broken link. `aria-disabled="true"` plus the
 * always-visible "Próximamente" badge (never color alone) carry that to
 * assistive technology the same way ordinary reading-order content would.
 */
export function EventDetailRoadmapSection({ idEvento }: EventDetailRoadmapSectionProps) {
  return (
    <EventDetailSection title="Operación del evento">
      <ul aria-label="Áreas operativas del evento" className="flex flex-col gap-2">
        {ACTIVE_ROADMAP_ITEMS.map((item) => (
          <li key={item.slug}>
            <Link
              to={`/eventos/${String(idEvento)}/${item.slug}`}
              className={cn(
                'border-border bg-card hover:bg-accent flex min-h-11 items-center gap-3 rounded-lg border px-4',
                'font-sans text-body-sm text-foreground font-medium',
                'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
              )}
            >
              {item.label}
            </Link>
          </li>
        ))}
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
