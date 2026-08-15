import { skipToken, useQuery } from '@tanstack/react-query'

import { paymentsQueryKeys } from '@/features/events/payments/queries/paymentsQueryKeys'
import { fetchEventPayments } from '@/features/events/payments/services/paymentsApi'
import { isSgebNetworkError } from '@/shared/api/sgebApiError'

const MAX_NETWORK_RETRIES = 2

/**
 * Live `GET /eventos/{id_evento}/pagos` query for the Payments page.
 * Mirrors `useEventClosureReadinessQuery`: `idEvento: null` (a malformed
 * route id) uses `skipToken`, and only a transport-level
 * `SgebNetworkError` is retried (bounded). A `SgebApplicationError` is
 * never retried — it is deterministic, not transient.
 */
export function useEventPaymentsQuery(idEvento: number | null) {
  return useQuery({
    queryKey: paymentsQueryKeys.list(idEvento ?? -1),
    queryFn:
      idEvento === null
        ? skipToken
        : ({ signal }) => fetchEventPayments(idEvento, signal),
    retry: (failureCount, error) =>
      isSgebNetworkError(error) && failureCount < MAX_NETWORK_RETRIES,
  })
}
