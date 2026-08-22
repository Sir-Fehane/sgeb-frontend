import { useMutation, useQueryClient } from '@tanstack/react-query'

import { accountQueryKeys } from '@/features/account/queries/accountQueryKeys'
import {
  updateMiPerfil,
  type UpdateMiPerfilRequest,
} from '@/features/account/services/usuariosApi'

/**
 * `PUT /usuarios/me`. No retry (TanStack Query's mutation default): a lost
 * success response to a real, non-idempotent update must never be silently
 * retried — the caller owns duplicate-submit guarding, same convention as
 * `features/events/queries/useUpdateEventoMutation.ts`.
 *
 * Invalidates `accountQueryKeys.miPerfil()` so the page reflects the saved
 * record from a real refetch, never an optimistic guess.
 */
export function useUpdateMiPerfilMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: UpdateMiPerfilRequest) => updateMiPerfil(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountQueryKeys.miPerfil() })
    },
  })
}
