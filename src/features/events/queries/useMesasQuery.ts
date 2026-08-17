import { skipToken, useQuery } from '@tanstack/react-query'

import { mesasQueryKeys } from '@/features/events/queries/mesasQueryKeys'
import { fetchMesas } from '@/features/events/services/mesasApi'
import { isSgebNetworkError } from '@/shared/api/sgebApiError'

const MAX_NETWORK_RETRIES = 2

/**
 * Live `GET /eventos/{id}/mesas` query. `idEvento: null` (a malformed
 * route id) uses `skipToken`, same pattern as `useEventDetailQuery`.
 * Retries only a transport-level `SgebNetworkError`, bounded.
 */
export function useMesasQuery(idEvento: number | null) {
  return useQuery({
    queryKey: mesasQueryKeys.list(idEvento ?? -1),
    queryFn: idEvento === null ? skipToken : ({ signal }) => fetchMesas(idEvento, signal),
    retry: (failureCount, error) =>
      isSgebNetworkError(error) && failureCount < MAX_NETWORK_RETRIES,
  })
}
