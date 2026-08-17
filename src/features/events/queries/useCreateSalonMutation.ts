import { useMutation, useQueryClient } from '@tanstack/react-query'

import { salonesQueryKeys } from '@/features/events/queries/salonesQueryKeys'
import {
  createSalon,
  type CreateSalonRequest,
} from '@/features/events/services/salonesApi'

/**
 * `POST /salones` — the event-creation flow's minimal "no encuentro mi
 * salón" fallback (see `EventCreateSalonForm`), not a general Salon-catalog
 * mutation. No retry (TanStack Query's mutation default): a lost success
 * response to a real, non-idempotent creation must never be silently
 * retried — the caller owns duplicate-submit guarding via
 * `mutation.isPending`, same pattern as every other mutation in this
 * feature.
 *
 * Invalidates `salonesQueryKeys.lists()` so the picker's `GET /salones`
 * refetches and the newly created salón becomes selectable.
 */
export function useCreateSalonMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: CreateSalonRequest) => createSalon(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: salonesQueryKeys.lists() })
    },
  })
}
