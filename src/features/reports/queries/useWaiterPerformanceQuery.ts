import { keepPreviousData, skipToken, useQuery } from '@tanstack/react-query'

import { reportsQueryKeys } from '@/features/reports/queries/reportsQueryKeys'
import {
  fetchWaiterPerformance,
  toWaiterPerformanceListParams,
} from '@/features/reports/services/reportsApi'
import type { WaiterPerformanceFilterState } from '@/features/reports/types/report'
import { validateWaiterPerformanceDateRange } from '@/features/reports/utils/waiterPerformanceValidation'
import { isSgebNetworkError } from '@/shared/api/sgebApiError'

const MAX_NETWORK_RETRIES = 2

/** `desempenoValidator`'s own default (`reportes_controller.ts`) — no page-size selector exists in this UI (no real UX need was identified for one). */
export const WAITER_PERFORMANCE_PAGE_SIZE = 25

/**
 * Live `GET /reportes/desempeno-meseros` query — a historical, cross-event
 * report. The query key (`reportsQueryKeys.waiterPerformance`) is built
 * only from this report's own filters/page, never from `idEvento`:
 * selecting a different event in "Reportes por evento" above must never
 * refetch or invalidate this query, per this branch's own IA audit.
 *
 * `enabled=false` (a `mesero` session — this endpoint is capitán/admin
 * only server-side, `middleware.rol(['capitan','admin'])`) and an
 * obviously invalid date range (mirrors the backend's own
 * `SGEB-2009`/`SGEB-2015` rules, see `validateWaiterPerformanceDateRange`)
 * both use `skipToken` rather than sending a request known to fail —
 * same convention `useEventRatingsQuery`/`useEventMermaSummaryQuery`
 * already use for "nothing to fetch yet".
 *
 * `placeholderData: keepPreviousData` keeps the current page's rows on
 * screen while a new page/filter combination loads, instead of flashing
 * the loading state — this is the first paginated query in the app.
 */
export function useWaiterPerformanceQuery(
  filters: WaiterPerformanceFilterState,
  page: number,
  enabled: boolean,
) {
  const rangeError = validateWaiterPerformanceDateRange(
    filters.fechaDesde,
    filters.fechaHasta,
  )

  return useQuery({
    queryKey: reportsQueryKeys.waiterPerformance(
      filters,
      page,
      WAITER_PERFORMANCE_PAGE_SIZE,
    ),
    queryFn:
      !enabled || rangeError
        ? skipToken
        : ({ signal }) =>
            fetchWaiterPerformance(
              toWaiterPerformanceListParams(filters, page, WAITER_PERFORMANCE_PAGE_SIZE),
              signal,
            ),
    placeholderData: keepPreviousData,
    retry: (failureCount, error) =>
      isSgebNetworkError(error) && failureCount < MAX_NETWORK_RETRIES,
  })
}
