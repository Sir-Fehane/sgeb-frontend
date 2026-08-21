/**
 * Deterministic TanStack Query keys for the event-scoped bar/Cubaitor
 * surface. Namespaced under `['eventos', 'cubaitor', ...]` — distinct from
 * the GLOBAL `['menu', ...]` (`features/menu`) and `['cubaitor', ...]`
 * (`features/cubaitor`) domains; never key global catalog data by event, and
 * never key this event-scoped data globally (task §21).
 */
export const eventCubaitorQueryKeys = {
  all: ['eventos', 'cubaitor'] as const,
  ordenes: (idEvento: number) =>
    [...eventCubaitorQueryKeys.all, 'ordenes', idEvento] as const,
  orden: (idOrden: number) => [...eventCubaitorQueryKeys.all, 'orden', idOrden] as const,
  config: (idEvento: number) =>
    [...eventCubaitorQueryKeys.all, 'config', idEvento] as const,
  alertas: (idEvento: number) =>
    [...eventCubaitorQueryKeys.all, 'alertas', idEvento] as const,
}
