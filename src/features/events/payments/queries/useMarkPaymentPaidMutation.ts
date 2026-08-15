import { useMutation, useQueryClient } from '@tanstack/react-query'

import { paymentsQueryKeys } from '@/features/events/payments/queries/paymentsQueryKeys'
import { markPaymentPaid } from '@/features/events/payments/services/paymentsApi'
import type { MarkPaidRequest } from '@/features/events/payments/types/payments'

/**
 * `PATCH /pagos/{id_pago}/pagado`. No optimistic update: on success this
 * invalidates only the payments list for this event, letting the real
 * (server-normalized `referencia`, server-assigned `fecha_pago`) row
 * arrive through the normal refetch. Not retried on failure: a lost
 * response to a real payment registration must not be blindly retried —
 * the endpoint's terminal-state guard (`SGEB-4011`) exists precisely
 * because a second attempt against an already-`pagado` row is a real,
 * distinct error, not a safe no-op to paper over automatically.
 */
export function useMarkPaymentPaidMutation(idEvento: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ idPago, referencia }: MarkPaidRequest) =>
      markPaymentPaid(idPago, referencia),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: paymentsQueryKeys.list(idEvento) })
    },
  })
}
