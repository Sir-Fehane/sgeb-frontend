import { Button, FormField, Input, Select } from '@/shared/components'
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
 * Controlled filter UI over the two real, documented `GET /usuarios` query
 * parameters (`filtrosUsuarioValidator`): `activo` (`estadoCuenta`) and `q`
 * (`search`, a substring match against nombre/apellido paterno/correo —
 * `UsuarioService.listar`). Both are sent to the server by
 * `useWaitersQuery`, not filtered client-side.
 */
export function WaitersFilters({ filters, onFilterChange }: WaitersFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <FormField label="Buscar" className="w-64">
        {(controlProps) => (
          <Input
            {...controlProps}
            type="search"
            placeholder="Nombre, apellido o correo"
            value={filters.search}
            onChange={(event) => {
              onFilterChange({ ...filters, search: event.target.value })
            }}
          />
        )}
      </FormField>

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
