import { Button, FormField, Input, Select } from '@/shared/components'
import type { EventSalonOption, EventsFilterState } from '@/features/events/types/event'
import { DEFAULT_EVENTS_FILTER_STATE } from '@/features/events/types/event'
import { EVENT_STATUS_LABELS } from '@/features/events/utils/eventStatusPresentation'

export interface EventsFiltersProps {
  filters: EventsFilterState
  onFilterChange: (filters: EventsFilterState) => void
  /** Salón options for the `id_salon` filter — dev fixtures on this branch. */
  salones: readonly EventSalonOption[]
}

const ESTADO_OPTIONS = Object.entries(EVENT_STATUS_LABELS) as [
  keyof typeof EVENT_STATUS_LABELS,
  string,
][]

/**
 * Local, controlled filter UI over exactly the four query parameters
 * `GET /eventos` documents (`estado`, `fecha_desde`, `fecha_hasta`,
 * `id_salon`). No text-search or captain filter exists here because
 * neither is a documented `/eventos` query parameter.
 */
export function EventsFilters({ filters, onFilterChange, salones }: EventsFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <FormField label="Estado" className="w-40">
        {(controlProps) => (
          <Select
            {...controlProps}
            value={filters.estado}
            onChange={(event) => {
              onFilterChange({
                ...filters,
                estado: event.target.value as EventsFilterState['estado'],
              })
            }}
          >
            <option value="todos">Todos</option>
            {ESTADO_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        )}
      </FormField>

      <FormField label="Salón" className="w-48">
        {(controlProps) => (
          <Select
            {...controlProps}
            value={filters.idSalon}
            onChange={(event) => {
              const { value } = event.target
              onFilterChange({
                ...filters,
                idSalon: value === 'todos' ? 'todos' : Number(value),
              })
            }}
          >
            <option value="todos">Todos</option>
            {salones.map((salon) => (
              <option key={salon.idSalon} value={salon.idSalon}>
                {salon.nombre}
              </option>
            ))}
          </Select>
        )}
      </FormField>

      <FormField label="Desde" className="w-40">
        {(controlProps) => (
          <Input
            {...controlProps}
            type="date"
            value={filters.fechaDesde ?? ''}
            onChange={(event) => {
              onFilterChange({ ...filters, fechaDesde: event.target.value || null })
            }}
          />
        )}
      </FormField>

      <FormField label="Hasta" className="w-40">
        {(controlProps) => (
          <Input
            {...controlProps}
            type="date"
            value={filters.fechaHasta ?? ''}
            onChange={(event) => {
              onFilterChange({ ...filters, fechaHasta: event.target.value || null })
            }}
          />
        )}
      </FormField>

      <Button
        type="button"
        variant="ghost"
        onClick={() => {
          onFilterChange(DEFAULT_EVENTS_FILTER_STATE)
        }}
      >
        Limpiar filtros
      </Button>
    </div>
  )
}
