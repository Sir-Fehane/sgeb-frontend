import { skipToken, useQuery } from '@tanstack/react-query'

import { eventCubaitorQueryKeys } from '@/features/events/cubaitor/queries/eventCubaitorQueryKeys'
import { fetchAlertasEvento } from '@/features/events/cubaitor/services/eventCubaitorApi'
import { isSgebNetworkError } from '@/shared/api/sgebApiError'

const MAX_NETWORK_RETRIES = 2

/** `GET /eventos/{id}/alertas` — derived live server-side, no persisted lifecycle (see `types/eventCubaitor.ts`). Safe to poll/refetch freely; each read is a fresh computation, never a stale cache of a "resolved" flag. */
export function useAlertasEventoQuery(idEvento: number | null) {
  return useQuery({
    queryKey: eventCubaitorQueryKeys.alertas(idEvento ?? -1),
    queryFn:
      idEvento === null
        ? skipToken
        : ({ signal }) => fetchAlertasEvento(idEvento, signal),
    retry: (failureCount, error) =>
      isSgebNetworkError(error) && failureCount < MAX_NETWORK_RETRIES,
  })
}
