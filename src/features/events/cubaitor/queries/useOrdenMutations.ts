import { useMutation, useQueryClient } from '@tanstack/react-query'

import { eventCubaitorQueryKeys } from '@/features/events/cubaitor/queries/eventCubaitorQueryKeys'
import {
  cambiarEstadoOrden,
  dispensarDetalle,
  reportarDispensado,
} from '@/features/events/cubaitor/services/eventCubaitorApi'
import type { OrdenEstado } from '@/features/events/cubaitor/types/eventCubaitor'
import { eventDashboardQueryKeys } from '@/features/events/dashboard/queries/eventDashboardQueryKeys'

/** `PATCH /ordenes/{id}/estado` — cancel or mark-delivered, the two captain-facing manual transitions this board exposes. Invalidates the order list/detail AND the event dashboard's `barra` summary (task §15: reuse, never duplicate that endpoint). */
export function useCambiarEstadoOrdenMutation(idEvento: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ idOrden, estado }: { idOrden: number; estado: OrdenEstado }) =>
      cambiarEstadoOrden(idOrden, estado),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: eventCubaitorQueryKeys.ordenes(idEvento),
      })
      void queryClient.invalidateQueries({
        queryKey: eventCubaitorQueryKeys.orden(variables.idOrden),
      })
      void queryClient.invalidateQueries({
        queryKey: eventDashboardQueryKeys.detail(idEvento),
      })
    },
  })
}

/** `POST /orden-detalles/{id}/dispensar` — triggers a real physical dispense. On success, invalidates orders/dashboard so the board reflects the (possibly paused, if a downstream ingredient ran short) resulting state from the server, never an optimistic guess. */
export function useDispensarMutation(idEvento: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (idDetalle: number) => dispensarDetalle(idDetalle),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: eventCubaitorQueryKeys.ordenes(idEvento),
      })
      void queryClient.invalidateQueries({
        queryKey: eventCubaitorQueryKeys.alertas(idEvento),
      })
      void queryClient.invalidateQueries({
        queryKey: eventDashboardQueryKeys.detail(idEvento),
      })
    },
  })
}

/** `PATCH /dispensados/{id}/reporte` — manual MQTT-failure fallback only, see `services/eventCubaitorApi.ts`'s `reportarDispensado`. */
export function useReportarDispensadoMutation(idEvento: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      idDispensado,
      segundosReal,
    }: {
      idDispensado: number
      segundosReal: number | null
    }) => reportarDispensado(idDispensado, segundosReal),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: eventCubaitorQueryKeys.ordenes(idEvento),
      })
      void queryClient.invalidateQueries({
        queryKey: eventDashboardQueryKeys.detail(idEvento),
      })
    },
  })
}
