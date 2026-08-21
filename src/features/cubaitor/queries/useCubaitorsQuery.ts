import { useQuery } from '@tanstack/react-query'

import { cubaitorQueryKeys } from '@/features/cubaitor/queries/cubaitorQueryKeys'
import { fetchCubaitors } from '@/features/cubaitor/services/cubaitorApi'
import { isSgebNetworkError } from '@/shared/api/sgebApiError'

const MAX_NETWORK_RETRIES = 2

export function useCubaitorsQuery() {
  return useQuery({
    queryKey: cubaitorQueryKeys.list(),
    queryFn: ({ signal }) => fetchCubaitors(signal),
    retry: (failureCount, error) =>
      isSgebNetworkError(error) && failureCount < MAX_NETWORK_RETRIES,
  })
}
