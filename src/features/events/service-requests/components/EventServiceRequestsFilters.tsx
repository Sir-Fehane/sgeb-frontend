import { SERVICE_REQUEST_STATUS_LABELS } from '@/features/events/service-requests/utils/serviceRequestPresentation'
import type { ServiceRequestStatusFilter } from '@/features/events/service-requests/types/serviceRequest'
import { FormField, Select } from '@/shared/components'

export interface EventServiceRequestsFiltersProps {
  estado: ServiceRequestStatusFilter
  onEstadoChange: (estado: ServiceRequestStatusFilter) => void
}

const ESTADO_OPTIONS = Object.entries(SERVICE_REQUEST_STATUS_LABELS) as [
  keyof typeof SERVICE_REQUEST_STATUS_LABELS,
  string,
][]

/** Server-side `estado` filter only — matches `ComensalService.listarSolicitudes`'s one real filter this screen exposes (see `types/serviceRequest.ts`). */
export function EventServiceRequestsFilters({
  estado,
  onEstadoChange,
}: EventServiceRequestsFiltersProps) {
  return (
    <FormField label="Estado" className="w-48">
      {(controlProps) => (
        <Select
          {...controlProps}
          value={estado}
          onChange={(event) => {
            onEstadoChange(event.target.value as ServiceRequestStatusFilter)
          }}
        >
          <option value="pendiente">{SERVICE_REQUEST_STATUS_LABELS.pendiente}</option>
          <option value="todas">Todas</option>
          {ESTADO_OPTIONS.filter(([value]) => value !== 'pendiente').map(
            ([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ),
          )}
        </Select>
      )}
    </FormField>
  )
}
