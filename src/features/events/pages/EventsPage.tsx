import { IconInfoCircle } from '@tabler/icons-react'
import { useState } from 'react'

import { EventsContent } from '@/features/events/components/EventsContent'
import {
  EVENTOS_FIXTURE,
  SALON_OPTIONS_FIXTURE,
} from '@/features/events/fixtures/eventFixtures'
import {
  DEFAULT_EVENTS_FILTER_STATE,
  type EventsFilterState,
} from '@/features/events/types/event'
import { filterEvents } from '@/features/events/utils/filterEvents'
import { Alert, Text } from '@/shared/components'

/**
 * Routed at /eventos. A thin, fixture-backed wiring layer around
 * `EventsContent` — the actual presentational composition (header,
 * filters, and the loading/error/empty/populated branching) lives
 * there and already supports all four states through explicit props.
 * This page always passes `isLoading={false}` and no `errorMessage`
 * since there is no real request to fail or wait on yet; a later branch
 * wires those two props to TanStack Query state without touching
 * `EventsContent` itself. There is no development-state selector.
 *
 * `EVENTOS_FIXTURE` is development/demo data, never a real backend
 * response (see features/events/fixtures) — the only state reachable
 * here besides the populated list is `EventsEmptyState`, when the
 * user's own filters happen to match zero fixture events (a real,
 * filter-driven outcome, not a simulated one).
 *
 * Selecting an event or requesting creation does not navigate anywhere:
 * neither `/eventos/nuevo` nor `/eventos/:id` is an approved route yet
 * (docs/FrontendArchitecture.md §17 marks them "Proposed", not
 * confirmed) — both actions show an honest inline notice instead of
 * silently doing nothing or faking navigation.
 */
export function EventsPage() {
  const [filters, setFilters] = useState<EventsFilterState>(DEFAULT_EVENTS_FILTER_STATE)
  const [notice, setNotice] = useState<string | null>(null)

  const filteredEventos = filterEvents(EVENTOS_FIXTURE, filters)

  function handleSelectEvent(id: string) {
    setNotice(`La vista de detalle del evento ${id} aún no está disponible en esta base.`)
  }

  function handleCreate() {
    setNotice('La creación de eventos aún no está conectada a una ruta en esta base.')
  }

  return (
    <div className="flex flex-col gap-6">
      <Alert
        tone="info"
        icon={<IconInfoCircle aria-hidden="true" />}
        title="Datos de desarrollo"
      >
        <Text size="sm">
          Los eventos mostrados son datos de desarrollo (
          <code>features/events/fixtures</code>), no información real.
        </Text>
      </Alert>

      {notice ? <Alert tone="info">{notice}</Alert> : null}

      <EventsContent
        events={filteredEventos}
        isLoading={false}
        filters={filters}
        onFilterChange={setFilters}
        salones={SALON_OPTIONS_FIXTURE}
        onSelectEvent={handleSelectEvent}
        onCreate={handleCreate}
      />
    </div>
  )
}
