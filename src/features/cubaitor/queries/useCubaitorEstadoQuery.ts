import { useQuery } from '@tanstack/react-query'

import { cubaitorQueryKeys } from '@/features/cubaitor/queries/cubaitorQueryKeys'
import { fetchCubaitorEstado } from '@/features/cubaitor/services/cubaitorApi'
import { isSgebNetworkError } from '@/shared/api/sgebApiError'

const MAX_NETWORK_RETRIES = 2

/** Live `GET /cubaitors/{id}/estado` query — one device's heartbeat-derived `enLinea`. */
export function useCubaitorEstadoQuery(idCubaitor: number) {
  return useQuery({
    queryKey: cubaitorQueryKeys.estado(idCubaitor),
    queryFn: ({ signal }) => fetchCubaitorEstado(idCubaitor, signal),
    retry: (failureCount, error) =>
      isSgebNetworkError(error) && failureCount < MAX_NETWORK_RETRIES,
  })
}
