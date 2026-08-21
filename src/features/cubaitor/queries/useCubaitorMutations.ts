import { useMutation, useQueryClient } from '@tanstack/react-query'

import { cubaitorQueryKeys } from '@/features/cubaitor/queries/cubaitorQueryKeys'
import {
  createCubaitor,
  deactivateCubaitor,
  updateCubaitor,
} from '@/features/cubaitor/services/cubaitorApi'
import type {
  CreateCubaitorInput,
  UpdateCubaitorInput,
} from '@/features/cubaitor/types/cubaitor'

export function useCreateCubaitorMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCubaitorInput) => createCubaitor(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cubaitorQueryKeys.list() })
    },
  })
}

export function useUpdateCubaitorMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      idCubaitor,
      input,
    }: {
      idCubaitor: number
      input: UpdateCubaitorInput
    }) => updateCubaitor(idCubaitor, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cubaitorQueryKeys.list() })
    },
  })
}

export function useDeactivateCubaitorMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (idCubaitor: number) => deactivateCubaitor(idCubaitor),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cubaitorQueryKeys.list() })
    },
  })
}
