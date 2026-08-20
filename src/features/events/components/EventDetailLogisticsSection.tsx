import { EventDetailSection } from '@/features/events/components/EventDetailSection'
import type { EventDetailViewModel } from '@/features/events/types/event'
import {
  formatEventGeofenceRadius,
  formatEventTarifa,
} from '@/features/events/utils/eventDetailFormatting'

export interface EventDetailLogisticsSectionProps {
  evento: EventDetailViewModel
}

/**
 * Display only — `tarifaPorMesero` is formatted, never used to derive a
 * payroll/payment total, and `radioGeocercaM` renders as plain meters,
 * never a map or a distance calculation.
 */
export function EventDetailLogisticsSection({
  evento,
}: EventDetailLogisticsSectionProps) {
  return (
    <EventDetailSection title="Planeación y logística">
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        <div className="flex flex-col gap-1">
          <dt className="font-sans text-caption text-muted-foreground">
            Cupo de meseros
          </dt>
          <dd className="font-heading text-heading text-foreground font-semibold">
            {evento.cupoMeseros}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="font-sans text-caption text-muted-foreground">
            Mesas planeadas
          </dt>
          <dd className="font-heading text-heading text-foreground font-semibold">
            {evento.numMesas}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="font-sans text-caption text-muted-foreground">
            Tarifa por mesero
          </dt>
          <dd className="font-heading text-heading text-foreground font-semibold">
            {formatEventTarifa(evento.tarifaPorMesero)}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="font-sans text-caption text-muted-foreground">
            Radio de geocerca
          </dt>
          <dd className="font-heading text-heading text-foreground font-semibold">
            {formatEventGeofenceRadius(evento.radioGeocercaM)}
          </dd>
        </div>
      </dl>
    </EventDetailSection>
  )
}
