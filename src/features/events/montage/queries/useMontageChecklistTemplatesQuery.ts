import { skipToken, useQuery } from '@tanstack/react-query'

import { montageQueryKeys } from '@/features/events/montage/queries/montageQueryKeys'
import { fetchMontageChecklistTemplates } from '@/features/events/montage/services/montageApi'
import { isSgebNetworkError } from '@/shared/api/sgebApiError'

const MAX_NETWORK_RETRIES = 2

/**
 * Live `GET /checklists?tipo=montaje` query — event-independent (see
 * `montageQueryKeys.checklistTemplates`), but still gated on a valid
 * `idEvento` (`skipToken` when `null`) so a malformed route id never
 * triggers any request at all, matching every other query on this page.
 */
export function useMontageChecklistTemplatesQuery(idEvento: number | null) {
  return useQuery({
    queryKey: montageQueryKeys.checklistTemplates(),
    queryFn:
      idEvento === null
        ? skipToken
        : ({ signal }) => fetchMontageChecklistTemplates(signal),
    retry: (failureCount, error) =>
      isSgebNetworkError(error) && failureCount < MAX_NETWORK_RETRIES,
  })
}
