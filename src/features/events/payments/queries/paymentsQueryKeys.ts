/**
 * Deterministic TanStack Query keys for the Payments list. `'pagos'`
 * never collides with any other feature reading a related endpoint —
 * same reasoning as `closureQueryKeys.ts`/`teamSelectionQueryKeys.ts`.
 * Readiness (`GET /eventos/{id}/cierre`) is deliberately NOT duplicated
 * here — Payments reuses Closure's own `closureQueryKeys.readiness`,
 * since it's the same server resource.
 */
export const paymentsQueryKeys = {
  all: ['eventos', 'pagos'] as const,
  list: (idEvento: number) => [...paymentsQueryKeys.all, idEvento] as const,
}
