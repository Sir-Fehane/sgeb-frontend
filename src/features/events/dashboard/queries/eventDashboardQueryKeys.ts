/**
 * Deterministic TanStack Query keys for the per-event operational
 * dashboard. Namespaced under `['eventos', 'dashboard']` — distinct from
 * `features/dashboard`'s `['dashboard']` (the portfolio `/dashboard/capitan`
 * view) — same collision-avoidance convention as `closureQueryKeys.ts`/
 * `montageQueryKeys.ts`.
 */
export const eventDashboardQueryKeys = {
  all: ['eventos', 'dashboard'] as const,
  detail: (idEvento: number) => [...eventDashboardQueryKeys.all, idEvento] as const,
}
