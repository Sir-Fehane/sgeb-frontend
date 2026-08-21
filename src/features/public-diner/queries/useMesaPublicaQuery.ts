import { skipToken, useQuery } from '@tanstack/react-query'

import { publicDinerQueryKeys } from '@/features/public-diner/queries/publicDinerQueryKeys'
import { fetchMesaPublica } from '@/features/public-diner/services/publicDinerApi'
import { isSgebNetworkError } from '@/shared/api/sgebApiError'

const MAX_NETWORK_RETRIES = 2

/**
 * Live `GET /publico/mesas/{codigo_qr}` query. Mirrors
 * `useEventClosureReadinessQuery`: `codigoQr: null` (the route somehow
 * matched without its required param) uses `skipToken`, and only a
 * transport-level `SgebNetworkError` is retried (bounded) — `SGEB-3003`
 * (unknown/expired QR, or event not `publicado`/`en_curso`) is a
 * `SgebApplicationError` and is therefore never retried, since retrying it
 * can never change the outcome.
 */
export function useMesaPublicaQuery(codigoQr: string | null) {
  return useQuery({
    queryKey: publicDinerQueryKeys.mesa(codigoQr ?? ''),
    queryFn:
      codigoQr === null ? skipToken : ({ signal }) => fetchMesaPublica(codigoQr, signal),
    retry: (failureCount, error) =>
      isSgebNetworkError(error) && failureCount < MAX_NETWORK_RETRIES,
  })
}
