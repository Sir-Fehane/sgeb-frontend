import { useMutation, useQueryClient } from '@tanstack/react-query'

import { closureQueryKeys } from '@/features/events/closure/queries/closureQueryKeys'
import {
  isExitChecklistNotReadyError,
  markParticipantSalida,
} from '@/features/events/live-operations/services/liveOperationsApi'
import { montageQueryKeys } from '@/features/events/montage/queries/montageQueryKeys'
import { teamSelectionQueryKeys } from '@/features/events/team-selection/queries/teamSelectionQueryKeys'

/**
 * `PATCH /participaciones/{id}/estado` → `salida`. No optimistic update
 * (mirrors `useSelectParticipantMutation`): on success it invalidates the
 * roster query for this event, letting the real server state (the moved
 * row, plus any concurrent change from another captain) arrive through the
 * normal refetch.
 *
 * Invalidates `teamSelectionQueryKeys.list`, NOT a Live-Operations-owned
 * key — this screen deliberately reads the roster through
 * `useTeamSelectionParticipantsQuery` (see `EventLiveOperationsPage`'s own
 * comment) rather than a second, independent cache over the identical
 * `GET /eventos/{id}/participaciones` resource. A separate Live Operations
 * cache would go stale the moment this mutation succeeds elsewhere:
 * `vinculo → salida` is a real write to the one server collection Team
 * Selection also reads, and invalidating only a Live-Operations-local key
 * would leave Team Selection's cache (and any other consumer of that same
 * key) holding a stale `vinculo` row with no trigger to refetch it.
 * Reusing the one authoritative key means every screen reading this
 * roster — today just Team Selection and this one — invalidates together.
 *
 * Also invalidates Closure's readiness query
 * (`closureQueryKeys.readiness`, imported directly rather than duplicated —
 * same cross-feature precedent `EventPaymentsPage` already established by
 * calling `useEventClosureReadinessQuery` itself instead of re-deriving
 * it): `participaciones_sin_salida`/`listo` are computed fresh from live
 * `Participacion.estado` on every read (`CierreService.verificarCierre`,
 * confirmed against the pinned backend — no cached/materialized aggregate
 * exists server-side), so this is a real, correct invalidation, not a
 * manually-recomputed guess. Payments/Event Finalization are never touched
 * here — they read Closure readiness through their own normal lifecycle.
 *
 * No retry, no per-row state here — same reasoning and division of
 * responsibility as `useSelectParticipantMutation`: the caller passes
 * `mutate(idParticipacion, { onSuccess, onError })` and owns duplicate-
 * submit guarding / row-level pending and error UI itself.
 *
 * On a `SGEB-4027` failure specifically (`isExitChecklistNotReadyError`) —
 * "salida rejected: exit checklist missing/incomplete/unapproved" — this
 * also invalidates that participant's checklist-instancia query
 * (`montageQueryKeys.checklistInstancias`, the same key
 * `LiveOperationsClosureChecklistSection`'s data flows through). The
 * frontend gate (`isClosureChecklistApprovedForSalida`) should normally
 * keep the button disabled before this call is even attempted, so a real
 * `SGEB-4027` here means the checklist state the row was rendering was
 * stale — another captain/mesero changed it after this row's last fetch.
 * Resyncing on exactly this failure, rather than leaving the row to keep
 * showing outdated "ready" state until some unrelated refetch happens,
 * is what makes the error message ("está pendiente de aprobación" etc.)
 * make sense to the captain instead of contradicting what they just saw.
 */
export function useMarkParticipantSalidaMutation(idEvento: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (idParticipacion: number) => markParticipantSalida(idParticipacion),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: teamSelectionQueryKeys.list(idEvento),
      })
      void queryClient.invalidateQueries({
        queryKey: closureQueryKeys.readiness(idEvento),
      })
    },
    onError: (error, idParticipacion) => {
      if (isExitChecklistNotReadyError(error)) {
        void queryClient.invalidateQueries({
          queryKey: montageQueryKeys.checklistInstancias(idParticipacion),
        })
      }
    },
  })
}
