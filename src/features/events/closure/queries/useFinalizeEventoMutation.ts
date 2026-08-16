import { useMutation, useQueryClient } from '@tanstack/react-query'

import { closureQueryKeys } from '@/features/events/closure/queries/closureQueryKeys'
import { finalizeEvento } from '@/features/events/closure/services/closureApi'
import { eventsQueryKeys } from '@/features/events/queries/eventsQueryKeys'

/**
 * `PATCH /eventos/{id_evento}/estado` with `{ estado: 'finalizado' }` — the
 * one real state transition Closure owns (`en_curso → finalizado`,
 * confirmed against `EventoService.cambiarEstado`'s `TRANSICIONES` map).
 * Terminal and irreversible through the current backend state machine: no
 * rollback/reopen exists, so this mutation never optimistically writes
 * `finalizado` anywhere — every consumer (this screen's readiness section,
 * Event Detail, the events list) only ever learns the new state through its
 * own authoritative refetch, triggered here by invalidation.
 *
 * Invalidates:
 * - `closureQueryKeys.readiness(idEvento)` — `evento_finalizado`/`listo`
 *   are computed fresh server-side on every read
 *   (`CierreService.verificarCierre`), so Payments (which reads this same
 *   key directly — see `useMarkParticipantSalidaMutation`'s own comment)
 *   picks up the change automatically, with no Payments-side code needed.
 * - `eventsQueryKeys.detail(idEvento)` — Event Detail renders `estado`.
 * - `eventsQueryKeys.lists()` — the events list filters/displays by
 *   `estado`; no narrower existing helper exists, so every cached filter
 *   combination refetches.
 *
 * No retry (TanStack Query's mutation default): a lost success response to
 * a real, non-idempotent state transition must never be silently retried.
 * The caller owns duplicate-submit guarding via `mutation.isPending`.
 */
export function useFinalizeEventoMutation(idEvento: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => finalizeEvento(idEvento),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: closureQueryKeys.readiness(idEvento),
      })
      void queryClient.invalidateQueries({ queryKey: eventsQueryKeys.detail(idEvento) })
      void queryClient.invalidateQueries({ queryKey: eventsQueryKeys.lists() })
    },
  })
}
