import { skipToken, useQuery } from '@tanstack/react-query'

import { serviceRequestsQueryKeys } from '@/features/events/service-requests/queries/serviceRequestsQueryKeys'
import { fetchServiceRequests } from '@/features/events/service-requests/services/serviceRequestsApi'
import type { ServiceRequestStatusFilter } from '@/features/events/service-requests/types/serviceRequest'
import { isSgebNetworkError } from '@/shared/api/sgebApiError'

const MAX_NETWORK_RETRIES = 2

/** Live `GET /eventos/{id}/solicitudes` query. `idEvento: null` uses `skipToken`, same convention as `useMesasQuery`/`useEventClosureReadinessQuery`. */
export function useServiceRequestsQuery(
  idEvento: number | null,
  estado: ServiceRequestStatusFilter,
) {
  return useQuery({
    queryKey: serviceRequestsQueryKeys.list(idEvento ?? -1, estado),
    queryFn:
      idEvento === null
        ? skipToken
        : ({ signal }) => fetchServiceRequests(idEvento, estado, signal),
    retry: (failureCount, error) =>
      isSgebNetworkError(error) && failureCount < MAX_NETWORK_RETRIES,
  })
}
