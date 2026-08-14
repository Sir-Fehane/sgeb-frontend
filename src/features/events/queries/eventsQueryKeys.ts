import type { EventsListParams } from '@/features/events/services/eventsApi'

/**
 * Deterministic TanStack Query keys for the events feature. `list` takes
 * the exact server-bound filter params (not the full `EventsFilterState`)
 * so two filter states that resolve to the same request — e.g. `idSalon`
 * changing, which is not sent to the server (see `eventsApi.ts`) — share
 * one cache entry instead of refetching needlessly.
 */
export const eventsQueryKeys = {
  all: ['eventos'] as const,
  lists: () => [...eventsQueryKeys.all, 'lista'] as const,
  list: (params: EventsListParams) => [...eventsQueryKeys.lists(), params] as const,
  /** Never collides with `list()` — `'detalle'` differs from `'lista'` at the same key position. */
  detail: (idEvento: number) => [...eventsQueryKeys.all, 'detalle', idEvento] as const,
}
