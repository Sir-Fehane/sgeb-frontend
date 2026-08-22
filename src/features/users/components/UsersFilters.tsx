import { useRolesQuery } from '@/features/waiters/queries/useRolesQuery'
import { Button, FormField, Input, Select } from '@/shared/components'
import {
  DEFAULT_USERS_FILTER_STATE,
  type UsersFilterState,
} from '@/features/users/types/user'
import {
  USER_ACCOUNT_STATUS_LABELS,
  USER_ROLE_LABELS,
} from '@/features/users/utils/userPresentation'

export interface UsersFiltersProps {
  filters: UsersFilterState
  onFilterChange: (filters: UsersFilterState) => void
}

const ESTADO_CUENTA_OPTIONS = Object.entries(USER_ACCOUNT_STATUS_LABELS) as [
  keyof typeof USER_ACCOUNT_STATUS_LABELS,
  string,
][]

/**
 * Controlled filter UI over the three real, documented `GET /usuarios`
 * query parameters (`filtrosUsuarioValidator`): `rol`, `activo`
 * (`estadoCuenta`), `q` (`search`). All three are sent to the server by
 * `useUsersQuery`, never filtered client-side. The role options reuse
 * `useRolesQuery` from `features/waiters` — the same real `GET /roles`
 * catalog, not a duplicated fetch (same cross-feature reuse
 * `features/reports/pages/ReportsPage.tsx` already establishes for
 * `useWaitersQuery`).
 */
export function UsersFilters({ filters, onFilterChange }: UsersFiltersProps) {
  const rolesQuery = useRolesQuery()

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

      <FormField label="Rol" className="w-44">
        {(controlProps) => (
          <Select
            {...controlProps}
            value={filters.rol}
            onChange={(event) => {
              onFilterChange({
                ...filters,
                rol: event.target.value as UsersFilterState['rol'],
              })
            }}
          >
            <option value="todos">Todos</option>
            {(rolesQuery.data ?? []).map((role) => (
              <option key={role.idRol} value={role.nombre}>
                {USER_ROLE_LABELS[role.nombre]}
              </option>
            ))}
          </Select>
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
                estadoCuenta: event.target.value as UsersFilterState['estadoCuenta'],
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
          onFilterChange(DEFAULT_USERS_FILTER_STATE)
        }}
      >
        Limpiar filtros
      </Button>
    </div>
  )
}
