import { useMutation, useQueryClient } from '@tanstack/react-query'

import { montageQueryKeys } from '@/features/events/montage/queries/montageQueryKeys'
import { instantiateChecklist } from '@/features/events/montage/services/montageApi'
import type { InstantiateChecklistRequest } from '@/features/events/montage/types/montage'

/**
 * `POST /participaciones/{id}/checklist-instancias`. On success, invalidates
 * only this participant's checklist-instancias query — the new instance
 * starts `completado: false`, so it never touches `Participacion.checklist_ok`
 * and the roster query does not need to be refetched (unlike
 * `useApproveChecklistMutation`).
 */
export function useInstantiateChecklistMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ idParticipacion, idChecklist }: InstantiateChecklistRequest) =>
      instantiateChecklist(idParticipacion, idChecklist),
    onSuccess: (_data, { idParticipacion }) => {
      void queryClient.invalidateQueries({
        queryKey: montageQueryKeys.checklistInstancias(idParticipacion),
      })
    },
  })
}
