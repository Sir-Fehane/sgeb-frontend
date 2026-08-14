import { skipToken, useQuery } from '@tanstack/react-query'

import { closureQueryKeys } from '@/features/events/closure/queries/closureQueryKeys'
import { fetchMermaReports } from '@/features/events/closure/services/closureApi'
import { isSgebNetworkError } from '@/shared/api/sgebApiError'

const MAX_NETWORK_RETRIES = 2

/**
 * Live `GET /eventos/{id_evento}/reportes-merma` query for the Closure
 * page. Same `skipToken`/network-only-retry conventions as
 * `useEventClosureReadinessQuery`.
 */
export function useMermaReportsQuery(idEvento: number | null) {
  return useQuery({
    queryKey: closureQueryKeys.mermaReports(idEvento ?? -1),
    queryFn:
      idEvento === null ? skipToken : ({ signal }) => fetchMermaReports(idEvento, signal),
    retry: (failureCount, error) =>
      isSgebNetworkError(error) && failureCount < MAX_NETWORK_RETRIES,
  })
}
