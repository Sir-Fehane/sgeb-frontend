import { useMutation, useQueryClient } from '@tanstack/react-query'

import { eventsQueryKeys } from '@/features/events/queries/eventsQueryKeys'
import { changeEventoEstado } from '@/features/events/services/eventsApi'
import type { EventStatus } from '@/features/events/types/event'

/**
 * The generic `PATCH /eventos/{id}/estado` mutation backing this feature's
 * lifecycle actions — publish, start, return-to-draft, cancel
 * (`EventDetailLifecycleSection`). Deliberately separate from Closure's own
 * `useFinalizeEventoMutation`: that hook owns exactly one transition
 * (`en_curso → finalizado`) with its own extra invalidation
 * (`closureQueryKeys.readiness`) and its own tests — merging the two would
 * mean either dragging Closure-specific invalidation into every other
 * transition or splitting it back out, for no real duplication saved
 * beyond the one-line `changeEventoEstado` call both already share (see
 * `closureApi.ts`'s `finalizeEvento`, which now delegates to that same
 * function). No retry (TanStack Query's mutation default): a lost success
 * response to a real, non-idempotent state transition must never be
 * silently retried — the caller owns duplicate-submit guarding via a ref,
 * same pattern as `EventClosurePage`'s `isFinalizingRef`.
 *
 * Invalidates `eventsQueryKeys.detail(idEvento)` and `eventsQueryKeys.lists()`
 * — Event Detail and the events list both render `estado`. Never
 * invalidates Team Selection/Attendance/Montage/Comanda/Payments/Live
 * Operations caches — none of those read `Evento.estado` directly, and
 * this branch's scope explicitly excludes touching those domains.
 */
export function useChangeEventoEstadoMutation(idEvento: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (estado: EventStatus) => changeEventoEstado(idEvento, estado),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: eventsQueryKeys.detail(idEvento) })
      void queryClient.invalidateQueries({ queryKey: eventsQueryKeys.lists() })
    },
  })
}
