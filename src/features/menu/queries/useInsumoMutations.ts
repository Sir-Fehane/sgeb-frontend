import { useMutation, useQueryClient } from '@tanstack/react-query'

import { menuQueryKeys } from '@/features/menu/queries/menuQueryKeys'
import {
  createInsumo,
  deactivateInsumo,
  updateInsumo,
  updateInsumoEstado,
} from '@/features/menu/services/menuApi'
import type {
  CreateInsumoInput,
  InsumoEstado,
  UpdateInsumoInput,
} from '@/features/menu/types/menu'

export function useCreateInsumoMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateInsumoInput) => createInsumo(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: menuQueryKeys.insumos() })
    },
  })
}

export function useUpdateInsumoMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ idInsumo, input }: { idInsumo: number; input: UpdateInsumoInput }) =>
      updateInsumo(idInsumo, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: menuQueryKeys.insumos() })
    },
  })
}

/** Marking `agotado` pauses dependent orders server-side — invalidates the event-scoped order/bar query domains too would require an `idEvento`, which this global catalog screen doesn't have; realtime (`orden:cambio`/`alerta:insumo`) covers that side for any open bar screen instead. */
export function useUpdateInsumoEstadoMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ idInsumo, estado }: { idInsumo: number; estado: InsumoEstado }) =>
      updateInsumoEstado(idInsumo, estado),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: menuQueryKeys.insumos() })
    },
  })
}

export function useDeactivateInsumoMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (idInsumo: number) => deactivateInsumo(idInsumo),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: menuQueryKeys.insumos() })
    },
  })
}
