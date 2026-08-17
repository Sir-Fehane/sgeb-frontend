import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { EventsContent } from '@/features/events/components/EventsContent'
import { useEventsListQuery } from '@/features/events/queries/useEventsListQuery'
import {
  DEFAULT_EVENTS_FILTER_STATE,
  type EventsFilterState,
} from '@/features/events/types/event'
import { useOidcSessionStore } from '@/features/oidc-client/session/sessionStore'
import { isSgebApplicationError, isSgebNetworkError } from '@/shared/api/sgebApiError'
import { Alert } from '@/shared/components'

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
 * Routed at /eventos. Live wiring layer around `EventsContent`: fetches
 * the real events list through `useEventsListQuery` and maps its
 * loading/error/data states onto the same props `EventsContent` already
 * exposed for the fixture-backed foundation — no change to that
 * component was needed.
 *
 * The salón filter has no live data source in this branch: the pinned
 * backend's `GET /eventos` has no server-side `id_salon` filter (absent
 * from `filtrosEventoValidator`), and there is no in-scope, non-fabricated
 * source of real salón names (`GET /salones` is this feature's event
 * -creation prerequisite, not an Events-list concern; the `salon` object
 * embedded on each `Evento` response is undocumented backend-implementation
 * detail, not a contract field). Passing an empty `salones` list keeps the
 * existing `EventsFilters` control rendering (only "Todos" is selectable)
 * without fabricating options.
 *
 * Selecting an event still shows an honest inline notice rather than
 * navigating — the big list-item click target has no real destination of
 * its own; each `EventListItem` already renders its own real "Ver detalle"
 * link to `/eventos/{id}` alongside it (out of this page's scope to
 * change). "Crear evento" now navigates to the real, routed
 * `/eventos/nuevo` (`EventCreatePage`) — the create action is only offered
 * to a `capitan`/`admin` session (UX-only role gate, same pattern as
 * `EventDetailPage`'s `canManageComanda`; the pinned backend's own
 * `POST /eventos` role guard remains the actual authorization boundary).
 */
export function EventsPage() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<EventsFilterState>(DEFAULT_EVENTS_FILTER_STATE)
  const [notice, setNotice] = useState<string | null>(null)

  const eventsQuery = useEventsListQuery(filters)

  const session = useOidcSessionStore((state) => state.session)
  const canCreateEvento =
    session.status === 'authenticated' &&
    (session.user.rol === 'capitan' || session.user.rol === 'admin')

  function handleSelectEvent(id: string) {
    setNotice(`La vista de detalle del evento ${id} aún no está disponible en esta base.`)
  }

  function handleCreate() {
    void navigate('/eventos/nuevo')
  }

  return (
    <div className="flex flex-col gap-6">
      {notice ? <Alert tone="info">{notice}</Alert> : null}

      <EventsContent
        events={eventsQuery.data ?? []}
        isLoading={eventsQuery.isPending}
        {...(eventsQuery.error
          ? { errorMessage: toSafeErrorMessage(eventsQuery.error) }
          : {})}
        onRetry={() => void eventsQuery.refetch()}
        filters={filters}
        onFilterChange={setFilters}
        salones={[]}
        onSelectEvent={handleSelectEvent}
        {...(canCreateEvento ? { onCreate: handleCreate } : {})}
      />
    </div>
  )
}
