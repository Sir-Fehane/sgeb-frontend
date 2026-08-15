import { useMutation, useQueryClient } from '@tanstack/react-query'

import { paymentsQueryKeys } from '@/features/events/payments/queries/paymentsQueryKeys'
import { calculateEventPayments } from '@/features/events/payments/services/paymentsApi'

/**
 * `POST /eventos/{id_evento}/pagos/calcular`. No optimistic update: on
 * success this invalidates only the payments list for this event,
 * letting the real, name-joined rows arrive through the normal refetch —
 * same convention as every other live mutation in this codebase. Not
 * retried on failure (TanStack Query's mutation default): a lost
 * response to a real calculation could otherwise duplicate work if
 * blindly retried, even though the endpoint itself is idempotent.
 */
export function useCalculateEventPaymentsMutation(idEvento: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => calculateEventPayments(idEvento),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: paymentsQueryKeys.list(idEvento) })
    },
  })
}
