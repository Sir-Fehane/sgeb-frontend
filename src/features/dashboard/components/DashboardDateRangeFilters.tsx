import { useId } from 'react'

import {
  getDefaultDashboardDateFilterState,
  validateDashboardDateRange,
} from '@/features/dashboard/utils/dashboardDateRange'
import type { DashboardDateFilterState } from '@/features/dashboard/types/dashboard'
import { Button, ErrorText, Input, Label } from '@/shared/components'

export interface DashboardDateRangeFiltersProps {
  filters: DashboardDateFilterState
  onFilterChange: (filters: DashboardDateFilterState) => void
}

/**
 * Native date inputs for the two documented, user-facing query
 * parameters (`fecha_desde`/`fecha_hasta`). `secciones` is deliberately
 * not exposed here — it's a section-selection mechanism the API uses
 * internally, never a documented user-facing filter concept. Validation
 * is local-only (inverted range, >366 days) via
 * `validateDashboardDateRange`; nothing is ever sent to the server from
 * this component.
 */
export function DashboardDateRangeFilters({
  filters,
  onFilterChange,
}: DashboardDateRangeFiltersProps) {
  const desdeId = useId()
  const hastaId = useId()
  const errorId = useId()

  const errorMessage = validateDashboardDateRange(filters)

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

      <Button
        type="button"
        variant="ghost"
        onClick={() => {
          onFilterChange(getDefaultDashboardDateFilterState())
        }}
      >
        Restablecer rango
      </Button>

      {errorMessage ? <ErrorText id={errorId}>{errorMessage}</ErrorText> : null}
    </div>
  )
}
