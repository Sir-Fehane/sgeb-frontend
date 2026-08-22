import {
  KNOWN_AUDIT_LOG_ENTITY_TYPES,
  type AuditLogAction,
  type AuditLogFilterState,
} from '@/features/audit-log/types/auditLog'
import { validateAuditLogDateRange } from '@/features/audit-log/utils/auditLogValidation'
import {
  AUDIT_LOG_ACTION_LABELS,
  formatAuditLogEntityType,
} from '@/features/audit-log/utils/auditLogPresentation'
import { FormField, Input, Select } from '@/shared/components'

export interface AuditLogFiltersProps {
  filters: AuditLogFilterState
  onFilterChange: (filters: AuditLogFilterState) => void
}

const ACTION_OPTIONS = Object.entries(AUDIT_LOG_ACTION_LABELS) as [
  AuditLogAction,
  string,
][]

/**
 * Local, controlled filter bar over `GET /admin/bitacora`'s real query
 * parameters — native `<input type="date">` + `Select`, same convention
 * `WaiterPerformanceFilters` establishes (no date-picker library in this
 * app). `Tipo` only offers the known, observed `tipoEntidad` values (see
 * `types/auditLog.ts`'s `KNOWN_AUDIT_LOG_ENTITY_TYPES` comment) — not a free
 * text field, since the backend gives no feedback distinguishing "no
 * results" from "you mistyped the entity type."
 *
 * Any parent that also tracks a page number is expected to reset it to 1 in
 * response to `onFilterChange` — this component only reports new filter
 * values, same split `WaiterPerformanceFilters` uses.
 */
export function AuditLogFilters({ filters, onFilterChange }: AuditLogFiltersProps) {
  const rangeError = validateAuditLogDateRange(filters.fechaDesde, filters.fechaHasta)

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

      <FormField label="Acción" className="w-44">
        {(controlProps) => (
          <Select
            {...controlProps}
            value={filters.accion ?? ''}
            onChange={(event) => {
              const { value } = event.target
              onFilterChange({
                ...filters,
                accion: value === '' ? null : (value as AuditLogAction),
              })
            }}
          >
            <option value="">Todas</option>
            {ACTION_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        )}
      </FormField>

      <FormField label="Tipo" className="w-48">
        {(controlProps) => (
          <Select
            {...controlProps}
            value={filters.tipoEntidad ?? ''}
            onChange={(event) => {
              const { value } = event.target
              onFilterChange({ ...filters, tipoEntidad: value === '' ? null : value })
            }}
          >
            <option value="">Todos</option>
            {KNOWN_AUDIT_LOG_ENTITY_TYPES.map((value) => (
              <option key={value} value={value}>
                {formatAuditLogEntityType(value)}
              </option>
            ))}
          </Select>
        )}
      </FormField>
    </div>
  )
}
