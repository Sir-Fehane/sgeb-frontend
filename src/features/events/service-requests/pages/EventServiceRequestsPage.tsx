import { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'

import { EventServiceRequestsContent } from '@/features/events/service-requests/components/EventServiceRequestsContent'
import { useServiceRequestsQuery } from '@/features/events/service-requests/queries/useServiceRequestsQuery'
import { useUpdateServiceRequestStatusMutation } from '@/features/events/service-requests/queries/useUpdateServiceRequestStatusMutation'
import type { ServiceRequestStatusFilter } from '@/features/events/service-requests/types/serviceRequest'
import { parseEventId } from '@/features/events/utils/parseEventId'
import { isSgebApplicationError, isSgebNetworkError } from '@/shared/api/sgebApiError'
import { useEventRealtimeRoom } from '@/shared/realtime/useEventRealtimeRoom'

/** Never renders `technical_message` — same helper duplicated across every event-scoped page (`EventClosurePage`, `EventDashboardPage`). */
function toSafeErrorMessage(error: unknown): string {
  if (isSgebApplicationError(error) || isSgebNetworkError(error)) {
    return error.message
  }
  return 'Ocurrió un error inesperado al cargar las solicitudes.'
}

/**
 * Routed at /eventos/:id/solicitudes — the real staff-facing view over
 * `GET /eventos/{id}/solicitudes` (list/filter) and
 * `PATCH /solicitudes/{id}/estado` (atender/cancelar). No creation UI here
 * — requests are always created by the anonymous diner
 * (`features/public-diner`), never by staff. `useEventRealtimeRoom` joins
 * this event's Socket.IO room so a `solicitud:cambio` push (another
 * mesero resolving the same request, or a brand-new one arriving)
 * refetches the list without a manual reload — see `SocketProvider`'s own
 * `solicitud:cambio` handling for the toast/notification half of this;
 * this page only needs the query invalidation half, already wired there.
 */
export function EventServiceRequestsPage() {
  const { id } = useParams<{ id: string }>()
  const idEvento = parseEventId(id)
  useEventRealtimeRoom(idEvento)

  const [estado, setEstado] = useState<ServiceRequestStatusFilter>('pendiente')
  const requestsQuery = useServiceRequestsQuery(idEvento, estado)
  const updateStatusMutation = useUpdateServiceRequestStatusMutation(idEvento ?? -1)
  // Same "ref, not `isPending`" reasoning `EventClosurePage` documents for
  // its own submit guards — mutation state updates through TanStack
  // Query's external store and isn't guaranteed to have flushed between
  // two synchronous clicks on two different rows.
  const pendingIdRef = useRef<number | null>(null)
  const [pendingIdSolicitud, setPendingIdSolicitud] = useState<number | null>(null)

  const isLoading = idEvento !== null && requestsQuery.isPending
  const hasRealError = idEvento !== null && requestsQuery.isError
  const errorMessage = hasRealError ? toSafeErrorMessage(requestsQuery.error) : undefined

  function handleTransition(idSolicitud: number, target: 'atendida' | 'cancelada') {
    if (pendingIdRef.current !== null) {
      return
    }
    pendingIdRef.current = idSolicitud
    setPendingIdSolicitud(idSolicitud)
    updateStatusMutation.mutate(
      { idSolicitud, estado: target },
      {
        onSettled: () => {
          pendingIdRef.current = null
          setPendingIdSolicitud(null)
        },
      },
    )
  }

  return (
    <EventServiceRequestsContent
      idEvento={idEvento}
      requests={requestsQuery.data ?? null}
      estado={estado}
      onEstadoChange={setEstado}
      isLoading={isLoading}
      {...(errorMessage ? { errorMessage } : {})}
      onRetry={() => {
        void requestsQuery.refetch()
      }}
      onAttend={(idSolicitud) => {
        handleTransition(idSolicitud, 'atendida')
      }}
      onCancel={(idSolicitud) => {
        handleTransition(idSolicitud, 'cancelada')
      }}
      pendingIdSolicitud={pendingIdSolicitud}
      {...(updateStatusMutation.isError
        ? { actionErrorMessage: toSafeErrorMessage(updateStatusMutation.error) }
        : {})}
    />
  )
}
