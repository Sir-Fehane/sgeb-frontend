import { useMutation, useQueryClient } from '@tanstack/react-query'

import { montageQueryKeys } from '@/features/events/montage/queries/montageQueryKeys'
import { approveChecklistInstancia } from '@/features/events/montage/services/montageApi'

/**
 * `PATCH /checklist-instancias/{id}/aprobar`. No optimistic update: the
 * mutation's only real effect (`Participacion.checklist_ok`) lives on the
 * roster, not on the checklist instance itself (ADR-010,
 * `types/montage.ts`'s module comment) — so on success this invalidates
 * only the roster query for this event, letting the real `checklist_ok`
 * value arrive through a normal refetch. Per-participant pending/error UI
 * is driven by the caller passing
 * `mutate(idChecklistInstancia, { onSuccess, onError })` per call, keyed
 * by `idParticipacion` — mirrors `useSelectParticipantMutation`.
 */
export function useApproveChecklistMutation(idEvento: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (idChecklistInstancia: number) =>
      approveChecklistInstancia(idChecklistInstancia),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: montageQueryKeys.participants(idEvento),
      })
    },
  })
}
