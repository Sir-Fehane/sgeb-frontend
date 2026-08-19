import { skipToken, useQueries } from '@tanstack/react-query'

import { salonesQueryKeys } from '@/features/events/queries/salonesQueryKeys'
import { fetchSalonById } from '@/features/events/services/salonesApi'
import { isSgebNetworkError } from '@/shared/api/sgebApiError'

const MAX_NETWORK_RETRIES = 2

/**
 * Resolves real salón names for the `/eventos` list — one
 * `GET /salones/{id_salon}` per DISTINCT `idSalon` already present in the
 * loaded events, fanned out in parallel (same `useQueries` pattern as
 * `useMontageChecklistInstanciaQueries`, since the pinned backend has no
 * bulk "salones by ids" endpoint). Every query uses the exact same
 * `salonesQueryKeys.detail(idSalon)` key `useSalonQuery` (Event Detail)
 * already uses, so the cache is shared across both: a salón already
 * resolved from Event Detail is never re-fetched here, and vice versa, and
 * two events sharing a salón only ever cost one request.
 *
 * `enabled: false` (the caller passes it for any session that is not
 * `capitan`/`admin`) uses `skipToken` for every entry — mirrors
 * `useSalonQuery`'s own gating: the pinned backend restricts
 * `GET /salones/{id_salon}` to that role pair, so a `mesero` session would
 * only ever get `SGEB-1004` here. The caller never asks in the first
 * place. Returns one `UseQueryResult` per input id, in the same order as
 * `idSalones`, so the caller can zip them back onto that array by index.
 */
export function useEventListSalonesQuery(idSalones: readonly number[], enabled: boolean) {
  return useQueries({
    queries: idSalones.map((idSalon) => ({
      queryKey: salonesQueryKeys.detail(idSalon),
      queryFn: enabled
        ? ({ signal }: { signal: AbortSignal }) => fetchSalonById(idSalon, signal)
        : skipToken,
      retry: (failureCount: number, error: unknown) =>
        isSgebNetworkError(error) && failureCount < MAX_NETWORK_RETRIES,
    })),
  })
}
