import { useQuery } from '@tanstack/react-query'

import { menuQueryKeys } from '@/features/menu/queries/menuQueryKeys'
import { fetchBebidas } from '@/features/menu/services/menuApi'
import { isSgebNetworkError } from '@/shared/api/sgebApiError'

const MAX_NETWORK_RETRIES = 2

/** `GET /bebidas?activo=false` — fetches both active and inactive so the catalog screen can show/reactivate deactivated bebidas without a second query. */
export function useBebidasQuery() {
  return useQuery({
    queryKey: menuQueryKeys.bebidas(),
    queryFn: ({ signal }) => fetchBebidas({ activo: false }, signal),
    retry: (failureCount, error) =>
      isSgebNetworkError(error) && failureCount < MAX_NETWORK_RETRIES,
  })
}
