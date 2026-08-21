import { useQuery } from '@tanstack/react-query'

import { menuQueryKeys } from '@/features/menu/queries/menuQueryKeys'
import { fetchEnvases } from '@/features/menu/services/menuApi'
import { isSgebNetworkError } from '@/shared/api/sgebApiError'

const MAX_NETWORK_RETRIES = 2

/** `GET /envases?activo=false` — same "all, not just active" convention as `useBebidasQuery`; `menu_controller.ts`'s `listarEnvases` shares the identical `activo !== 'false'` default. */
export function useEnvasesQuery() {
  return useQuery({
    queryKey: menuQueryKeys.envases(),
    queryFn: ({ signal }) => fetchEnvases({ activo: false }, signal),
    retry: (failureCount, error) =>
      isSgebNetworkError(error) && failureCount < MAX_NETWORK_RETRIES,
  })
}
