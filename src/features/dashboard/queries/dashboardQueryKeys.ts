/** Deterministic TanStack Query keys for the dashboard feature. No params — `GET /dashboard/capitan` takes none (see `services/dashboardApi.ts`). */
export const dashboardQueryKeys = {
  all: ['dashboard'] as const,
  capitan: () => [...dashboardQueryKeys.all, 'capitan'] as const,
}
