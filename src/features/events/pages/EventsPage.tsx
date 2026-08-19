import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { EventsContent } from '@/features/events/components/EventsContent'
import { useEventListSalonesQuery } from '@/features/events/queries/useEventListSalonesQuery'
import { useEventsListQuery } from '@/features/events/queries/useEventsListQuery'
import {
  DEFAULT_EVENTS_FILTER_STATE,
  type EventListItemViewModel,
  type EventsFilterState,
} from '@/features/events/types/event'
import { useOidcSessionStore } from '@/features/oidc-client/session/sessionStore'
import { isSgebApplicationError, isSgebNetworkError } from '@/shared/api/sgebApiError'

/**
 * Never renders `technical_message` — `SgebApplicationError.message` is
 * already `result.message`, the approved user-facing copy
 * (docs/FrontendArchitecture.md §4.1). `SgebNetworkError.message` is a
 * locally authored, safe message for transport-level failures. Anything
 * else (a bug, not a modeled SGEB/network outcome) falls back to a
 * generic, still-safe message rather than exposing an unknown error's
 * internals.
 */
function toSafeErrorMessage(error: unknown): string {
  if (isSgebApplicationError(error) || isSgebNetworkError(error)) {
    return error.message
  }
  return 'Ocurrió un error inesperado al cargar los eventos.'
}

/**
 * Overlays real salón names onto the list — display only, mirrors
 * `EventDetailPage`'s own `eventoForDisplay`. `salonNombreById` only has
 * entries for a salón that has actually resolved (role-gated, loaded,
 * no error); any event whose `idSalon` is missing from it keeps
 * `salonNombre` unset, and `EventListItem` already renders its existing
 * "pendiente de integración" fallback for that case.
 */
function withSalonNames(
  events: readonly EventListItemViewModel[],
  salonNombreById: ReadonlyMap<number, string>,
): EventListItemViewModel[] {
  return events.map((evento) => {
    const salonNombre = salonNombreById.get(evento.idSalon)
    return salonNombre ? { ...evento, salonNombre } : evento
  })
}

/**
 * Routed at /eventos. Live wiring layer around `EventsContent`: fetches
 * the real events list through `useEventsListQuery` and maps its
 * loading/error/data states onto the same props `EventsContent` already
 * exposed for the fixture-backed foundation — no change to that
 * component was needed.
 *
 * Each card's real salón name is resolved here through
 * `useEventListSalonesQuery` — one `GET /salones/{id_salon}` per distinct
 * `idSalon` already present in the loaded list, gated to a `capitan`/
 * `admin` session exactly like `EventDetailPage`'s own `useSalonQuery`
 * (the pinned backend restricts that endpoint to those two roles). This
 * reuses the same `salonesQueryKeys.detail` cache entries Event Detail
 * already populates — no duplicated networking logic, and two events
 * sharing a salón (or a salón already resolved from Event Detail) cost at
 * most one request.
 *
 * The salón FILTER, unlike the card display above, still has no live data
 * source: the pinned backend's `GET /eventos` has no server-side
 * `id_salon` filter (absent from `filtrosEventoValidator`), so passing an
 * empty `salones` list keeps `EventsFilters` rendering (only "Todos" is
 * selectable) without fabricating filter options — a narrower gap than
 * "no real salón name anywhere," which this branch resolves for display.
 *
 * Clicking an event now navigates for real, the same way "Ver detalle"
 * already did — see `EventListItem`. "Crear evento" navigates to the
 * real, routed `/eventos/nuevo` (`EventCreatePage`) — the create action is
 * only offered to a `capitan`/`admin` session (UX-only role gate; the
 * pinned backend's own `POST /eventos` role guard remains the actual
 * authorization boundary). Salón resolution reuses this exact same role
 * gate, since it is the same restriction the backend applies to
 * `GET /salones/{id_salon}`.
 */
export function EventsPage() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<EventsFilterState>(DEFAULT_EVENTS_FILTER_STATE)

  const eventsQuery = useEventsListQuery(filters)
  const events = eventsQuery.data ?? []

  const session = useOidcSessionStore((state) => state.session)
  const canManageEvents =
    session.status === 'authenticated' &&
    (session.user.rol === 'capitan' || session.user.rol === 'admin')

  const idSalones = Array.from(new Set(events.map((evento) => evento.idSalon)))
  const salonQueries = useEventListSalonesQuery(idSalones, canManageEvents)
  const salonNombreById = new Map<number, string>()
  idSalones.forEach((idSalon, index) => {
    const nombre = salonQueries[index]?.data?.nombre
    if (nombre) {
      salonNombreById.set(idSalon, nombre)
    }
  })

  function handleCreate() {
    void navigate('/eventos/nuevo')
  }

  return (
    <div className="flex flex-col gap-6">
      <EventsContent
        events={withSalonNames(events, salonNombreById)}
        isLoading={eventsQuery.isPending}
        {...(eventsQuery.error
          ? { errorMessage: toSafeErrorMessage(eventsQuery.error) }
          : {})}
        onRetry={() => void eventsQuery.refetch()}
        filters={filters}
        onFilterChange={setFilters}
        salones={[]}
        {...(canManageEvents ? { onCreate: handleCreate } : {})}
      />
    </div>
  )
}
