import type { WaiterPerformanceFilterState } from '@/features/reports/types/report'

/** Deterministic TanStack Query keys for the Reports feature's own live queries. Distinct literal segments from every other feature reading a related endpoint, same convention as `closureQueryKeys.ts`. */
export const reportsQueryKeys = {
  all: ['reportes'] as const,
  mermaSummary: (idEvento: number) =>
    [...reportsQueryKeys.all, 'merma', idEvento] as const,
  ratings: (idEvento: number, soloBajas: boolean) =>
    [...reportsQueryKeys.all, 'calificaciones', idEvento, soloBajas] as const,
  /**
   * Keyed only on this report's own filters/page/page size — deliberately
   * never on `idEvento`. This is a historical, cross-event report; the
   * event picker driving `mermaSummary`/`ratings` above must never refetch
   * or invalidate this query (see `WaiterPerformanceSection`'s own
   * comment).
   */
  waiterPerformance: (
    filters: WaiterPerformanceFilterState,
    page: number,
    pageSize: number,
  ) =>
    [
      ...reportsQueryKeys.all,
      'desempeno-meseros',
      filters.fechaDesde,
      filters.fechaHasta,
      filters.uuidMesero,
      page,
      pageSize,
    ] as const,
}
