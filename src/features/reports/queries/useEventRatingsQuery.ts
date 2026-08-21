import { skipToken, useQuery } from '@tanstack/react-query'

import { reportsQueryKeys } from '@/features/reports/queries/reportsQueryKeys'
import { fetchEventRatings } from '@/features/reports/services/reportsApi'
import { isSgebNetworkError } from '@/shared/api/sgebApiError'

const MAX_NETWORK_RETRIES = 2

/**
 * Live `GET /eventos/{id}/calificaciones` query. Uses `skipToken` both
 * when `idEvento` is `null` (nothing selected in the event picker yet —
 * same convention as `useEventClosureReadinessQuery`) and when `enabled`
 * is `false` — `ReportsPage` passes `false` for a `mesero` session, since
 * this endpoint is capitán/admin only server-side
 * (`ComensalController.listarCalificaciones`) and would otherwise always
 * fail with `SGEB-1004` for that role.
 */
export function useEventRatingsQuery(
  idEvento: number | null,
  soloBajas: boolean,
  enabled: boolean,
) {
  return useQuery({
    queryKey: reportsQueryKeys.ratings(idEvento ?? -1, soloBajas),
    queryFn:
      idEvento === null || !enabled
        ? skipToken
        : ({ signal }) => fetchEventRatings(idEvento, soloBajas, signal),
    retry: (failureCount, error) =>
      isSgebNetworkError(error) && failureCount < MAX_NETWORK_RETRIES,
  })
}
