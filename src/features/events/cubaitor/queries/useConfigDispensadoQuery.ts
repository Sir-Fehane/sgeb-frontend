import { skipToken, useQuery } from '@tanstack/react-query'

import { eventCubaitorQueryKeys } from '@/features/events/cubaitor/queries/eventCubaitorQueryKeys'
import { fetchConfigDispensado } from '@/features/events/cubaitor/services/eventCubaitorApi'
import { isSgebNetworkError } from '@/shared/api/sgebApiError'

const MAX_NETWORK_RETRIES = 2

export function useConfigDispensadoQuery(idEvento: number | null) {
  return useQuery({
    queryKey: eventCubaitorQueryKeys.config(idEvento ?? -1),
    queryFn:
      idEvento === null
        ? skipToken
        : ({ signal }) => fetchConfigDispensado(idEvento, signal),
    retry: (failureCount, error) =>
      isSgebNetworkError(error) && failureCount < MAX_NETWORK_RETRIES,
  })
}
