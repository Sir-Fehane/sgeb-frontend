import { useMutation, useQueryClient } from '@tanstack/react-query'

import { eventsQueryKeys } from '@/features/events/queries/eventsQueryKeys'
import {
  updateEvento,
  type UpdateEventoRequest,
} from '@/features/events/services/eventsApi'

/**
 * `PUT /eventos/{id}`. No retry (TanStack Query's mutation default): a
 * lost success response to a real, non-idempotent update must never be
 * silently retried — the caller owns duplicate-submit guarding via a ref,
 * same pattern as this feature's other page-level mutations
 * (`EventClosurePage`'s `isSubmittingRef`).
 *
 * Invalidates `eventsQueryKeys.detail(idEvento)` (Event Detail renders
 * every editable field) and `eventsQueryKeys.lists()` (the events list
 * renders `titulo`/`tipo`) — the same two targets
 * `useFinalizeEventoMutation` already invalidates for its own state
 * change.
 */
export function useUpdateEventoMutation(idEvento: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: UpdateEventoRequest) => updateEvento(idEvento, request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: eventsQueryKeys.detail(idEvento) })
      void queryClient.invalidateQueries({ queryKey: eventsQueryKeys.lists() })
    },
  })
}
