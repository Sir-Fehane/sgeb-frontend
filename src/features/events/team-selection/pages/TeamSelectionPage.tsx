import { IconInfoCircle } from '@tabler/icons-react'
import { useState } from 'react'
import { useParams } from 'react-router-dom'

import { findEventDetailFixture } from '@/features/events/fixtures/eventDetailFixtures'
import { TeamSelectionContent } from '@/features/events/team-selection/components/TeamSelectionContent'
import { findTeamSelectionParticipants } from '@/features/events/team-selection/fixtures/teamSelectionFixtures'
import type {
  SelectParticipantRequest,
  TeamSelectionParticipantViewModel,
  TeamSelectionRowStatus,
} from '@/features/events/team-selection/types/teamSelection'
import { parseEventId } from '@/features/events/utils/parseEventId'
import { Alert, Text } from '@/shared/components'

/**
 * Routed at /eventos/:id/equipo (W-05 "Seleccionar equipo"). Entirely
 * presentation-only, exactly like `EventDetailPage`:
 * `findTeamSelectionParticipants` is development/demo data, never a real
 * `GET /eventos/{id_evento}/participaciones` response. No Axios, no
 * TanStack Query, no network request of any kind.
 *
 * `handleSelectParticipant` models only the documented forward transition
 * (`aparto → seleccionado`) entirely in local component state — never
 * persisted, never sent anywhere. The `await Promise.resolve()` yield is
 * a real microtask boundary (so `selecting` is an actual, observable,
 * testable intermediate render), not a `setTimeout`-simulated network
 * delay. The `rowStatuses[...] === 'selecting'` guard plus the
 * candidate row's native `disabled` button together prevent a repeated
 * selection while one is already in flight.
 */
export function TeamSelectionPage() {
  const { id } = useParams<{ id: string }>()
  const idEvento = parseEventId(id)
  const evento = idEvento === null ? null : findEventDetailFixture(idEvento)

  const [participants, setParticipants] = useState<TeamSelectionParticipantViewModel[]>(
    () =>
      idEvento === null
        ? []
        : findTeamSelectionParticipants(idEvento).map((participant) => ({
            ...participant,
          })),
  )
  const [rowStatuses, setRowStatuses] = useState<Record<number, TeamSelectionRowStatus>>(
    {},
  )

  async function handleSelectParticipant(request: SelectParticipantRequest) {
    if (rowStatuses[request.idParticipacion] === 'selecting') {
      return
    }

    setRowStatuses((previous) => ({
      ...previous,
      [request.idParticipacion]: 'selecting',
    }))

    await Promise.resolve()

    setParticipants((previous) =>
      previous.map((participant) =>
        participant.idParticipacion === request.idParticipacion
          ? { ...participant, estado: request.estado }
          : participant,
      ),
    )
    setRowStatuses((previous) => ({ ...previous, [request.idParticipacion]: 'selected' }))
  }

  return (
    <div className="flex flex-col gap-6">
      <Alert
        tone="info"
        icon={<IconInfoCircle aria-hidden="true" />}
        title="Datos de desarrollo"
      >
        <Text size="sm">
          El equipo mostrado usa datos de desarrollo (
          <code>features/events/team-selection/fixtures</code>), no información real.
          Seleccionar a un candidato no envía ninguna solicitud ni se conserva al recargar
          la página.
        </Text>
      </Alert>

      <TeamSelectionContent
        evento={evento}
        isLoading={false}
        participants={participants}
        rowStatuses={rowStatuses}
        onSelectParticipant={(request) => {
          void handleSelectParticipant(request)
        }}
      />
    </div>
  )
}
