import { useMutation, useQueryClient } from '@tanstack/react-query'

import { accountQueryKeys } from '@/features/account/queries/accountQueryKeys'
import {
  registrarMisDatosBancarios,
  type RegistrarMisDatosBancariosRequest,
} from '@/features/account/services/usuariosApi'

/**
 * `POST /usuarios/me/datos-bancarios`. No retry (TanStack Query's mutation
 * default): a lost success response to this non-idempotent register/replace
 * must never be silently retried, same convention as
 * `useUpdateMiPerfilMutation`.
 *
 * Invalidates `accountQueryKeys.misDatosBancarios()` so the page reflects
 * the newly-masked CLABE from a real refetch, never an optimistic guess.
 */
export function useRegistrarMisDatosBancariosMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: RegistrarMisDatosBancariosRequest) =>
      registrarMisDatosBancarios(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: accountQueryKeys.misDatosBancarios(),
      })
    },
  })
}
