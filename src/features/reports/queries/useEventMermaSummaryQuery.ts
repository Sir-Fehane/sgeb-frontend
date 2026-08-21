import { skipToken, useQuery } from '@tanstack/react-query'

import { reportsQueryKeys } from '@/features/reports/queries/reportsQueryKeys'
import { fetchEventMermaSummary } from '@/features/reports/services/reportsApi'
import { isSgebNetworkError } from '@/shared/api/sgebApiError'

const MAX_NETWORK_RETRIES = 2

/** Live `GET /eventos/{id}/reportes-merma` query. `idEvento: null` (nothing selected in the event picker yet) uses `skipToken`, same convention as `useEventClosureReadinessQuery`. */
export function useEventMermaSummaryQuery(idEvento: number | null) {
  return useQuery({
    queryKey: reportsQueryKeys.mermaSummary(idEvento ?? -1),
    queryFn:
      idEvento === null
        ? skipToken
        : ({ signal }) => fetchEventMermaSummary(idEvento, signal),
    retry: (failureCount, error) =>
      isSgebNetworkError(error) && failureCount < MAX_NETWORK_RETRIES,
  })
}
