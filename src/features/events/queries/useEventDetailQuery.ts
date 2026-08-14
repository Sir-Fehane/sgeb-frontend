import { skipToken, useQuery } from '@tanstack/react-query'

import { eventsQueryKeys } from '@/features/events/queries/eventsQueryKeys'
import { fetchEventoDetalle } from '@/features/events/services/eventsApi'
import { isSgebNetworkError } from '@/shared/api/sgebApiError'

const MAX_NETWORK_RETRIES = 2

/**
 * Live `GET /eventos/{id}` query for the Event Detail page.
 *
 * `idEvento: null` (a malformed route id, per `parseEventId`) uses
 * TanStack Query's `skipToken` — the query never runs and no request is
 * ever sent for an id that already failed client-side validation. The
 * page does not read this query's `isPending` while `idEvento` is `null`
 * (a skipped query stays `pending` forever, which would otherwise show an
 * infinite loading skeleton for a malformed id instead of the existing
 * "not found" state) — see `EventDetailPage`.
 *
 * Retries only a transport-level `SgebNetworkError`, bounded, same as
 * `useEventsListQuery`. `SGEB-3001` (not found) is a `SgebApplicationError`
 * and is therefore never retried — it is deterministic, not transient.
 */
export function useEventDetailQuery(idEvento: number | null) {
  return useQuery({
    queryKey: eventsQueryKeys.detail(idEvento ?? -1),
    queryFn:
      idEvento === null
        ? skipToken
        : ({ signal }) => fetchEventoDetalle(idEvento, signal),
    retry: (failureCount, error) =>
      isSgebNetworkError(error) && failureCount < MAX_NETWORK_RETRIES,
  })
}
