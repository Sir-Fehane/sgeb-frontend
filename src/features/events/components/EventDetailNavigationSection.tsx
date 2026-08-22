import {
  IconCash,
  IconChecklist,
  IconClipboardCheck,
  IconDoorExit,
  IconGlassFull,
  IconLayoutDashboard,
  IconMessage2,
  IconTools,
  IconUsers,
} from '@tabler/icons-react'
import type { ComponentType } from 'react'
import { Link } from 'react-router-dom'

import { EventDetailSection } from '@/features/events/components/EventDetailSection'
import { Caption, Text, type NavIconProps } from '@/shared/components'
import { cn } from '@/shared/utils/cn'

export interface EventDetailNavigationSectionProps {
  idEvento: number
}

interface OperationNavItem {
  label: string
  description: string
  slug: string
  icon: ComponentType<NavIconProps>
}

/**
 * Every entry here is a confirmed, real destination — there is no pending
 * variant of this list anymore (the last one, "Bebidas y Cubaitor", shipped
 * on `feature/cubaitor-orders-live`; see git history for the retired
 * nullable-`slug`/"Próximamente" rendering this replaced). Grouped by where
 * each capability sits in the event's real lifecycle, not by a flat visual
 * roadmap — group order mirrors the target IA:
 * Planeación → Operación en vivo → Cierre. Mesas/Comanda/Geocerca stay out
 * of this list entirely: they already render as their own inline Event
 * Detail sections above, so listing them again here would just duplicate
 * that same content behind a second click.
 */
const PLANEACION_ITEMS: readonly OperationNavItem[] = [
  {
    label: 'Selección de equipo',
    description: 'Confirma a los meseros y personal de barra apartados para este evento.',
    slug: 'equipo',
    icon: IconUsers,
  },
]

/**
 * "Resumen operativo" is the user-facing name for the `/panel-operativo`
 * command-center (`EventDashboardPage`) within this IA — the technical
 * route/component names are unchanged, only this label (see that page's
 * own comment). "Control de salida" is the equally renamed label for the
 * narrow participant-exit screen at `/operacion-en-vivo` — the previous
 * label duplicated this group's own title, which is exactly the collision
 * this rename removes (see `LiveOperationsHeader`'s own comment).
 */
const OPERACION_EN_VIVO_ITEMS: readonly OperationNavItem[] = [
  {
    label: 'Resumen operativo',
    description: 'Indicadores en vivo de asistencia, montaje, piso, barra y servicio.',
    slug: 'panel-operativo',
    icon: IconLayoutDashboard,
  },
  {
    label: 'Pase de lista',
    description: 'Consulta la confirmación de llegada del personal.',
    slug: 'pase-de-lista',
    icon: IconClipboardCheck,
  },
  {
    label: 'Montaje',
    description: 'Verifica el checklist de montaje y la asignación de mesas.',
    slug: 'montaje',
    icon: IconTools,
  },
  {
    label: 'Control de salida',
    description: 'Registra la salida del personal vinculado a este evento.',
    slug: 'operacion-en-vivo',
    icon: IconDoorExit,
  },
  {
    label: 'Solicitudes de mesa',
    description: 'Atiende las solicitudes de servicio de los comensales.',
    slug: 'solicitudes',
    icon: IconMessage2,
  },
  {
    label: 'Bebidas y Cubaitor',
    description: 'Monitorea y dispensa las órdenes de barra del evento.',
    slug: 'cubaitor',
    icon: IconGlassFull,
  },
]

const CIERRE_ITEMS: readonly OperationNavItem[] = [
  {
    label: 'Cierre',
    description: 'Verifica los pendientes de cierre y registra reportes de merma.',
    slug: 'cierre',
    icon: IconChecklist,
  },
  {
    label: 'Pagos',
    description: 'Calcula y registra la dispersión de pagos al personal.',
    slug: 'pagos',
    icon: IconCash,
  },
]

function OperationNavList({
  idEvento,
  ariaLabel,
  items,
}: {
  idEvento: number
  ariaLabel: string
  items: readonly OperationNavItem[]
}) {
  return (
    <ul aria-label={ariaLabel} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <li key={item.slug}>
          <Link
            to={`/eventos/${String(idEvento)}/${item.slug}`}
            className={cn(
              'border-border bg-card hover:bg-accent flex h-full flex-col gap-1 rounded-lg border p-4',
              'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
            )}
          >
            <span className="flex items-center gap-2">
              <item.icon aria-hidden="true" className="text-muted-foreground size-5" />
              <Text className="font-medium">{item.label}</Text>
            </span>
            <Caption>{item.description}</Caption>
          </Link>
        </li>
      ))}
    </ul>
  )
}

/**
 * Grouped operational navigation for Event Detail — replaces the previous
 * flat 9-link "roadmap" (`EventDetailRoadmapSection`, retired on
 * `feature/event-experience-consolidation`): every one of these links was
 * already real, so a single undifferentiated list no longer communicated
 * anything about where a captain/admin actually is in the event's
 * lifecycle. Three real headings (not one generic wrapper title) group
 * capabilities by Planeación / Operación en vivo / Cierre — UI grouping
 * only, never a client-side phase/state machine: `evento.estado` (shown in
 * `EventDetailHeader`) remains the sole source of truth for the event's
 * real lifecycle stage, and every item below stays reachable regardless of
 * `estado` (e.g. Planeación items are still relevant while `en_curso`).
 */
export function EventDetailNavigationSection({
  idEvento,
}: EventDetailNavigationSectionProps) {
  return (
    <>
      <EventDetailSection title="Planeación">
        <OperationNavList
          idEvento={idEvento}
          ariaLabel="Áreas de planeación del evento"
          items={PLANEACION_ITEMS}
        />
      </EventDetailSection>

      <EventDetailSection title="Operación en vivo">
        <OperationNavList
          idEvento={idEvento}
          ariaLabel="Áreas de operación en vivo del evento"
          items={OPERACION_EN_VIVO_ITEMS}
        />
      </EventDetailSection>

      <EventDetailSection title="Cierre">
        <OperationNavList
          idEvento={idEvento}
          ariaLabel="Áreas de cierre del evento"
          items={CIERRE_ITEMS}
        />
      </EventDetailSection>
    </>
  )
}
