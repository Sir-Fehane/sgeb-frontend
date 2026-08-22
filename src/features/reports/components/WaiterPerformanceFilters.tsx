import type { WaiterPerformanceFilterState } from '@/features/reports/types/report'
import { validateWaiterPerformanceDateRange } from '@/features/reports/utils/waiterPerformanceValidation'
import type { WaiterListItemViewModel } from '@/features/waiters/types/waiter'
import { FormField, Input, Select } from '@/shared/components'

export interface WaiterPerformanceFiltersProps {
  filters: WaiterPerformanceFilterState
  onFilterChange: (filters: WaiterPerformanceFilterState) => void
  waiters: readonly WaiterListItemViewModel[]
}

/**
 * Local, controlled filter bar over `GET /reportes/desempeno-meseros`'s
 * real query parameters (`fechaDesde`, `fechaHasta`, `uuidMesero`) — native
 * `<input type="date">` + `Select`, same convention `EventsFilters`/
 * `WaitersFilters` already established (no date-picker library exists in
 * this app). The waiter options come from the real global waiters
 * directory (`useWaitersQuery`, `GET /usuarios?rol=mesero`), reused as-is —
 * never a duplicated user list or an event-scoped participant list, since
 * this filter represents people, not one event's participations.
 *
 * Any parent that also changes `page` in response to `onFilterChange` is
 * expected to reset it to 1 — this component only reports the new filter
 * values, it never tracks pagination itself.
 */
export function WaiterPerformanceFilters({
  filters,
  onFilterChange,
  waiters,
}: WaiterPerformanceFiltersProps) {
  const rangeError = validateWaiterPerformanceDateRange(
    filters.fechaDesde,
    filters.fechaHasta,
  )

  return (
    <div className="flex flex-wrap items-end gap-4">
      <FormField label="Desde" className="w-40" required>
        {(controlProps) => (
          <Input
            {...controlProps}
            type="date"
            value={filters.fechaDesde}
            onChange={(event) => {
              onFilterChange({ ...filters, fechaDesde: event.target.value })
            }}
          />
        )}
      </FormField>

      <FormField
        label="Hasta"
        className="w-40"
        required
        {...(rangeError ? { error: rangeError } : {})}
      >
        {(controlProps) => (
          <Input
            {...controlProps}
            type="date"
            value={filters.fechaHasta}
            onChange={(event) => {
              onFilterChange({ ...filters, fechaHasta: event.target.value })
            }}
          />
        )}
      </FormField>

      <FormField label="Mesero" className="w-64">
        {(controlProps) => (
          <Select
            {...controlProps}
            value={filters.uuidMesero ?? ''}
            onChange={(event) => {
              const { value } = event.target
              onFilterChange({ ...filters, uuidMesero: value === '' ? null : value })
            }}
          >
            <option value="">Todos los meseros</option>
            {waiters.map((waiter) => (
              <option key={waiter.id} value={waiter.id}>
                {waiter.nombreCompleto}
              </option>
            ))}
          </Select>
        )}
      </FormField>
    </div>
  )
}
