import { useMutation, useQueryClient } from '@tanstack/react-query'

import { paymentsQueryKeys } from '@/features/events/payments/queries/paymentsQueryKeys'
import {
  isPaymentFallidoRecorded,
  markPaymentFailed,
} from '@/features/events/payments/services/paymentsApi'
import type { MarkFailedRequest } from '@/features/events/payments/types/payments'

/**
 * `PATCH /pagos/{id_pago}/fallido`. Per `docs/decisions.md` and the
 * pinned backend (`CierreService.marcarFallido`), this endpoint ALWAYS
 * responds as an HTTP/business error (`SGEB-5004`) even though it has
 * already committed `estado = 'fallido'` — so the cache must be
 * invalidated on that specific error too, not only on `onSuccess` (which
 * this call never actually reaches). Any other error (network failure,
 * an already-`pagado` `SGEB-4011` conflict, a validator error) is a real
 * failure and does not trigger invalidation — there is nothing new to
 * refetch. Never retried, same as every other live mutation.
 */
export function useMarkPaymentFailedMutation(idEvento: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ idPago, motivo }: MarkFailedRequest) =>
      markPaymentFailed(idPago, motivo),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: paymentsQueryKeys.list(idEvento) })
    },
    onError: (error) => {
      if (isPaymentFallidoRecorded(error)) {
        void queryClient.invalidateQueries({ queryKey: paymentsQueryKeys.list(idEvento) })
      }
    },
  })
}
