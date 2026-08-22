import { useQuery } from '@tanstack/react-query'

import { accountQueryKeys } from '@/features/account/queries/accountQueryKeys'
import { fetchMiPerfil } from '@/features/account/services/usuariosApi'
import { isSgebNetworkError } from '@/shared/api/sgebApiError'

const MAX_NETWORK_RETRIES = 2

/**
 * Live `GET /usuarios/me` query. Retries only a transport-level
 * `SgebNetworkError` a bounded number of times — a `SgebApplicationError` is
 * deterministic and retrying it changes nothing, same convention as
 * `features/dashboard/queries/useCaptainDashboardQuery.ts`.
 */
export function useMiPerfilQuery() {
  return useQuery({
    queryKey: accountQueryKeys.miPerfil(),
    queryFn: ({ signal }) => fetchMiPerfil(signal),
    retry: (failureCount, error) =>
      isSgebNetworkError(error) && failureCount < MAX_NETWORK_RETRIES,
  })
}
