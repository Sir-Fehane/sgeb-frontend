import { ReportsEmptyState } from '@/features/reports/components/ReportsEmptyState'
import { ReportsErrorState } from '@/features/reports/components/ReportsErrorState'
import { ReportsFilters } from '@/features/reports/components/ReportsFilters'
import { ReportsLoadingState } from '@/features/reports/components/ReportsLoadingState'
import { ReportsPageHeader } from '@/features/reports/components/ReportsPageHeader'
import { WaiterPerformanceTable } from '@/features/reports/components/WaiterPerformanceTable'
import type {
  ReportFilterState,
  WaiterPerformanceReportItem,
} from '@/features/reports/types/report'

export interface ReportsContentProps {
  items: readonly WaiterPerformanceReportItem[]
  isLoading?: boolean
  errorMessage?: string
  onRetry?: () => void
  filters: ReportFilterState
  onFilterChange: (filters: ReportFilterState) => void
}

/**
 * The presentational reports-page composition: header + filters +
 * exactly one of the four states (loading / error / empty / populated
 * table), selected purely from props — mirrors `EventsContent`'s and
 * `WaitersContent`'s architecture. `ReportsPage` is a thin, fixture-backed
 * wiring layer around it (`isLoading={false}`, no `errorMessage`); real
 * API integration wires TanStack Query state into those same props
 * without needing to change this component.
 *
 * There is no documented partial-success behavior for
 * `GET /dashboard/meseros` (unlike `DashboardCapitan`'s SGEB-0004
 * section-nullability) — this endpoint returns one flat array, so only
 * these four whole-screen states exist.
 */
export function ReportsContent({
  items,
  isLoading = false,
  errorMessage,
  onRetry,
  filters,
  onFilterChange,
}: ReportsContentProps) {
  return (
    <div className="flex flex-col gap-6">
      <ReportsPageHeader />
      <ReportsFilters filters={filters} onFilterChange={onFilterChange} />

      {isLoading ? (
        <ReportsLoadingState />
      ) : errorMessage ? (
        <ReportsErrorState errorMessage={errorMessage} onRetry={onRetry} />
      ) : items.length === 0 ? (
        <ReportsEmptyState />
      ) : (
        <WaiterPerformanceTable items={items} />
      )}
    </div>
  )
}
