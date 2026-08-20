import { skipToken, useQuery } from '@tanstack/react-query'

import { asignacionesQueryKeys } from '@/features/events/queries/asignacionesQueryKeys'
import {
  fetchAsignaciones,
  type FetchAsignacionesParams,
} from '@/features/events/services/asignacionesApi'
import { isSgebNetworkError } from '@/shared/api/sgebApiError'

const MAX_NETWORK_RETRIES = 2

/**
 * Foundation-only: the typed query for `GET /eventos/{id}/asignaciones`,
 * following the same shape as `useMesasQuery`. Not yet wired into any
 * screen — `EventMontagePage`'s table-assignment section still runs on
 * local demo state (see that page's own comment); replacing it with this
 * hook is deferred to `feature/table-assignment-integration`.
 */
export function useAsignacionesQuery(
  idEvento: number | null,
  params?: FetchAsignacionesParams,
) {
  return useQuery({
    queryKey: asignacionesQueryKeys.list(idEvento ?? -1, params?.vinculada),
    queryFn:
      idEvento === null
        ? skipToken
        : ({ signal }) => fetchAsignaciones(idEvento, params, signal),
    retry: (failureCount, error) =>
      isSgebNetworkError(error) && failureCount < MAX_NETWORK_RETRIES,
  })
}
