import { useQuery } from '@tanstack/react-query'

import { salonesQueryKeys } from '@/features/events/queries/salonesQueryKeys'
import { fetchSalones } from '@/features/events/services/salonesApi'
import { isSgebNetworkError } from '@/shared/api/sgebApiError'

const MAX_NETWORK_RETRIES = 2

/**
 * Live `GET /salones?activo=true` query for the event-creation salón
 * picker. Always active-only — see `SalonesListParams`'s own comment.
 * Retries only a transport-level `SgebNetworkError`, bounded, same pattern
 * as `useEventsListQuery`/`useEventDetailQuery`.
 */
export function useSalonesQuery() {
  return useQuery({
    queryKey: salonesQueryKeys.list({ activo: true }),
    queryFn: ({ signal }) => fetchSalones({ activo: true }, signal),
    retry: (failureCount, error) =>
      isSgebNetworkError(error) && failureCount < MAX_NETWORK_RETRIES,
  })
}
