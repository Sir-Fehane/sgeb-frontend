import { EventDetailSection } from '@/features/events/components/EventDetailSection'
import { Badge } from '@/shared/components'

/**
 * The already-documented operational areas for a single event
 * (docs/FrontendArchitecture.md §17's "Proposed Routing Structure":
 * `/eventos/:id/equipo`, `/pase-de-lista`, `/montaje`, `/cubaitor`,
 * `/cierre`, `/pagos`). None of these routes are registered in this
 * branch — see the labels below.
 */
const ROADMAP_ITEMS: readonly string[] = [
  'Selección de equipo',
  'Pase de lista',
  'Montaje / asignación de mesas',
  'Bebidas y Cubaitor',
  'Cierre',
  'Pagos',
]

/**
 * Contextual entry points only — NOT implementations of those screens.
 * Mirrors `NavItem`'s `status: 'route-pending'` treatment
 * (`shared/components/layout/NavItem.tsx`): no `href`, no `href="#"`, no
 * interactive role, no `tabIndex`, no click handler — a label with no
 * control behind it, not a broken link. `aria-disabled="true"` plus the
 * always-visible "Próximamente" badge (never color alone) carry that to
 * assistive technology the same way ordinary reading-order content would.
 */
export function EventDetailRoadmapSection() {
  return (
    <EventDetailSection title="Operación del evento">
      <ul aria-label="Áreas operativas del evento" className="flex flex-col gap-2">
        {ROADMAP_ITEMS.map((label) => (
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
