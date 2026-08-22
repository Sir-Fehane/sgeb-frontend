import { ReportsEmptyState } from '@/features/reports/components/ReportsEmptyState'
import { ReportsErrorState } from '@/features/reports/components/ReportsErrorState'
import { ReportsLoadingState } from '@/features/reports/components/ReportsLoadingState'
import { WaiterPerformanceFilters } from '@/features/reports/components/WaiterPerformanceFilters'
import { WaiterPerformancePagination } from '@/features/reports/components/WaiterPerformancePagination'
import { WaiterPerformanceTable } from '@/features/reports/components/WaiterPerformanceTable'
import type {
  WaiterPerformanceFilterState,
  WaiterPerformancePageViewModel,
} from '@/features/reports/types/report'
import { formatEventDate } from '@/features/events/utils/eventDetailFormatting'
import type { WaiterListItemViewModel } from '@/features/waiters/types/waiter'
import { Alert, Caption, CardHeading } from '@/shared/components'

export interface WaiterPerformanceSectionProps {
  canView: boolean
  filters: WaiterPerformanceFilterState
  onFiltersChange: (filters: WaiterPerformanceFilterState) => void
  onPageChange: (page: number) => void
  waiters: readonly WaiterListItemViewModel[]
  data: WaiterPerformancePageViewModel | null
  isLoading: boolean
  errorMessage?: string | undefined
  onRetry: () => void
}

/**
 * "Desempeño de meseros" — a real, live report replacing the previous
 * `ReportsPerformanceDeferredSection` "Próximamente" card. Deliberately
 * self-contained: unlike the event-scoped cards above it in `ReportsContent`
 * ("Reportes por evento"), nothing here reads `idEvento` or the selected
 * event at all — this is a historical, cross-event report keyed only by
 * date range and an optional mesero, per this branch's own IA audit
 * ("do not accidentally couple it to the selected Evento").
 *
 * `canView` mirrors `ReportsRatingsSection`'s role-gate pattern
 * (capitán/admin only, server-enforced by
 * `middleware.rol(['capitan','admin'])` on `GET
 * /reportes/desempeno-meseros`) — a `mesero` session sees the same honest
 * "esta sección es para capitanes y administradores" message instead of a
 * fetch that would always fail with `SGEB-1004`.
 */
export function WaiterPerformanceSection({
  canView,
  filters,
  onFiltersChange,
  onPageChange,
  waiters,
  data,
  isLoading,
  errorMessage,
  onRetry,
}: WaiterPerformanceSectionProps) {
  if (!canView) {
    return (
      <Alert tone="neutral" title="Desempeño de meseros">
        <p>Esta sección es para capitanes y administradores.</p>
      </Alert>
    )
  }

  const selectedWaiterLabel = filters.uuidMesero
    ? (waiters.find((waiter) => waiter.id === filters.uuidMesero)?.nombreCompleto ??
      'Mesero seleccionado')
    : 'Todos los meseros'

  return (
    <div className="flex flex-col gap-4">
      <CardHeading id="reports-performance-heading">Desempeño de meseros</CardHeading>

      <WaiterPerformanceFilters
        filters={filters}
        onFilterChange={onFiltersChange}
        waiters={waiters}
      />

      <Caption>
        Del {formatEventDate(filters.fechaDesde)} al {formatEventDate(filters.fechaHasta)}{' '}
        · {selectedWaiterLabel}
      </Caption>

      {isLoading ? (
        <ReportsLoadingState />
      ) : errorMessage ? (
        <ReportsErrorState errorMessage={errorMessage} onRetry={onRetry} />
      ) : data === null ? null : data.items.length === 0 ? (
        <ReportsEmptyState message="No hay datos de desempeño para este periodo. Prueba con otro rango de fechas o selecciona Todos los meseros." />
      ) : (
        <div className="flex flex-col gap-4">
          <WaiterPerformanceTable rows={data.items} />
          <WaiterPerformancePagination
            page={data.meta.page}
            lastPage={data.meta.lastPage}
            total={data.meta.total}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  )
}
