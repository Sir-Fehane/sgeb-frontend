import { useQuery } from '@tanstack/react-query'

import { menuQueryKeys } from '@/features/menu/queries/menuQueryKeys'
import { fetchInsumos } from '@/features/menu/services/menuApi'
import { isSgebNetworkError } from '@/shared/api/sgebApiError'

const MAX_NETWORK_RETRIES = 2

/** `GET /insumos`, unfiltered (both active and inactive) — the catalog screen itself filters/labels client-side so captains can find and reactivate a deactivated insumo without a second screen. */
export function useInsumosQuery() {
  return useQuery({
    queryKey: menuQueryKeys.insumos(),
    queryFn: ({ signal }) => fetchInsumos({}, signal),
    retry: (failureCount, error) =>
      isSgebNetworkError(error) && failureCount < MAX_NETWORK_RETRIES,
  })
}
