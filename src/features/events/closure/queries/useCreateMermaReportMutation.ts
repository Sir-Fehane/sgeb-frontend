import { useMutation, useQueryClient } from '@tanstack/react-query'

import { closureQueryKeys } from '@/features/events/closure/queries/closureQueryKeys'
import { createMermaReport } from '@/features/events/closure/services/closureApi'
import type { CreateWasteReportFormValues } from '@/features/events/closure/schemas/wasteReportSchema'

/**
 * `POST /eventos/{id_evento}/reportes-merma`. Translates the form's
 * `costo_estimado`-keyed values into the real wire request
 * (`costoEstimado`, camelCase — see `services/closureApi.ts`'s
 * `CreateMermaDetalleRequest` comment for the confirmed mismatch against
 * `openapi-sgeb.yaml`) right here, at the query-hook boundary, so neither
 * the form/schema nor the page need to know about it.
 *
 * No optimistic update: on success this invalidates only the merma-reports
 * query for this event, letting the real created report (with its real
 * `id_reporte`) arrive through the normal refetch — same convention as
 * every other live mutation in this codebase. Not retried on failure
 * (TanStack Query's mutation default): a lost response to a real create
 * could otherwise duplicate the report if blindly retried.
 */
export function useCreateMermaReportMutation(idEvento: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (values: CreateWasteReportFormValues) =>
      createMermaReport(idEvento, {
        observaciones: values.observaciones,
        detalles: values.detalles.map((detalle) => ({
          tipo: detalle.tipo,
          descripcion: detalle.descripcion,
          cantidad: detalle.cantidad,
          costoEstimado: detalle.costo_estimado,
        })),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: closureQueryKeys.mermaReports(idEvento),
      })
    },
  })
}
