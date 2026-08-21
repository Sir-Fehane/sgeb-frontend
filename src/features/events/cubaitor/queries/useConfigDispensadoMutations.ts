import { useMutation, useQueryClient } from '@tanstack/react-query'

import { eventCubaitorQueryKeys } from '@/features/events/cubaitor/queries/eventCubaitorQueryKeys'
import {
  createConfigDispensado,
  deactivateConfigDispensado,
  recargarConfigDispensado,
  updateConfigDispensado,
} from '@/features/events/cubaitor/services/eventCubaitorApi'
import type {
  CreateConfigDispensadoInput,
  UpdateConfigDispensadoInput,
} from '@/features/events/cubaitor/types/eventCubaitor'
import { eventDashboardQueryKeys } from '@/features/events/dashboard/queries/eventDashboardQueryKeys'

function invalidateConfigDomain(
  queryClient: ReturnType<typeof useQueryClient>,
  idEvento: number,
) {
  void queryClient.invalidateQueries({
    queryKey: eventCubaitorQueryKeys.config(idEvento),
  })
  void queryClient.invalidateQueries({
    queryKey: eventCubaitorQueryKeys.alertas(idEvento),
  })
  void queryClient.invalidateQueries({
    queryKey: eventDashboardQueryKeys.detail(idEvento),
  })
}

export function useCreateConfigDispensadoMutation(idEvento: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateConfigDispensadoInput) =>
      createConfigDispensado(idEvento, input),
    onSuccess: () => invalidateConfigDomain(queryClient, idEvento),
  })
}

/** Recalibration only (`caudalMlSeg`/`pinGpio`) — see `services/eventCubaitorApi.ts`'s `updateConfigDispensado`. */
export function useUpdateConfigDispensadoMutation(idEvento: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      idConfig,
      input,
    }: {
      idConfig: number
      input: UpdateConfigDispensadoInput
    }) => updateConfigDispensado(idEvento, idConfig, input),
    onSuccess: () => invalidateConfigDomain(queryClient, idEvento),
  })
}

export function useDeactivateConfigDispensadoMutation(idEvento: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (idConfig: number) => deactivateConfigDispensado(idEvento, idConfig),
    onSuccess: () => invalidateConfigDomain(queryClient, idEvento),
  })
}

/** Recharge — replaces the physical bottle and (by default) reactivates paused orders. */
export function useRecargarConfigDispensadoMutation(idEvento: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      idConfig,
      volumenCargadoMl,
      reanudarOrdenes,
    }: {
      idConfig: number
      volumenCargadoMl: number
      reanudarOrdenes?: boolean
    }) => recargarConfigDispensado(idEvento, idConfig, volumenCargadoMl, reanudarOrdenes),
    onSuccess: () => {
      invalidateConfigDomain(queryClient, idEvento)
      void queryClient.invalidateQueries({
        queryKey: eventCubaitorQueryKeys.ordenes(idEvento),
      })
    },
  })
}
