import { skipToken, useQuery } from '@tanstack/react-query'

import { closureQueryKeys } from '@/features/events/closure/queries/closureQueryKeys'
import { fetchClosureReadiness } from '@/features/events/closure/services/closureApi'
import { isSgebNetworkError } from '@/shared/api/sgebApiError'

const MAX_NETWORK_RETRIES = 2

/**
 * Live `GET /eventos/{id_evento}/cierre` query for the Closure page.
 * Mirrors `useEventDetailQuery`/`useMontageParticipantsQuery`: `idEvento:
 * null` (a malformed route id) uses `skipToken`, and only a
 * transport-level `SgebNetworkError` is retried (bounded). `SGEB-3001`
 * (event not found) is a `SgebApplicationError` and is therefore never
 * retried — it is deterministic, not transient.
 */
export function useEventClosureReadinessQuery(idEvento: number | null) {
  return useQuery({
    queryKey: closureQueryKeys.readiness(idEvento ?? -1),
    queryFn:
      idEvento === null
        ? skipToken
        : ({ signal }) => fetchClosureReadiness(idEvento, signal),
    retry: (failureCount, error) =>
      isSgebNetworkError(error) && failureCount < MAX_NETWORK_RETRIES,
  })
}
