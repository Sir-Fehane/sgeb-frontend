import { Link } from 'react-router-dom'

import { EventDetailSection } from '@/features/events/components/EventDetailSection'
import { Badge } from '@/shared/components'
import { cn } from '@/shared/utils/cn'

export interface EventDetailRoadmapSectionProps {
  idEvento: number
}

interface RoadmapItem {
  label: string
  /** `null` means still pending — no route registered yet. */
  slug: string | null
}

/**
 * The canonical visual order of the event's operational roadmap, as a
 * SINGLE ordered list — not two separate "active" and "pending" arrays.
 * That two-array shape was refactored away specifically because it forced
 * every active item before every pending one, which broke down once
 * "Cierre" (item 5) went active while "Bebidas y Cubaitor" (item 4, W-08,
 * deferred) stayed pending — a real out-of-order active item between two
 * pending ones. Each item's own `slug` (present vs. `null`) now decides
 * whether it renders as a `Link` or a non-interactive entry, independent
 * of its position in this list. Do not reorder this array to group active
 * items together — the order below IS the canonical order.
 */
const ROADMAP_ITEMS: readonly RoadmapItem[] = [
  { label: 'Selección de equipo', slug: 'equipo' },
  { label: 'Pase de lista', slug: 'pase-de-lista' },
  { label: 'Montaje / asignación de mesas', slug: 'montaje' },
  { label: 'Bebidas y Cubaitor', slug: null },
  { label: 'Cierre', slug: 'cierre' },
  { label: 'Pagos', slug: 'pagos' },
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
        {ROADMAP_ITEMS.map((item) =>
          item.slug ? (
            <li key={item.label}>
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
          ) : (
            <li key={item.label}>
              <span
                aria-disabled="true"
                className="border-border bg-muted/40 text-muted-foreground flex min-h-11 cursor-not-allowed items-center justify-between gap-3 rounded-lg border px-4 font-sans text-body-sm font-medium"
              >
                <span>{item.label}</span>
                <Badge tone="neutral" className="shrink-0">
                  Próximamente
                </Badge>
              </span>
            </li>
          ),
        )}
      </ul>
    </EventDetailSection>
  )
}
