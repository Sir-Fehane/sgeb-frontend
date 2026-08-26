import { useQuery } from '@tanstack/react-query'

import { fetchRoles } from '@/features/waiters/services/rolesApi'
import { isSgebNetworkError } from '@/shared/api/sgebApiError'

const MAX_NETWORK_RETRIES = 2
const rolesQueryKey = ['roles'] as const

/**
 * Live `GET /roles` query — the fixed role catalog rarely changes, so this
 * stays cached at TanStack Query's default `staleTime` (no explicit
 * override needed). `enabled` defaults to `true` since most callers
 * (`UsersPage`, `UsersFilters`) fetch it unconditionally; `WaitersPage`
 * passes its own `canView` role gate explicitly, same pattern
 * `useWaitersQuery` uses.
 */
export function useRolesQuery(enabled = true) {
  return useQuery({
    queryKey: rolesQueryKey,
    queryFn: ({ signal }) => fetchRoles(signal),
    enabled,
    retry: (failureCount, error) =>
      isSgebNetworkError(error) && failureCount < MAX_NETWORK_RETRIES,
  })
}
