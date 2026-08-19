import { EventDetailSection } from '@/features/events/components/EventDetailSection'
import type { EventDetailViewModel } from '@/features/events/types/event'
import {
  formatEventDate,
  formatEventPresentationTime,
  formatEventTime,
} from '@/features/events/utils/eventDetailFormatting'

export interface EventDetailScheduleSectionProps {
  evento: EventDetailViewModel
}

/**
 * `salonNombre` is a presentation-only convenience (see
 * `EventDetailViewModel`'s comment) — rendered with the same
 * "Información pendiente de integración" fallback `EventListItem` already
 * uses when it's absent, for consistency across the feature.
 */
export function EventDetailScheduleSection({ evento }: EventDetailScheduleSectionProps) {
  return (
    <EventDetailSection title="Fecha y ubicación">
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        <div className="flex flex-col gap-1">
          <dt className="font-sans text-caption text-muted-foreground">Salón</dt>
          <dd className="font-sans text-body-sm text-foreground font-medium">
            {evento.salonNombre ?? 'Información pendiente de integración'}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="font-sans text-caption text-muted-foreground">Fecha</dt>
          <dd className="font-sans text-body-sm text-foreground font-medium">
            {formatEventDate(evento.fecha)}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="font-sans text-caption text-muted-foreground">
            Hora de presentación
          </dt>
          <dd className="font-sans text-body-sm text-foreground font-medium">
            {formatEventPresentationTime(evento.horaPresentacion)}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="font-sans text-caption text-muted-foreground">Hora de inicio</dt>
          <dd className="font-sans text-body-sm text-foreground font-medium">
            {formatEventTime(evento.inicio)}
          </dd>
        </div>
      </dl>
    </EventDetailSection>
  )
}
