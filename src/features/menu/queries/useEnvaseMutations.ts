import { useMutation, useQueryClient } from '@tanstack/react-query'

import { menuQueryKeys } from '@/features/menu/queries/menuQueryKeys'
import {
  createEnvase,
  deactivateEnvase,
  updateEnvase,
} from '@/features/menu/services/menuApi'
import type { CreateEnvaseInput, UpdateEnvaseInput } from '@/features/menu/types/menu'

export function useCreateEnvaseMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateEnvaseInput) => createEnvase(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: menuQueryKeys.envases() })
    },
  })
}

export function useUpdateEnvaseMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ idEnvase, input }: { idEnvase: number; input: UpdateEnvaseInput }) =>
      updateEnvase(idEnvase, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: menuQueryKeys.envases() })
    },
  })
}

export function useDeactivateEnvaseMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (idEnvase: number) => deactivateEnvase(idEnvase),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: menuQueryKeys.envases() })
    },
  })
}
