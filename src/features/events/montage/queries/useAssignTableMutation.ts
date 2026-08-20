import { useMutation, useQueryClient } from '@tanstack/react-query'

import { montageQueryKeys } from '@/features/events/montage/queries/montageQueryKeys'
import type { AssignTableRequest } from '@/features/events/montage/types/montage'
import { asignacionesQueryKeys } from '@/features/events/queries/asignacionesQueryKeys'
import { assignTable } from '@/features/events/services/asignacionesApi'

/**
 * `POST /participaciones/{id}/asignaciones`. No optimistic update, same
 * shape as `useSelectParticipantMutation` — on success it invalidates the
 * real assignment readback plus the roster (a successful assign can flip
 * `Participacion.estado` to `'asignado'` server-side, see
 * `asignacionesApi.ts`'s own comment), letting the next render derive
 * "who has which table" from fresh server state rather than a guessed
 * local transition.
 */
export function useAssignTableMutation(idEvento: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ idParticipacion, idMesa }: AssignTableRequest) =>
      assignTable(idParticipacion, idMesa),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: asignacionesQueryKeys.list(idEvento),
      })
      void queryClient.invalidateQueries({
        queryKey: montageQueryKeys.participants(idEvento),
      })
    },
  })
}
