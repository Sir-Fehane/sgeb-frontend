import { IconInfoCircle } from '@tabler/icons-react'
import { useParams } from 'react-router-dom'

import { EventDetailContent } from '@/features/events/components/EventDetailContent'
import { findEventDetailFixture } from '@/features/events/fixtures/eventDetailFixtures'
import { parseEventId } from '@/features/events/utils/parseEventId'
import { Alert, Text } from '@/shared/components'

/**
 * Routed at /eventos/:id. Entirely presentation-only, exactly like
 * `EventsPage`: `EVENT_DETAIL_FIXTURES` is development/demo data, never a
 * real `GET /eventos/{id_evento}` response (see
 * features/events/fixtures/eventDetailFixtures). No Axios call, no
 * TanStack Query hook — `isLoading`/`errorMessage` stay reachable through
 * `EventDetailContent`'s own props for a later integration branch,
 * exactly like `EventsPage`/`EventsContent`.
 *
 * The route param is validated (`parseEventId`) before any fixture
 * lookup — a malformed id (empty, zero, negative, decimal, non-numeric,
 * unsafe integer) is treated identically to "no matching fixture": the
 * unavailable state, never a redirect and never a raw parsing error.
 */
export function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const idEvento = parseEventId(id)
  const evento = idEvento === null ? null : findEventDetailFixture(idEvento)

  return (
    <div className="flex flex-col gap-6">
      <Alert
        tone="info"
        icon={<IconInfoCircle aria-hidden="true" />}
        title="Datos de desarrollo"
      >
        <Text size="sm">
          El detalle mostrado usa datos de desarrollo (
          <code>features/events/fixtures</code>), no información real.
        </Text>
      </Alert>

      <EventDetailContent evento={evento} isLoading={false} />
    </div>
  )
}
