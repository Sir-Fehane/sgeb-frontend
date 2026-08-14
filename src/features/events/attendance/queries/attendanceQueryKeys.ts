/**
 * Deterministic TanStack Query keys for the Attendance ("pase de lista")
 * roster. `'pase-de-lista'` never collides with Team Selection's own
 * `'participaciones'` second segment — distinct literal at the same array
 * position — even though both ultimately read the same backend endpoint;
 * their projections differ (see `services/attendanceApi.ts`), so this
 * feature keeps its own independent cache entry rather than forcing a
 * shared one.
 */
export const attendanceQueryKeys = {
  all: ['eventos', 'pase-de-lista'] as const,
  list: (idEvento: number) => [...attendanceQueryKeys.all, idEvento] as const,
}
