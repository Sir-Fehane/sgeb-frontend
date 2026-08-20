import { useQuery } from '@tanstack/react-query'

import { fetchRoles } from '@/features/waiters/services/rolesApi'
import { isSgebNetworkError } from '@/shared/api/sgebApiError'

const MAX_NETWORK_RETRIES = 2
const rolesQueryKey = ['roles'] as const

/** Live `GET /roles` query — the fixed role catalog rarely changes, so this stays cached at TanStack Query's default `staleTime` (no explicit override needed). */
export function useRolesQuery() {
  return useQuery({
    queryKey: rolesQueryKey,
    queryFn: ({ signal }) => fetchRoles(signal),
    retry: (failureCount, error) =>
      isSgebNetworkError(error) && failureCount < MAX_NETWORK_RETRIES,
  })
}
