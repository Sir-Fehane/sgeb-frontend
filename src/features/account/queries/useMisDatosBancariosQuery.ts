import { useQuery } from '@tanstack/react-query'

import { accountQueryKeys } from '@/features/account/queries/accountQueryKeys'
import {
  fetchMisDatosBancarios,
  isDatosBancariosNoRegistradosError,
} from '@/features/account/services/usuariosApi'
import { isSgebNetworkError } from '@/shared/api/sgebApiError'

const MAX_NETWORK_RETRIES = 2

/**
 * Live `GET /usuarios/me/datos-bancarios` query. Retries only a
 * transport-level `SgebNetworkError`, same convention as
 * `useMiPerfilQuery` — and never the `SGEB-3001` "not registered yet"
 * outcome, which is expected and deterministic, not a transient failure.
 * The caller checks `isDatosBancariosNoRegistradosError(query.error)` to
 * render the registration form instead of a generic error state.
 *
 * `enabled` is the caller's UX-only role gate (`ProfilePage`, same pattern
 * `useAuditLogQuery`'s `enabled: canView` already uses) — only `mesero`
 * payouts depend on this data, so a non-mesero session never even fires
 * the request. The backend route itself has no role restriction; this
 * never substitutes for that.
 */
export function useMisDatosBancariosQuery(enabled: boolean) {
  return useQuery({
    queryKey: accountQueryKeys.misDatosBancarios(),
    queryFn: ({ signal }) => fetchMisDatosBancarios(signal),
    enabled,
    retry: (failureCount, error) =>
      !isDatosBancariosNoRegistradosError(error) &&
      isSgebNetworkError(error) &&
      failureCount < MAX_NETWORK_RETRIES,
  })
}
