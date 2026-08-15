import { useMutation, useQueryClient } from '@tanstack/react-query'

import { comandaQueryKeys } from '@/features/events/queries/comandaQueryKeys'
import { uploadOrReplaceComanda } from '@/features/events/services/comandaApi'

/**
 * `POST /eventos/{id_evento}/comanda` — covers both the first upload and
 * every subsequent replace; the real backend has one endpoint for both
 * (`docs/decisions.md` ADR-007). No optimistic update: on success this
 * invalidates only the comanda metadata query for this event, letting the
 * real created/replaced record (with its own `id_comanda`) arrive through
 * the normal refetch — same convention as every other live mutation in
 * this codebase (`useCreateMermaReportMutation`, `useSelectParticipantMutation`,
 * ...). Not retried on failure (TanStack Query's mutation default): a lost
 * response to a real upload could otherwise duplicate it if blindly
 * retried.
 */
export function useUploadComandaMutation(idEvento: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (file: File) => uploadOrReplaceComanda(idEvento, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: comandaQueryKeys.detail(idEvento) })
    },
  })
}
