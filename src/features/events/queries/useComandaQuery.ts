import { skipToken, useQuery } from '@tanstack/react-query'

import { comandaQueryKeys } from '@/features/events/queries/comandaQueryKeys'
import { fetchComandaMetadata } from '@/features/events/services/comandaApi'
import { isSgebNetworkError } from '@/shared/api/sgebApiError'

const MAX_NETWORK_RETRIES = 2

/**
 * Live `GET /eventos/{id_evento}/comanda` query for the stable metadata
 * shown by `EventDetailComandaSection` — mirrors
 * `useEventDetailQuery`/`useEventClosureReadinessQuery`: `idEvento: null`
 * (a malformed route id) uses `skipToken`, and only a transport-level
 * `SgebNetworkError` is retried (bounded). `SGEB-3001` ("no active
 * comanda") is a `SgebApplicationError` and is therefore never retried —
 * it is a deterministic, legitimate empty state, not a transient failure;
 * the caller distinguishes it with `isComandaNotFoundError`, same
 * convention as `isEventoNotFoundError`.
 *
 * The cached `data` here is `ComandaMetadataViewModel | null` — it never
 * carries the signed `url`/`expira_en` (see `services/comandaApi.ts`'s
 * `mapComandaMetadata` vs `mapComandaAccess`), so this query's cache never
 * holds a value that can go silently stale within its 15-minute window.
 */
export function useComandaQuery(idEvento: number | null) {
  return useQuery({
    queryKey: comandaQueryKeys.detail(idEvento ?? -1),
    queryFn:
      idEvento === null
        ? skipToken
        : ({ signal }) => fetchComandaMetadata(idEvento, signal),
    retry: (failureCount, error) =>
      isSgebNetworkError(error) && failureCount < MAX_NETWORK_RETRIES,
  })
}
