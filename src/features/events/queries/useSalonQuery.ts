import { skipToken, useQuery } from '@tanstack/react-query'

import { salonesQueryKeys } from '@/features/events/queries/salonesQueryKeys'
import { fetchSalonById } from '@/features/events/services/salonesApi'
import { isSgebNetworkError } from '@/shared/api/sgebApiError'

const MAX_NETWORK_RETRIES = 2

/**
 * Live `GET /salones/{id_salon}` query for Event Detail's Salón field.
 * Mirrors `useEventDetailQuery`'s `skipToken` convention: `idSalon: null`
 * never sends a request. The caller (`EventDetailPage`) passes `null` both
 * while the event itself hasn't resolved yet (no `idSalon` to look up) and
 * for any session without `capitan`/`admin` access — the pinned backend
 * restricts `GET /salones/{id_salon}` to that same role pair
 * (`fetchSalonById`'s own comment), so a `mesero` session would only ever
 * get `SGEB-1004` here; the caller never asks in the first place rather
 * than firing a request known to fail.
 *
 * Retries only a transport-level `SgebNetworkError`, bounded, same as
 * every other live query in this feature — never retries the permission
 * error, which is deterministic, not transient.
 */
export function useSalonQuery(idSalon: number | null) {
  return useQuery({
    queryKey: salonesQueryKeys.detail(idSalon ?? -1),
    queryFn:
      idSalon === null ? skipToken : ({ signal }) => fetchSalonById(idSalon, signal),
    retry: (failureCount, error) =>
      isSgebNetworkError(error) && failureCount < MAX_NETWORK_RETRIES,
  })
}
