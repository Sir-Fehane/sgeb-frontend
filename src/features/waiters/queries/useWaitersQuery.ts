import { useQuery } from '@tanstack/react-query'

import { waitersQueryKeys } from '@/features/waiters/queries/waitersQueryKeys'
import {
  fetchWaiters,
  type WaitersListParams,
} from '@/features/waiters/services/waitersApi'
import type { WaitersFilterState } from '@/features/waiters/types/waiter'
import { isSgebNetworkError } from '@/shared/api/sgebApiError'

const MAX_NETWORK_RETRIES = 2

function toListParams(filters: WaitersFilterState): WaitersListParams {
  return {
    ...(filters.estadoCuenta !== 'todos'
      ? { activo: filters.estadoCuenta === 'activo' }
      : {}),
    ...(filters.search.trim() ? { q: filters.search.trim() } : {}),
  }
}

/**
 * Live `GET /usuarios?rol=mesero` query — filters resolve to real server
 * query params (see `toListParams`), so two filter states that resolve to
 * the same request share one cache entry, mirrors
 * `features/events/queries/useEventsListQuery.ts`.
 *
 * `enabled` defaults to `true` since `ReportsPage` fetches it
 * unconditionally (cross-event waiter performance, unrelated to this
 * screen); `WaitersPage` passes its own `canView` role gate explicitly,
 * same pattern `useRolesQuery`/`useInvitationsQuery` use — a `mesero`
 * session never fires this request from `/meseros`, even though this
 * frontend's `mesero` role never uses this web console at all (native iOS
 * app, docs/FrontendArchitecture.md §2/§10.3).
 */
export function useWaitersQuery(filters: WaitersFilterState, enabled = true) {
  const params = toListParams(filters)

  return useQuery({
    queryKey: waitersQueryKeys.list(params),
    queryFn: ({ signal }) => fetchWaiters(params, signal),
    enabled,
    retry: (failureCount, error) =>
      isSgebNetworkError(error) && failureCount < MAX_NETWORK_RETRIES,
  })
}
