import type {
  EventListItemViewModel,
  EventsFilterState,
} from '@/features/events/types/event'

/**
 * Pure, local filtering over an in-memory `EventListItemViewModel[]` —
 * demonstrates the four documented `GET /eventos` query dimensions
 * (`estado`, `fecha_desde`, `fecha_hasta`, `id_salon`) entirely
 * client-side. This is UI behavior over fixture/prop data only; it is
 * not a request builder and performs no network call.
 */
export function filterEvents(
  eventos: readonly EventListItemViewModel[],
  filters: EventsFilterState,
): EventListItemViewModel[] {
  return eventos.filter((evento) => {
    if (filters.estado !== 'todos' && evento.estado !== filters.estado) {
      return false
    }
    if (filters.idSalon !== 'todos' && evento.idSalon !== filters.idSalon) {
      return false
    }
    if (filters.fechaDesde && evento.fecha < filters.fechaDesde) {
      return false
    }
    if (filters.fechaHasta && evento.fecha > filters.fechaHasta) {
      return false
    }
    return true
  })
}
