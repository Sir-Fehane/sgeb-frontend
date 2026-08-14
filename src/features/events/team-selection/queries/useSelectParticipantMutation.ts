import { useMutation, useQueryClient } from '@tanstack/react-query'

import { teamSelectionQueryKeys } from '@/features/events/team-selection/queries/teamSelectionQueryKeys'
import { selectParticipant } from '@/features/events/team-selection/services/teamSelectionApi'

/**
 * `PATCH /participaciones/{id}/estado` → `seleccionado`. The first live
 * mutation in this codebase — no optimistic update: on success it
 * invalidates the roster query for this event, letting the real server
 * state (the moved row, plus any concurrent change from another captain)
 * arrive through the normal refetch rather than being guessed locally.
 * Per-row pending/error UI is driven by the caller passing
 * `mutate(idParticipacion, { onSuccess, onError })` per call — this hook
 * intentionally has no opinion on row-level state.
 */
export function useSelectParticipantMutation(idEvento: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (idParticipacion: number) => selectParticipant(idParticipacion),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: teamSelectionQueryKeys.list(idEvento),
      })
    },
  })
}
