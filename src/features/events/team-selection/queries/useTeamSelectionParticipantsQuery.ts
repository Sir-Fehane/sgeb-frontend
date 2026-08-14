import { skipToken, useQuery } from '@tanstack/react-query'

import { teamSelectionQueryKeys } from '@/features/events/team-selection/queries/teamSelectionQueryKeys'
import { fetchParticipaciones } from '@/features/events/team-selection/services/teamSelectionApi'
import { isSgebNetworkError } from '@/shared/api/sgebApiError'

const MAX_NETWORK_RETRIES = 2

/**
 * Live `GET /eventos/{id_evento}/participaciones` query for the Team
 * Selection page. Mirrors `useEventDetailQuery`: `idEvento: null` (a
 * malformed route id) uses `skipToken` so no request is ever sent for an
 * id that already failed client-side validation, and only a transport-level
 * `SgebNetworkError` is retried (bounded) — the backend never returns a
 * business error for this route (an unknown event id simply yields an
 * empty roster, not `SGEB-3001`), so there is no application-error case to
 * special-case here the way `useEventDetailQuery` does.
 */
export function useTeamSelectionParticipantsQuery(idEvento: number | null) {
  return useQuery({
    queryKey: teamSelectionQueryKeys.list(idEvento ?? -1),
    queryFn:
      idEvento === null
        ? skipToken
        : ({ signal }) => fetchParticipaciones(idEvento, signal),
    retry: (failureCount, error) =>
      isSgebNetworkError(error) && failureCount < MAX_NETWORK_RETRIES,
  })
}
