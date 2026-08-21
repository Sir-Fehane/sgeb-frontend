import { skipToken, useQuery } from '@tanstack/react-query'

import { eventDashboardQueryKeys } from '@/features/events/dashboard/queries/eventDashboardQueryKeys'
import { fetchEventDashboard } from '@/features/events/dashboard/services/eventDashboardApi'
import { isSgebNetworkError } from '@/shared/api/sgebApiError'

const MAX_NETWORK_RETRIES = 2

/**
 * Live `GET /eventos/{id}/dashboard` query. `idEvento: null` (a malformed
 * route id) uses `skipToken`, same convention as `useEventClosureReadinessQuery`/
 * `useMesasQuery`. Retries only a transport-level `SgebNetworkError`,
 * bounded — a `SgebApplicationError` (including a normal SGEB-0004
 * partial success, which never throws — see `eventDashboardApi.ts`) is
 * either deterministic or not an error at all.
 */
export function useEventDashboardQuery(idEvento: number | null) {
  return useQuery({
    queryKey: eventDashboardQueryKeys.detail(idEvento ?? -1),
    queryFn:
      idEvento === null
        ? skipToken
        : ({ signal }) => fetchEventDashboard(idEvento, signal),
    retry: (failureCount, error) =>
      isSgebNetworkError(error) && failureCount < MAX_NETWORK_RETRIES,
  })
}
