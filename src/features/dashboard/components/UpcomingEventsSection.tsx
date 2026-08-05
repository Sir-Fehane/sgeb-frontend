import { DashboardSection } from '@/features/dashboard/components/DashboardSection'
import { DashboardSectionUnavailable } from '@/features/dashboard/components/DashboardSectionUnavailable'
import { UpcomingEventItem } from '@/features/dashboard/components/UpcomingEventItem'
import type { UpcomingEventViewModel } from '@/features/dashboard/types/dashboard'
import { Text } from '@/shared/components'

export interface UpcomingEventsSectionProps {
  proximosEventos: readonly UpcomingEventViewModel[] | null
  onSelectEvent?: ((id: string) => void) | undefined
}

/**
 * `DashboardCapitan.proximos_eventos` — `null` when unavailable
 * (SGEB-0004 or excluded via `secciones`), `[]` when there are simply no
 * upcoming events (a valid, distinct state), or a populated list.
 */
export function UpcomingEventsSection({
  proximosEventos,
  onSelectEvent,
}: UpcomingEventsSectionProps) {
  return (
    <DashboardSection title="Próximos eventos">
      {proximosEventos === null ? (
        <DashboardSectionUnavailable />
      ) : proximosEventos.length === 0 ? (
        <Text size="sm" className="text-muted-foreground">
          No hay próximos eventos en el rango seleccionado.
        </Text>
      ) : (
        <ul aria-label="Próximos eventos" className="flex flex-col gap-3">
          {proximosEventos.map((event) => (
            <UpcomingEventItem
              key={event.idEvento}
              event={event}
              onSelect={onSelectEvent}
            />
          ))}
        </ul>
      )}
    </DashboardSection>
  )
}
