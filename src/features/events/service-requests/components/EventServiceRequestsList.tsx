import type { ServiceRequestViewModel } from '@/features/events/service-requests/types/serviceRequest'
import {
  SERVICE_REQUEST_STATUS_LABELS,
  SERVICE_REQUEST_STATUS_TONES,
  SERVICE_REQUEST_TYPE_LABELS,
  formatServiceRequestDateTime,
} from '@/features/events/service-requests/utils/serviceRequestPresentation'
import { Badge, Button, Text } from '@/shared/components'

export interface EventServiceRequestsListProps {
  requests: readonly ServiceRequestViewModel[]
  onAttend: (idSolicitud: number) => void
  onCancel: (idSolicitud: number) => void
  /** The one request currently mid-mutation, if any — disables just that row's own buttons, never the whole list. */
  pendingIdSolicitud: number | null
}

export function EventServiceRequestsList({
  requests,
  onAttend,
  onCancel,
  pendingIdSolicitud,
}: EventServiceRequestsListProps) {
  if (requests.length === 0) {
    return (
      <Text size="sm" className="text-muted-foreground">
        No hay solicitudes con este filtro.
      </Text>
    )
  }

  return (
    <ul aria-label="Solicitudes de mesa" className="flex flex-col gap-3">
      {requests.map((request) => {
        const isRowPending = pendingIdSolicitud === request.idSolicitud
        return (
          <li
            key={request.idSolicitud}
            className="border-border bg-card flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Text className="font-medium">Mesa {request.idMesa}</Text>
                <Badge tone={SERVICE_REQUEST_STATUS_TONES[request.estado]}>
                  {SERVICE_REQUEST_STATUS_LABELS[request.estado]}
                </Badge>
              </div>
              <Text size="sm" className="text-muted-foreground">
                {SERVICE_REQUEST_TYPE_LABELS[request.tipo]} ·{' '}
                {formatServiceRequestDateTime(request.creadaEn)}
              </Text>
            </div>

            {request.estado === 'pendiente' ? (
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  disabled={isRowPending}
                  onClick={() => {
                    onAttend(request.idSolicitud)
                  }}
                >
                  Atender
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isRowPending}
                  onClick={() => {
                    onCancel(request.idSolicitud)
                  }}
                >
                  Cancelar
                </Button>
              </div>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
