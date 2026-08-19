import { EventDetailSection } from '@/features/events/components/EventDetailSection'
import { EventGeofenceMapPreview } from '@/features/events/components/EventGeofenceMapPreview'
import type { EventDetailViewModel } from '@/features/events/types/event'
import { Caption, Text } from '@/shared/components'

export interface EventDetailGeofenceSectionProps {
  evento: EventDetailViewModel
}

/**
 * Read-only geofence visualization — "Zona de registro de llegada". Only
 * rendered while `EventDetailContent` shows the read-only Schedule +
 * Logistics sections (never alongside `EventEditForm`, which mounts its
 * own preview instance instead) — see that component's own comment for why
 * only one `EventGeofenceMapPreview`/`mapbox-gl` instance is ever mounted
 * at a time.
 *
 * Repeats the salón name and its address as compact text BELOW the map —
 * `EventDetailScheduleSection` has no Salón-address field of its own, so
 * this is the only place that context exists. `radioGeocercaM` itself is
 * deliberately NOT repeated here a second time: `EventDetailLogisticsSection`
 * already states it in meters elsewhere on this same page (a final UX pass
 * found "Radio configurado: N m" directly under the map redundant with
 * that existing row, not merely acceptable duplication).
 */
export function EventDetailGeofenceSection({ evento }: EventDetailGeofenceSectionProps) {
  return (
    <EventDetailSection title="Zona de registro de llegada">
      <div className="flex flex-col gap-3">
        <EventGeofenceMapPreview
          salon={
            evento.salonLatitud !== undefined && evento.salonLongitud !== undefined
              ? {
                  nombre: evento.salonNombre,
                  lat: evento.salonLatitud,
                  lng: evento.salonLongitud,
                }
              : null
          }
          radiusMeters={evento.radioGeocercaM}
          emptyStateMessage="No pudimos obtener la ubicación del salón para mostrar la vista previa."
        />
        {evento.salonNombre || evento.salonAddress ? (
          <div className="flex flex-col gap-0.5">
            {evento.salonNombre ? (
              <Text size="sm" className="font-medium">
                {evento.salonNombre}
              </Text>
            ) : null}
            {evento.salonAddress ? <Caption>{evento.salonAddress}</Caption> : null}
          </div>
        ) : null}
      </div>
    </EventDetailSection>
  )
}
