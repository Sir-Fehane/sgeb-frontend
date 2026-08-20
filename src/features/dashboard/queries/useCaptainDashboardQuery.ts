import { useQuery } from '@tanstack/react-query'

import { dashboardQueryKeys } from '@/features/dashboard/queries/dashboardQueryKeys'
import { fetchCaptainDashboard } from '@/features/dashboard/services/dashboardApi'
import { isSgebNetworkError } from '@/shared/api/sgebApiError'

const MAX_NETWORK_RETRIES = 2

/**
 * Live `GET /dashboard/capitan` query. Retries only a transport-level
 * `SgebNetworkError` a bounded number of times — a `SgebApplicationError` is
 * deterministic and retrying it changes nothing, same convention as
 * `features/events/queries/useEventsListQuery.ts`.
 */
export function useCaptainDashboardQuery() {
  return useQuery({
    queryKey: dashboardQueryKeys.capitan(),
    queryFn: ({ signal }) => fetchCaptainDashboard(signal),
    retry: (failureCount, error) =>
      isSgebNetworkError(error) && failureCount < MAX_NETWORK_RETRIES,
  })
}
