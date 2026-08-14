import { skipToken, useQuery } from '@tanstack/react-query'

import { montageQueryKeys } from '@/features/events/montage/queries/montageQueryKeys'
import { fetchMontageParticipants } from '@/features/events/montage/services/montageApi'
import { isSgebNetworkError } from '@/shared/api/sgebApiError'

const MAX_NETWORK_RETRIES = 2

/**
 * Live `GET /eventos/{id_evento}/participaciones` query for the Montage
 * page, narrowed to `estado !== 'aparto'` inside
 * `fetchMontageParticipants`. Mirrors
 * `useTeamSelectionParticipantsQuery`/`useAttendanceParticipantsQuery`:
 * `idEvento: null` (a malformed route id) uses `skipToken`, and only a
 * transport-level `SgebNetworkError` is retried (bounded).
 */
export function useMontageParticipantsQuery(idEvento: number | null) {
  return useQuery({
    queryKey: montageQueryKeys.participants(idEvento ?? -1),
    queryFn:
      idEvento === null
        ? skipToken
        : ({ signal }) => fetchMontageParticipants(idEvento, signal),
    retry: (failureCount, error) =>
      isSgebNetworkError(error) && failureCount < MAX_NETWORK_RETRIES,
  })
}
