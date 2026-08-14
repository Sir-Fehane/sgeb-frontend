import { useState } from 'react'

import { EventsContent } from '@/features/events/components/EventsContent'
import { useEventsListQuery } from '@/features/events/queries/useEventsListQuery'
import {
  DEFAULT_EVENTS_FILTER_STATE,
  type EventsFilterState,
} from '@/features/events/types/event'
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
 * source of real salón names (`GET /salones` is a different module, out of
 * this branch's Events-list scope; the `salon` object embedded on each
 * `Evento` response is undocumented backend-implementation detail, not a
 * contract field). Passing an empty `salones` list keeps the existing
 * `EventsFilters` control rendering (only "Todos" is selectable) without
 * fabricating options — see the branch report for the full reasoning.
 *
 * Selecting an event or requesting creation still shows an honest inline
 * notice rather than navigating: Event Detail stays fixture-only in this
 * branch (out of scope), and Event Creation has no existing, approved,
 * routed flow to wire up yet (`EventCreateForm` remains an unrouted field
 * prototype — see `EventCreateFieldPrototypePage`).
 */
export function EventsPage() {
  const [filters, setFilters] = useState<EventsFilterState>(DEFAULT_EVENTS_FILTER_STATE)
  const [notice, setNotice] = useState<string | null>(null)

  const eventsQuery = useEventsListQuery(filters)

  function handleSelectEvent(id: string) {
    setNotice(`La vista de detalle del evento ${id} aún no está disponible en esta base.`)
  }

  function handleCreate() {
    setNotice('La creación de eventos aún no está conectada a una ruta en esta base.')
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
        onCreate={handleCreate}
      />
    </div>
  )
}
