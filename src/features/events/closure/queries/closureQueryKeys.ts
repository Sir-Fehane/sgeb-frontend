/**
 * Deterministic TanStack Query keys for the Closure screen's live queries.
 * Distinct literal segments from every other feature reading a related
 * endpoint, so caches never collide (same reasoning as
 * `attendanceQueryKeys.ts`/`montageQueryKeys.ts`).
 */
export const closureQueryKeys = {
  all: ['eventos', 'cierre'] as const,
  readiness: (idEvento: number) =>
    [...closureQueryKeys.all, 'readiness', idEvento] as const,
  mermaReports: (idEvento: number) =>
    [...closureQueryKeys.all, 'reportes-merma', idEvento] as const,
}
