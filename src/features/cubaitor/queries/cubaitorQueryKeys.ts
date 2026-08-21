/** Deterministic TanStack Query keys for the global Cubaitor device fleet. Namespaced under `['cubaitor', ...]` — distinct from `['eventos', 'cubaitor', ...]`, the event-scoped domain in `features/events/cubaitor/queries/eventCubaitorQueryKeys.ts`, exactly the same split `eventDashboardQueryKeys.ts` already documents against the portfolio `['dashboard']` key. */
export const cubaitorQueryKeys = {
  all: ['cubaitor'] as const,
  list: () => [...cubaitorQueryKeys.all, 'list'] as const,
  estado: (idCubaitor: number) =>
    [...cubaitorQueryKeys.all, 'estado', idCubaitor] as const,
}
