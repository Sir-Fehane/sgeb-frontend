import { skipToken, useQuery } from '@tanstack/react-query'

import { eventCubaitorQueryKeys } from '@/features/events/cubaitor/queries/eventCubaitorQueryKeys'
import { fetchOrdenesEvento } from '@/features/events/cubaitor/services/eventCubaitorApi'
import type { OrdenEstado } from '@/features/events/cubaitor/types/eventCubaitor'
import { isSgebNetworkError } from '@/shared/api/sgebApiError'

const MAX_NETWORK_RETRIES = 2

/** `GET /eventos/{id}/ordenes` — the live "tablero de barra." `idEvento: null` (a malformed route id) uses `skipToken`, same convention as `useMontageParticipantsQuery`/`useEventDetailQuery`. */
export function useOrdenesEventoQuery(
  idEvento: number | null,
  filtros: { estado?: OrdenEstado; idMesa?: number } = {},
) {
  return useQuery({
    queryKey: eventCubaitorQueryKeys.ordenes(idEvento ?? -1),
    queryFn:
      idEvento === null
        ? skipToken
        : ({ signal }) => fetchOrdenesEvento(idEvento, filtros, signal),
    retry: (failureCount, error) =>
      isSgebNetworkError(error) && failureCount < MAX_NETWORK_RETRIES,
  })
}
