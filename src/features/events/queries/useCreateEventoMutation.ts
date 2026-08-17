import { useMutation, useQueryClient } from '@tanstack/react-query'

import { eventsQueryKeys } from '@/features/events/queries/eventsQueryKeys'
import {
  createEvento,
  type CreateEventoRequest,
} from '@/features/events/services/eventsApi'

/**
 * `POST /eventos`. No retry (TanStack Query's mutation default): a lost
 * success response to a real, non-idempotent creation must never be
 * silently retried — the caller (`EventCreatePage`) owns duplicate-submit
 * guarding via `mutation.isPending`, same pattern as every other mutation
 * in this feature. No optimistic write: the events list only learns of the
 * new event through its own authoritative refetch, triggered here by
 * invalidation.
 *
 * Invalidates `eventsQueryKeys.lists()` — every cached filter combination
 * refetches, same as `useFinalizeEventoMutation`'s own list invalidation.
 * Never invalidates `eventsQueryKeys.detail(...)`: the created event has no
 * prior cache entry to invalidate, and the caller navigates straight to its
 * detail page, which fetches it fresh on mount.
 */
export function useCreateEventoMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: CreateEventoRequest) => createEvento(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: eventsQueryKeys.lists() })
    },
  })
}
