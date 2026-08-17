import { useMutation, useQueryClient } from '@tanstack/react-query'

import { mesasQueryKeys } from '@/features/events/queries/mesasQueryKeys'
import { createMesa, type CreateMesaRequest } from '@/features/events/services/mesasApi'

/**
 * `POST /eventos/{id}/mesas`. No retry (TanStack Query's mutation
 * default): a lost success response to a real, non-idempotent creation
 * must never be silently retried — the caller owns duplicate-submit
 * guarding via a ref, same pattern as this feature's other page-level
 * mutations.
 *
 * Invalidates `mesasQueryKeys.list(idEvento)` only — a new Mesa row does
 * not change `Evento.num_mesas` (that field is a separate, planned-count
 * value set at creation, not derived from real Mesa rows; see
 * `mesasApi.ts`'s own comment), so Event Detail's `eventsQueryKeys.detail`
 * cache has nothing to invalidate here.
 */
export function useCreateMesaMutation(idEvento: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: CreateMesaRequest) => createMesa(idEvento, request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: mesasQueryKeys.list(idEvento) })
    },
  })
}
