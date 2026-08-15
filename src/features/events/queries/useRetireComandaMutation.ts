import { useMutation, useQueryClient } from '@tanstack/react-query'

import { comandaQueryKeys } from '@/features/events/queries/comandaQueryKeys'
import { retireComanda } from '@/features/events/services/comandaApi'

/**
 * `DELETE /eventos/{id_evento}/comanda` — soft-retire. On success,
 * invalidates only the comanda metadata query for this event so the
 * section refetches into its empty state (the real backend returns
 * `data: null` and clears `evento.comanda_url`, per
 * `services/comandaApi.ts`'s `retireComanda`). Not retried on failure,
 * same convention as `useUploadComandaMutation`/every other live mutation.
 */
export function useRetireComandaMutation(idEvento: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => retireComanda(idEvento),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: comandaQueryKeys.detail(idEvento) })
    },
  })
}
