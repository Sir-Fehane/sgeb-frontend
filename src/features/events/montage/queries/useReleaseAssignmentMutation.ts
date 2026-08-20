import { useMutation, useQueryClient } from '@tanstack/react-query'

import { montageQueryKeys } from '@/features/events/montage/queries/montageQueryKeys'
import type { ReleaseAssignmentRequest } from '@/features/events/montage/types/montage'
import { asignacionesQueryKeys } from '@/features/events/queries/asignacionesQueryKeys'
import { mesasQueryKeys } from '@/features/events/queries/mesasQueryKeys'
import { releaseAssignment } from '@/features/events/services/asignacionesApi'

/**
 * `DELETE /asignaciones/{id}`. No optimistic update, same shape as
 * `useSelectParticipantMutation`/`useAssignTableMutation`. On success it
 * invalidates the assignment readback, the mesas list (`Mesa.estado`
 * returns to `'libre'` server-side), and the roster — the last one is
 * mostly a no-op today, since `liberarMesa` never touches
 * `Participacion.estado` (see `types/montage.ts`'s module comment), but
 * keeping it invalidated costs nothing and stays correct if that backend
 * behavior ever changes.
 */
export function useReleaseAssignmentMutation(idEvento: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ idAsignacion }: ReleaseAssignmentRequest) =>
      releaseAssignment(idAsignacion),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: asignacionesQueryKeys.list(idEvento),
      })
      void queryClient.invalidateQueries({ queryKey: mesasQueryKeys.list(idEvento) })
      void queryClient.invalidateQueries({
        queryKey: montageQueryKeys.participants(idEvento),
      })
    },
  })
}
