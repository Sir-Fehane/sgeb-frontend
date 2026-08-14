import { useQueries } from '@tanstack/react-query'

import { montageQueryKeys } from '@/features/events/montage/queries/montageQueryKeys'
import { fetchChecklistInstancias } from '@/features/events/montage/services/montageApi'
import { isSgebNetworkError } from '@/shared/api/sgebApiError'

const MAX_NETWORK_RETRIES = 2

/**
 * Fans out `GET /participaciones/{id}/checklist-instancias` — one request
 * per roster participant, in parallel — since the backend has no
 * event-wide "all checklist instances" endpoint (checklist instances are
 * scoped to a single participación; see `types/montage.ts`'s module
 * comment). Returns an array of `UseQueryResult`s in the same order as
 * `participationIds`, so callers can zip them back onto the roster by
 * index.
 */
export function useMontageChecklistInstanciaQueries(participationIds: readonly number[]) {
  return useQueries({
    queries: participationIds.map((idParticipacion) => ({
      queryKey: montageQueryKeys.checklistInstancias(idParticipacion),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        fetchChecklistInstancias(idParticipacion, signal),
      retry: (failureCount: number, error: unknown) =>
        isSgebNetworkError(error) && failureCount < MAX_NETWORK_RETRIES,
    })),
  })
}
