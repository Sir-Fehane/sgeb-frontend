import { Button, FormField, Select } from '@/shared/components'
import type { WaitersFilterState } from '@/features/waiters/types/waiter'
import { DEFAULT_WAITERS_FILTER_STATE } from '@/features/waiters/types/waiter'
import { WAITER_ACCOUNT_STATUS_LABELS } from '@/features/waiters/utils/waiterStatusPresentation'

export interface WaitersFiltersProps {
  filters: WaitersFilterState
  onFilterChange: (filters: WaitersFilterState) => void
}

const ESTADO_CUENTA_OPTIONS = Object.entries(WAITER_ACCOUNT_STATUS_LABELS) as [
  keyof typeof WAITER_ACCOUNT_STATUS_LABELS,
  string,
][]

/**
 * Local, controlled filter UI over the one documented, applicable
 * `GET /usuarios` query parameter once already scoped to
 * `rol=mesero`: `activo`. No text-search, invitation-status,
 * availability, or event-assignment filter exists here because none is
 * a documented `/usuarios` query parameter.
 */
export function WaitersFilters({ filters, onFilterChange }: WaitersFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <FormField label="Estado de cuenta" className="w-48">
        {(controlProps) => (
          <Select
            {...controlProps}
            value={filters.estadoCuenta}
            onChange={(event) => {
              onFilterChange({
                ...filters,
                estadoCuenta: event.target.value as WaitersFilterState['estadoCuenta'],
              })
            }}
          >
            <option value="todos">Todos</option>
            {ESTADO_CUENTA_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        )}
      </FormField>

      <Button
        type="button"
        variant="ghost"
        onClick={() => {
          onFilterChange(DEFAULT_WAITERS_FILTER_STATE)
        }}
      >
        Limpiar filtros
      </Button>
    </div>
  )
}
