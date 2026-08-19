import { useMutation, useQueryClient } from '@tanstack/react-query'

import { salonesQueryKeys } from '@/features/events/queries/salonesQueryKeys'
import {
  createSalon,
  type CreateSalonRequest,
} from '@/features/events/services/salonesApi'
import type { EventSalonOption } from '@/features/events/types/event'

/**
 * `POST /salones` — the event-creation flow's minimal "no encuentro mi
 * salón" fallback (see `EventCreateSalonForm`), not a general Salon-catalog
 * mutation. No retry (TanStack Query's mutation default): a lost success
 * response to a real, non-idempotent creation must never be silently
 * retried — the caller owns duplicate-submit guarding via
 * `mutation.isPending`, same pattern as every other mutation in this
 * feature.
 *
 * `onSuccess` writes the created salón into the cached `GET
 * /salones?activo=true` list SYNCHRONOUSLY via `setQueryData`, not just
 * `invalidateQueries` — this is a confirmed bug fix, not a style
 * preference. `EventCreatePage` sets the new salón as
 * `EventCreateForm`'s `selectedSalonId` the moment `mutateAsync` resolves,
 * and that form's own effect immediately calls RHF's `setValue('id_salon',
 * ...)` — but `setValue` on a native, uncontrolled `<select>` can only
 * actually select an `<option>` that already exists in the DOM. Relying on
 * `invalidateQueries` alone only *schedules* a background `GET /salones`
 * refetch — a real, unawaited network round trip — so in the real app
 * (unlike a test with synchronously-resolved mocks) that effect
 * consistently ran before the option existed: the `<select>` silently
 * stayed on its previous value, and a submitted event could carry the
 * WRONG `idSalon` even though the UI displayed a "creado y seleccionado"
 * confirmation. Writing the cache synchronously here guarantees the
 * `<option>` exists in the very same render pass that sets
 * `selectedSalonId`. Still also invalidates, so the list self-corrects
 * with the server's authoritative shape shortly after (e.g. if some other
 * field the server computed differs from this client-side echo).
 */
export function useCreateSalonMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: CreateSalonRequest) => createSalon(request),
    onSuccess: (salon) => {
      queryClient.setQueryData<EventSalonOption[]>(
        salonesQueryKeys.list({ activo: true }),
        (previous) => [...(previous ?? []), salon],
      )
      void queryClient.invalidateQueries({ queryKey: salonesQueryKeys.lists() })
    },
  })
}
