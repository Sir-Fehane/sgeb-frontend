import { skipToken, useQuery } from '@tanstack/react-query'

import { checklistsQueryKeys } from '@/features/checklists/queries/checklistsQueryKeys'
import { fetchChecklists } from '@/features/checklists/services/checklistsApi'
import { isSgebNetworkError } from '@/shared/api/sgebApiError'

const MAX_NETWORK_RETRIES = 2

/**
 * Live `GET /checklists?tipo=cierre` query — event-independent (the
 * checklist template catalog is global, same as montage's own `tipo=
 * montaje` query), but still gated on a valid `idEvento` (`skipToken` when
 * `null`) so a malformed route id never triggers any request at all,
 * matching every other query on this page. Reuses the same
 * `features/checklists` catalog `POST/GET /checklists` already exposes —
 * never a second, disconnected template-management surface (see
 * `EventClosureCleanupSection`'s own comment for why the same rule applies
 * to the exit-checklist UI as a whole).
 */
export function useClosureChecklistTemplatesQuery(idEvento: number | null) {
  return useQuery({
    queryKey: checklistsQueryKeys.list('cierre'),
    queryFn:
      idEvento === null
        ? skipToken
        : ({ signal }) => fetchChecklists({ tipo: 'cierre' }, signal),
    retry: (failureCount, error) =>
      isSgebNetworkError(error) && failureCount < MAX_NETWORK_RETRIES,
  })
}
