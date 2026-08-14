/**
 * Deterministic TanStack Query keys for the Team Selection roster.
 * `'participaciones'` never collides with the root `events` feature's own
 * `eventsQueryKeys` (`'lista'`/`'detalle'`) — distinct literal at the same
 * array position, and this feature's cache is entirely independent of it.
 */
export const teamSelectionQueryKeys = {
  all: ['eventos', 'participaciones'] as const,
  list: (idEvento: number) => [...teamSelectionQueryKeys.all, idEvento] as const,
}
