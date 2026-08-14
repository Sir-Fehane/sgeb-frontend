import { useQuery } from '@tanstack/react-query'

import { eventsQueryKeys } from '@/features/events/queries/eventsQueryKeys'
import { fetchEventos, type EventsListParams } from '@/features/events/services/eventsApi'
import type { EventsFilterState } from '@/features/events/types/event'
import { isSgebNetworkError } from '@/shared/api/sgebApiError'

const MAX_NETWORK_RETRIES = 2

/**
 * Narrows the full local filter state down to the params the backend
 * actually honors (see `eventsApi.ts`'s `EventsListParams` comment).
 * `idSalon` is never sent — the pinned backend has no server-side salón
 * filter for `GET /eventos`.
 */
function toListParams(filters: EventsFilterState): EventsListParams {
  return {
    ...(filters.estado !== 'todos' ? { estado: filters.estado } : {}),
    ...(filters.fechaDesde ? { fechaDesde: filters.fechaDesde } : {}),
    ...(filters.fechaHasta ? { fechaHasta: filters.fechaHasta } : {}),
  }
}

/**
 * Live `GET /eventos` query for the events list. `AbortSignal` propagates
 * to the SGEB transport automatically — TanStack Query supplies it, and
 * `fetchEventos` forwards it unchanged.
 *
 * Retries only a transport-level `SgebNetworkError` a bounded number of
 * times; a `SgebApplicationError` (a normalized `result.code`) is
 * deterministic and retrying it changes nothing, per
 * docs/FrontendArchitecture.md §16.
 */
export function useEventsListQuery(filters: EventsFilterState) {
  const params = toListParams(filters)

  return useQuery({
    queryKey: eventsQueryKeys.list(params),
    queryFn: ({ signal }) => fetchEventos(params, signal),
    retry: (failureCount, error) =>
      isSgebNetworkError(error) && failureCount < MAX_NETWORK_RETRIES,
  })
}
