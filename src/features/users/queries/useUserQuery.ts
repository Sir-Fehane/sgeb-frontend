import { useQuery } from '@tanstack/react-query'

import { usersQueryKeys } from '@/features/users/queries/usersQueryKeys'
import { fetchUser } from '@/features/users/services/usersApi'
import { isSgebNetworkError } from '@/shared/api/sgebApiError'

const MAX_NETWORK_RETRIES = 2

/** Live `GET /usuarios/{uuid}` query — `enabled: false` while `uuidUsuario` is `null` (no row selected yet). */
export function useUserQuery(uuidUsuario: string | null) {
  return useQuery({
    queryKey: usersQueryKeys.detail(uuidUsuario ?? ''),
    queryFn: ({ signal }) => fetchUser(uuidUsuario!, signal),
    enabled: uuidUsuario !== null,
    retry: (failureCount, error) =>
      isSgebNetworkError(error) && failureCount < MAX_NETWORK_RETRIES,
  })
}
