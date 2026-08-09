import { IconInfoCircle } from '@tabler/icons-react'
import { useParams } from 'react-router-dom'

import { findEventDetailFixture } from '@/features/events/fixtures/eventDetailFixtures'
import { EventAttendanceContent } from '@/features/events/attendance/components/EventAttendanceContent'
import { findAttendanceParticipants } from '@/features/events/attendance/fixtures/attendanceFixtures'
import { parseEventId } from '@/features/events/utils/parseEventId'
import { Alert, Text } from '@/shared/components'

/**
 * Routed at /eventos/:id/pase-de-lista (W-06 "Pase de lista"). Entirely
 * presentation-only and read-only, exactly like `EventDetailPage`/
 * `TeamSelectionPage`: `findAttendanceParticipants` is development/demo
 * data, never a real `GET /eventos/{id_evento}/participaciones` response.
 * No Axios, no TanStack Query, no network request, no Socket.IO, and no
 * mutation of any kind — this screen never calls
 * `POST /participaciones/{id}/confirmacion-llegada` (that's the mesero's
 * own device) and has no captain action to submit.
 */
export function EventAttendancePage() {
  const { id } = useParams<{ id: string }>()
  const idEvento = parseEventId(id)
  const evento = idEvento === null ? null : findEventDetailFixture(idEvento)
  const participants = idEvento === null ? [] : findAttendanceParticipants(idEvento)

  return (
    <div className="flex flex-col gap-6">
      <Alert
        tone="info"
        icon={<IconInfoCircle aria-hidden="true" />}
        title="Datos de desarrollo"
      >
        <Text size="sm">
          El pase de lista mostrado usa datos de desarrollo (
          <code>features/events/attendance/fixtures</code>), no información real. La
          confirmación de asistencia y llegada se realiza desde el dispositivo del mesero,
          nunca desde este panel.
        </Text>
      </Alert>

      <EventAttendanceContent
        evento={evento}
        isLoading={false}
        participants={participants}
      />
    </div>
  )
}
