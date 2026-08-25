import { useQuery } from '@tanstack/react-query'

import { usersQueryKeys } from '@/features/users/queries/usersQueryKeys'
import { fetchUsers, toUsersListParams } from '@/features/users/services/usersApi'
import type { UsersFilterState } from '@/features/users/types/user'
import { isSgebNetworkError } from '@/shared/api/sgebApiError'

const MAX_NETWORK_RETRIES = 2

/**
 * Live `GET /usuarios` query — filters resolve to real server query params
 * (see `toUsersListParams`), so two filter states that resolve to the same
 * request share one cache entry, mirrors `features/waiters/queries/useWaitersQuery.ts`.
 *
 * `enabled` is the caller's UX-only role gate (`UsersPage`, same pattern
 * `useAuditLogQuery`'s `enabled: canView` already uses) — a non-admin
 * session (product-scoped out of "Usuarios," see `nav-items.ts`) never
 * even fires the request, even though the backend's own
 * `middleware.rol(['capitan', 'admin'])` would still permit it.
 */
export function useUsersQuery(filters: UsersFilterState, enabled: boolean) {
  const params = toUsersListParams(filters)

  return useQuery({
    queryKey: usersQueryKeys.list(params),
    queryFn: ({ signal }) => fetchUsers(params, signal),
    enabled,
    retry: (failureCount, error) =>
      isSgebNetworkError(error) && failureCount < MAX_NETWORK_RETRIES,
  })
}
