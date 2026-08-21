import { useMutation, useQueryClient } from '@tanstack/react-query'

import { menuQueryKeys } from '@/features/menu/queries/menuQueryKeys'
import {
  createBebida,
  deactivateBebida,
  definirReceta,
  updateBebida,
} from '@/features/menu/services/menuApi'
import type {
  CreateBebidaInput,
  RecetaIngredienteInput,
  UpdateBebidaInput,
} from '@/features/menu/types/menu'

export function useCreateBebidaMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateBebidaInput) => createBebida(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: menuQueryKeys.bebidas() })
    },
  })
}

export function useUpdateBebidaMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ idBebida, input }: { idBebida: number; input: UpdateBebidaInput }) =>
      updateBebida(idBebida, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: menuQueryKeys.bebidas() })
    },
  })
}

/** `PUT /bebidas/{id}/receta` — full replace. `EventCubaitorConfigSection` (event-scoped) reads recipes indirectly through this same global query, so a recipe edit here is visible there on next refetch without a separate event-scoped invalidation. */
export function useDefinirRecetaMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      idBebida,
      ingredientes,
    }: {
      idBebida: number
      ingredientes: readonly RecetaIngredienteInput[]
    }) => definirReceta(idBebida, ingredientes),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: menuQueryKeys.bebidas() })
    },
  })
}

export function useDeactivateBebidaMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (idBebida: number) => deactivateBebida(idBebida),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: menuQueryKeys.bebidas() })
    },
  })
}
