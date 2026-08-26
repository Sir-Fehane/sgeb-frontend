import { useMutation, useQueryClient } from '@tanstack/react-query'

import { montageQueryKeys } from '@/features/events/montage/queries/montageQueryKeys'
import { instantiateChecklist } from '@/features/events/montage/services/montageApi'
import type { InstantiateClosureChecklistRequest } from '@/features/events/live-operations/types/liveOperations'

/**
 * `POST /participaciones/{id}/checklist-instancias`, reused as-is from
 * montage's service (the endpoint has no `tipo` restriction — only the
 * caller narrows to `cierre` templates, via
 * `useClosureChecklistTemplatesQuery`). Invalidates
 * `montageQueryKeys.checklistInstancias(idParticipacion)` — deliberately
 * the SAME key montage's own instantiate/read queries use, since it is the
 * same underlying `GET /participaciones/{id}/checklist-instancias`
 * resource: this keeps the cache coherent across both features AND means
 * `SocketProvider`'s existing `checklist:cambio` handler (which already
 * invalidates this exact key) covers this screen too, with no realtime
 * wiring changes needed here.
 */
export function useInstantiateClosureChecklistMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ idParticipacion, idChecklist }: InstantiateClosureChecklistRequest) =>
      instantiateChecklist(idParticipacion, idChecklist),
    onSuccess: (_data, { idParticipacion }) => {
      void queryClient.invalidateQueries({
        queryKey: montageQueryKeys.checklistInstancias(idParticipacion),
      })
    },
  })
}
