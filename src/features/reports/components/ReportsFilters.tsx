import { useId } from 'react'

import type { ReportFilterState } from '@/features/reports/types/report'
import { validateReportDateRange } from '@/features/reports/utils/reportDateRange'
import { ErrorText, Input, Label, Select } from '@/shared/components'

export interface ReportsFiltersProps {
  filters: ReportFilterState
  onFilterChange: (filters: ReportFilterState) => void
}

const ORDEN_OPTIONS: readonly { value: ReportFilterState['orden']; label: string }[] = [
  { value: 'calificacion', label: 'Calificación' },
  { value: 'asistencias', label: 'Asistencias' },
  { value: 'monto_pagado', label: 'Monto pagado' },
]

/**
 * Local, controlled filter UI over exactly the user-facing subset of
 * `GET /dashboard/meseros`'s query parameters this branch exposes
 * honestly: `fecha_desde`, `fecha_hasta`, `orden`. No `uuid_usuario`
 * input exists (no approved waiter-selector integration — see
 * `ReportFilterState`'s comment) and no page/page-size control exists
 * (the response documents no pagination metadata to build one against).
 * Validation is local-only (inverted range); nothing is ever sent to a
 * server from this component.
 */
export function ReportsFilters({ filters, onFilterChange }: ReportsFiltersProps) {
  const desdeId = useId()
  const hastaId = useId()
  const ordenId = useId()
  const errorId = useId()

  const errorMessage = validateReportDateRange(filters)

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={desdeId}>Desde</Label>
        <Input
          id={desdeId}
          type="date"
          value={filters.fechaDesde}
          invalid={Boolean(errorMessage)}
          aria-describedby={errorMessage ? errorId : undefined}
          onChange={(event) => {
            onFilterChange({ ...filters, fechaDesde: event.target.value })
          }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={hastaId}>Hasta</Label>
        <Input
          id={hastaId}
          type="date"
          value={filters.fechaHasta}
          invalid={Boolean(errorMessage)}
          aria-describedby={errorMessage ? errorId : undefined}
          onChange={(event) => {
            onFilterChange({ ...filters, fechaHasta: event.target.value })
          }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={ordenId}>Ordenar por</Label>
        <Select
          id={ordenId}
          className="w-48"
          value={filters.orden}
          onChange={(event) => {
            onFilterChange({
              ...filters,
              orden: event.target.value as ReportFilterState['orden'],
            })
          }}
        >
          {ORDEN_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      {errorMessage ? <ErrorText id={errorId}>{errorMessage}</ErrorText> : null}
    </div>
  )
}
