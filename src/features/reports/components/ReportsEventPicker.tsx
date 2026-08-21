import type { EventListItemViewModel } from '@/features/events/types/event'
import { formatEventDate } from '@/features/events/utils/eventDetailFormatting'
import { FormField, Select } from '@/shared/components'

export interface ReportsEventPickerProps {
  events: readonly EventListItemViewModel[]
  idEvento: number | null
  onChange: (idEvento: number | null) => void
}

/**
 * Every real, event-scoped report the pinned backend supports
 * (merma, calificaciones) requires an `id_evento` — there is no
 * cross-event aggregate endpoint behind this screen (see `types/report.ts`'s
 * module comment), so choosing an event is the first real step here, not
 * an optional filter.
 */
export function ReportsEventPicker({
  events,
  idEvento,
  onChange,
}: ReportsEventPickerProps) {
  return (
    <FormField label="Evento" className="w-full max-w-sm">
      {(controlProps) => (
        <Select
          {...controlProps}
          value={idEvento ?? ''}
          onChange={(event) => {
            const { value } = event.target
            onChange(value === '' ? null : Number(value))
          }}
        >
          <option value="">Selecciona un evento</option>
          {events.map((evento) => (
            <option key={evento.idEvento} value={evento.idEvento}>
              {evento.titulo} · {formatEventDate(evento.fecha)}
            </option>
          ))}
        </Select>
      )}
    </FormField>
  )
}
