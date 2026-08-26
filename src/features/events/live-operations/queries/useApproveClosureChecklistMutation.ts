import { useMutation, useQueryClient } from '@tanstack/react-query'

import { montageQueryKeys } from '@/features/events/montage/queries/montageQueryKeys'
import { approveChecklistInstancia } from '@/features/events/montage/services/montageApi'
import type { ApproveClosureChecklistRequest } from '@/features/events/live-operations/types/liveOperations'

/**
 * `PATCH /checklist-instancias/{id}/aprobar`, reused as-is from montage's
 * service. On success, invalidates `montageQueryKeys.checklistInstancias
 * (idParticipacion)` — the same key `useMontageChecklistInstanciaQueries`
 * (this feature's own checklist read, shared with montage at the API
 * layer) flows through, so the next render picks up the pinned backend's
 * now-persisted `checklist_instancia.aprobado_en` for this instance.
 *
 * Unlike montage's own `useApproveChecklistMutation`, this does NOT
 * invalidate the roster (`montageQueryKeys.participants`): approving a
 * `cierre` template never touches `Participacion.checklist_ok` — that side
 * effect stays `tipo === 'montaje'`-only (`checklist_service.ts`'s
 * `aprobar`) — so there is nothing roster-level for a refetch to pick up
 * here.
 *
 * Takes `{ idParticipacion, idChecklistInstancia }` rather than a bare
 * instance id specifically so `idParticipacion` is available for the
 * invalidation above without threading it through separately — the caller
 * (`EventLiveOperationsPage`) already has both from
 * `ApproveClosureChecklistRequest`.
 */
export function useApproveClosureChecklistMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ idChecklistInstancia }: ApproveClosureChecklistRequest) =>
      approveChecklistInstancia(idChecklistInstancia),
    onSuccess: (_data, { idParticipacion }) => {
      void queryClient.invalidateQueries({
        queryKey: montageQueryKeys.checklistInstancias(idParticipacion),
      })
    },
  })
}
