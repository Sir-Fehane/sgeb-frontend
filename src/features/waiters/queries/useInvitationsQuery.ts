import { useQuery } from '@tanstack/react-query'

import { invitationsQueryKeys } from '@/features/waiters/queries/invitationsQueryKeys'
import {
  fetchInvitations,
  type InvitationsListParams,
} from '@/features/waiters/services/invitationsApi'
import { isSgebNetworkError } from '@/shared/api/sgebApiError'

const MAX_NETWORK_RETRIES = 2

/**
 * Live `GET /usuarios/invitaciones` query. No `estado` filter applied by
 * default — the roster shows every invitation, most recent first (server
 * default order). `enabled` is the caller's UX-only role gate — same
 * `WaitersPage` gate `useWaitersQuery` uses.
 */
export function useInvitationsQuery(params: InvitationsListParams = {}, enabled = true) {
  return useQuery({
    queryKey: invitationsQueryKeys.list(params),
    queryFn: ({ signal }) => fetchInvitations(params, signal),
    enabled,
    retry: (failureCount, error) =>
      isSgebNetworkError(error) && failureCount < MAX_NETWORK_RETRIES,
  })
}
