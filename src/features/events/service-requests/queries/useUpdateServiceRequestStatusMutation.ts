import { useMutation, useQueryClient } from '@tanstack/react-query'

import { eventDashboardQueryKeys } from '@/features/events/dashboard/queries/eventDashboardQueryKeys'
import { serviceRequestsQueryKeys } from '@/features/events/service-requests/queries/serviceRequestsQueryKeys'
import { updateServiceRequestStatus } from '@/features/events/service-requests/services/serviceRequestsApi'

/**
 * `PATCH /solicitudes/{id_solicitud}/estado`. No optimistic update: on
 * success this invalidates every `estado` filter of this event's request
 * list (not just the currently-selected one — a captain viewing
 * "pendiente" who resolves a request needs that filtered list to lose the
 * row too) plus the event dashboard's own cached read, since its
 * `servicio.solicitudesPendientes` count is now stale. Same
 * "invalidate, let the real row arrive through refetch" pattern as
 * `useMarkPaymentPaidMutation`.
 */
export function useUpdateServiceRequestStatusMutation(idEvento: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      idSolicitud,
      estado,
    }: {
      idSolicitud: number
      estado: 'atendida' | 'cancelada'
    }) => updateServiceRequestStatus(idSolicitud, estado),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: serviceRequestsQueryKeys.all })
      void queryClient.invalidateQueries({
        queryKey: eventDashboardQueryKeys.detail(idEvento),
      })
    },
  })
}
